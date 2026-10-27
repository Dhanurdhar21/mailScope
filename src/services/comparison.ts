/**
 * Batch Analysis Comparison Service
 * Compares two completed email deliverability analysis batches.
 * Detects structural changes, MX priority updates, additions, removals,
 * and truthfully distinguishes DNS timeouts from infrastructure configuration changes.
 */

import type { StoredAnalysisBatch, ComparisonReport, ComparisonRecordDiff, ChangeType } from '../types/history';
import { sanitizeCsvCell } from './csvExport';

/**
 * Normalizes email address for consistent dictionary matching (lowercased, trimmed).
 */
export function normalizeEmailForComparison(email: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Helper to parse MX record string into priority and host.
 */
function parseMxRecord(rec: string): { priority?: number; host: string } {
  const trimmed = rec.trim();
  const match = trimmed.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return { priority: parseInt(match[1], 10), host: match[2].trim().toLowerCase() };
  }
  return { host: trimmed.toLowerCase() };
}

/**
 * Compares two stored analysis batches.
 * @param batchA Baseline / Previous batch
 * @param batchB Current / Comparison batch
 */
export function compareBatches(batchA: StoredAnalysisBatch, batchB: StoredAnalysisBatch): ComparisonReport {
  if (batchA.id === batchB.id) {
    throw new Error('Cannot compare a batch with itself. Please select two distinct analysis batches.');
  }

  const mapA = new Map<string, typeof batchA.results[0]>();
  for (const item of batchA.results) {
    mapA.set(normalizeEmailForComparison(item.email), item);
  }

  const mapB = new Map<string, typeof batchB.results[0]>();
  for (const item of batchB.results) {
    mapB.set(normalizeEmailForComparison(item.email), item);
  }

  // Collect all unique normalized keys
  const allKeys = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const diffs: ComparisonRecordDiff[] = [];

  let changedCount = 0;
  let unchangedCount = 0;
  let addedCount = 0;
  let removedCount = 0;

  for (const key of allKeys) {
    const itemA = mapA.get(key);
    const itemB = mapB.get(key);

    if (itemA && !itemB) {
      // Address was in previous batch, but not in current batch
      removedCount++;
      diffs.push({
        email: itemA.email,
        domain: itemA.domain,
        status: 'removed',
        changeType: 'removed',
        changeTypes: ['removed'],
        isDnsTimeoutChange: false,
        baseline: itemA,
        current: undefined,
        resultA: itemA,
        resultB: undefined,
        classificationChanged: false,
        domainStatusChanged: false,
        mxStatusChanged: false,
        mxRecordsChanged: false,
        notes: ['Address present in previous batch but absent in current batch']
      });
      continue;
    }

    if (!itemA && itemB) {
      // Address was added in current batch
      addedCount++;
      diffs.push({
        email: itemB.email,
        domain: itemB.domain,
        status: 'added',
        changeType: 'added',
        changeTypes: ['added'],
        isDnsTimeoutChange: false,
        baseline: undefined,
        current: itemB,
        resultA: undefined,
        resultB: itemB,
        classificationChanged: false,
        domainStatusChanged: false,
        mxStatusChanged: false,
        mxRecordsChanged: false,
        notes: ['New address present in current batch']
      });
      continue;
    }

    if (itemA && itemB) {
      const changeTypes: ChangeType[] = [];
      const notes: string[] = [];
      let isTimeout = false;

      let classificationChanged = false;
      let domainStatusChanged = false;
      let mxStatusChanged = false;
      let mxRecordsChanged = false;

      // Check classification change
      if (itemA.classification !== itemB.classification) {
        classificationChanged = true;
        changeTypes.push('classification_changed');
        notes.push(`Classification changed from ${itemA.classification} to ${itemB.classification}`);
      }

      // Check domain status change
      if (itemA.domain_status !== itemB.domain_status) {
        domainStatusChanged = true;
        changeTypes.push('domain_status_changed');
        notes.push(`Domain resolution changed: ${itemA.domain_status} -> ${itemB.domain_status}`);
      }

      // Check MX status change
      if (itemA.mx_status !== itemB.mx_status) {
        mxStatusChanged = true;
        changeTypes.push('mx_status_changed');
        notes.push(`Mail routing status changed: ${itemA.mx_status} -> ${itemB.mx_status}`);
      }

      // Check fallback routing change
      const fallbackA = itemA.diagnostics?.has_fallback_a ?? false;
      const fallbackB = itemB.diagnostics?.has_fallback_a ?? false;
      if (fallbackA !== fallbackB) {
        notes.push(`Fallback A record routing: ${fallbackA ? 'Active' : 'None'} -> ${fallbackB ? 'Active' : 'None'}`);
      }

      // Check MX records and priority changes
      const parsedMxA = (itemA.diagnostics?.mx_records || []).map(parseMxRecord);
      const parsedMxB = (itemB.diagnostics?.mx_records || []).map(parseMxRecord);

      const hostsA = new Set(parsedMxA.map((r) => r.host));
      const hostsB = new Set(parsedMxB.map((r) => r.host));

      const addedHosts = parsedMxB.filter((r) => !hostsA.has(r.host));
      const removedHosts = parsedMxA.filter((r) => !hostsB.has(r.host));

      if (addedHosts.length > 0 || removedHosts.length > 0) {
        mxRecordsChanged = true;
        changeTypes.push('mx_records_changed');
        if (addedHosts.length > 0) {
          notes.push(`Added MX: ${addedHosts.map((r) => r.host).join(', ')}`);
        }
        if (removedHosts.length > 0) {
          notes.push(`Removed MX: ${removedHosts.map((r) => r.host).join(', ')}`);
        }
      }

      // Check priority shift for common hosts
      for (const recA of parsedMxA) {
        const matchingB = parsedMxB.find((r) => r.host === recA.host);
        if (matchingB && recA.priority !== undefined && matchingB.priority !== undefined && recA.priority !== matchingB.priority) {
          mxRecordsChanged = true;
          if (!changeTypes.includes('mx_records_changed')) {
            changeTypes.push('mx_records_changed');
          }
          notes.push(`Priority changed for ${recA.host} from ${recA.priority} to ${matchingB.priority}`);
        }
      }

      // Check for DNS Timeout ambiguity (truthful classification)
      if (
        itemA.domain_status === 'timeout' ||
        itemB.domain_status === 'timeout' ||
        itemA.mx_status === 'timeout' ||
        itemB.mx_status === 'timeout'
      ) {
        isTimeout = true;
        const whichBatch =
          itemA.domain_status === 'timeout' && itemB.domain_status === 'timeout'
            ? 'Batches A and B'
            : itemB.domain_status === 'timeout' || itemB.mx_status === 'timeout'
            ? 'Batch B'
            : 'Batch A';
        notes.push(
          `DNS Timeout in ${whichBatch} — DNS lookup timed out during evaluation. This represents a temporary network failure, not proof of DNS configuration change.`
        );
      }

      if (changeTypes.length > 0) {
        changedCount++;
        diffs.push({
          email: itemB.email, // preserve casing of current batch
          domain: itemB.domain,
          status: 'changed',
          changeType: 'changed',
          changeTypes,
          isDnsTimeoutChange: isTimeout,
          baseline: itemA,
          current: itemB,
          resultA: itemA,
          resultB: itemB,
          classificationChanged,
          domainStatusChanged,
          mxStatusChanged,
          mxRecordsChanged,
          notes
        });
      } else {
        unchangedCount++;
        diffs.push({
          email: itemB.email,
          domain: itemB.domain,
          status: 'unchanged',
          changeType: 'unchanged',
          changeTypes: ['unchanged'],
          isDnsTimeoutChange: false,
          baseline: itemA,
          current: itemB,
          resultA: itemA,
          resultB: itemB,
          classificationChanged: false,
          domainStatusChanged: false,
          mxStatusChanged: false,
          mxRecordsChanged: false,
          notes: ['No deliverability or DNS configuration changes detected']
        });
      }
    }
  }

  // Sort diffs: changed first, then added, then removed, then unchanged
  const statusOrder: Record<string, number> = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  diffs.sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));

  const totalA = batchA.summary.total ?? (batchA.summary as any).total_emails ?? batchA.results.length;
  const totalB = batchB.summary.total ?? (batchB.summary as any).total_emails ?? batchB.results.length;
  const delivA = batchA.summary.likely_to_be_delivered ?? 0;
  const delivB = batchB.summary.likely_to_be_delivered ?? 0;
  const pctA = totalA > 0 ? (delivA / totalA) * 100 : 0;
  const pctB = totalB > 0 ? (delivB / totalB) * 100 : 0;

  const counts = {
    changed: changedCount,
    unchanged: unchangedCount,
    added: addedCount,
    removed: removedCount
  };

  const deltas = {
    total_emails: totalB - totalA,
    deliverability_percentage: Number((pctB - pctA).toFixed(1)),
    likely_to_be_delivered: delivB - delivA,
    likely_to_bounce: (batchB.summary.likely_to_bounce ?? 0) - (batchA.summary.likely_to_bounce ?? 0),
    unknown: (batchB.summary.unknown ?? 0) - (batchA.summary.unknown ?? 0)
  };

  return {
    batchA: {
      id: batchA.id,
      name: batchA.name,
      timestamp: batchA.timestamp,
      summary: batchA.summary
    },
    batchB: {
      id: batchB.id,
      name: batchB.name,
      timestamp: batchB.timestamp,
      summary: batchB.summary
    },
    comparedAt: Date.now(),
    totalUniqueEmails: allKeys.size,
    counts,
    metrics: {
      changedCount: counts.changed,
      unchangedCount: counts.unchanged,
      addedCount: counts.added,
      removedCount: counts.removed
    },
    classificationDeltas: {
      likely_to_be_delivered: deltas.likely_to_be_delivered,
      likely_to_bounce: deltas.likely_to_bounce,
      unknown: deltas.unknown
    },
    deltas,
    diffs,
    records: diffs
  };
}

/**
 * Generates an RFC 4180 CSV export of a batch comparison report,
 * safely protected against spreadsheet formula injection (CWE-1236).
 */
export function generateComparisonCsv(report: ComparisonReport): string {
  const headers = [
    'Email Address',
    'Domain',
    'Comparison Status',
    'Baseline Classification',
    'Current Classification',
    'Baseline MX Status',
    'Current MX Status',
    'Changes & Diagnostic Notes',
    'Is Timeout Failure'
  ];

  const rows = report.diffs.map((diff) => {
    const baseClass = diff.baseline ? diff.baseline.classification.toUpperCase() : 'N/A (Added)';
    const currClass = diff.current ? diff.current.classification.toUpperCase() : 'N/A (Removed)';
    const baseMx = diff.baseline ? diff.baseline.mx_status : 'N/A';
    const currMx = diff.current ? diff.current.mx_status : 'N/A';

    return [
      sanitizeCsvCell(diff.email),
      sanitizeCsvCell(diff.domain),
      sanitizeCsvCell(diff.status.toUpperCase()),
      sanitizeCsvCell(baseClass),
      sanitizeCsvCell(currClass),
      sanitizeCsvCell(baseMx),
      sanitizeCsvCell(currMx),
      sanitizeCsvCell(diff.notes.join('; ')),
      sanitizeCsvCell(diff.isDnsTimeoutChange ? 'YES' : 'NO')
    ].join(',');
  });

  return [headers.map(sanitizeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Initiates browser file download for a comparison CSV report.
 */
export function downloadComparisonCsvFile(report: ComparisonReport, filenamePrefix = 'mailscope-comparison'): boolean {
  try {
    const csvContent = generateComparisonCsv(report);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filenamePrefix}-${timestamp}.csv`);
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to trigger CSV download:', err);
    return false;
  }
}
