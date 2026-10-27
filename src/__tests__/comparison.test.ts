import { describe, it, expect } from 'vitest';
import { compareBatches, generateComparisonCsv } from '../services/comparison';
import type { StoredAnalysisBatch } from '../types/history';

function makeMockBatch(
  id: string,
  name: string,
  timestamp: number,
  results: any[]
): StoredAnalysisBatch {
  const delivered = results.filter((r) => r.classification === 'likely_to_be_delivered').length;
  const bounce = results.filter((r) => r.classification === 'likely_to_bounce').length;
  const unknown = results.filter((r) => r.classification === 'unknown').length;
  return {
    id,
    name,
    timestamp,
    duration_ms: 100,
    results,
    summary: {
      total: results.length,
      total_emails: results.length,
      likely_to_be_delivered: delivered,
      likely_to_bounce: bounce,
      unknown,
      duration_ms: 100,
      deliverability_percentage: results.length > 0 ? (delivered / results.length) * 100 : 0
    }
  };
}

describe('Batch Comparison Engine', () => {
  it('throws error when comparing a batch with itself', () => {
    const batch = makeMockBatch('b1', 'Batch 1', 1000, []);
    expect(() => compareBatches(batch, batch)).toThrow('Cannot compare a batch with itself');
  });

  it('detects changed classification', () => {
    const batchA = makeMockBatch('b1', 'Batch 1', 1000, [
      {
        email: 'user@domain.com',
        syntax_valid: true,
        domain_status: 'resolved',
        mx_status: 'present',
        classification: 'likely_to_be_delivered',
        reason: 'Active MX',
        domain: 'domain.com',
        diagnostics: { mx_records: ['10 mx.domain.com'] }
      }
    ]);

    const batchB = makeMockBatch('b2', 'Batch 2', 2000, [
      {
        email: 'user@domain.com',
        syntax_valid: true,
        domain_status: 'nonexistent',
        mx_status: 'none',
        classification: 'likely_to_bounce',
        reason: 'Domain NXDOMAIN',
        domain: 'domain.com',
        diagnostics: { mx_records: [] }
      }
    ]);

    const report = compareBatches(batchA, batchB);
    expect(report.metrics.changedCount).toBe(1);
    expect(report.records[0].classificationChanged).toBe(true);
    expect(report.records[0].resultA?.classification).toBe('likely_to_be_delivered');
    expect(report.records[0].resultB?.classification).toBe('likely_to_bounce');
  });

  it('detects added and removed MX records and priority changes', () => {
    const batchA = makeMockBatch('b1', 'Batch 1', 1000, [
      {
        email: 'test@example.com',
        syntax_valid: true,
        domain_status: 'resolved',
        mx_status: 'present',
        classification: 'likely_to_be_delivered',
        reason: 'Active MX',
        domain: 'example.com',
        diagnostics: { mx_records: ['10 mail1.example.com', '20 mail2.example.com'] }
      }
    ]);

    const batchB = makeMockBatch('b2', 'Batch 2', 2000, [
      {
        email: 'test@example.com',
        syntax_valid: true,
        domain_status: 'resolved',
        mx_status: 'present',
        classification: 'likely_to_be_delivered',
        reason: 'Active MX',
        domain: 'example.com',
        diagnostics: { mx_records: ['5 mail1.example.com', '30 mail3.example.com'] }
      }
    ]);

    const report = compareBatches(batchA, batchB);
    const rec = report.records[0];
    expect(rec.mxRecordsChanged).toBe(true);
    expect(rec.notes.some((n) => n.includes('Added MX: mail3.example.com'))).toBe(true);
    expect(rec.notes.some((n) => n.includes('Removed MX: mail2.example.com'))).toBe(true);
    expect(rec.notes.some((n) => n.includes('Priority changed'))).toBe(true);
  });

  it('identifies addresses present only in previous or only in current batch', () => {
    const batchA = makeMockBatch('b1', 'Batch 1', 1000, [
      {
        email: 'only-in-a@domain.com',
        syntax_valid: true,
        domain_status: 'resolved',
        mx_status: 'present',
        classification: 'likely_to_be_delivered',
        reason: 'Active MX',
        domain: 'domain.com'
      }
    ]);

    const batchB = makeMockBatch('b2', 'Batch 2', 2000, [
      {
        email: 'only-in-b@domain.com',
        syntax_valid: true,
        domain_status: 'resolved',
        mx_status: 'present',
        classification: 'likely_to_be_delivered',
        reason: 'Active MX',
        domain: 'domain.com'
      }
    ]);

    const report = compareBatches(batchA, batchB);
    expect(report.metrics.removedCount).toBe(1);
    expect(report.metrics.addedCount).toBe(1);

    const recordA = report.records.find((r) => r.email === 'only-in-a@domain.com');
    expect(recordA?.changeType).toBe('removed');

    const recordB = report.records.find((r) => r.email === 'only-in-b@domain.com');
    expect(recordB?.changeType).toBe('added');
  });

  it('identifies completely unchanged addresses', () => {
    const record = {
      email: 'same@domain.com',
      syntax_valid: true,
      domain_status: 'resolved' as const,
      mx_status: 'present' as const,
      classification: 'likely_to_be_delivered' as const,
      reason: 'Active MX',
      domain: 'domain.com',
      diagnostics: { mx_records: ['10 mx.domain.com'], has_fallback_a: false }
    };

    const batchA = makeMockBatch('b1', 'Batch 1', 1000, [record]);
    const batchB = makeMockBatch('b2', 'Batch 2', 2000, [record]);

    const report = compareBatches(batchA, batchB);
    expect(report.metrics.unchangedCount).toBe(1);
    expect(report.records[0].changeType).toBe('unchanged');
  });

  it('distinguishes DNS timeout from actual DNS configuration change', () => {
    const batchA = makeMockBatch('b1', 'Batch 1', 1000, [
      {
        email: 'timeout@domain.com',
        syntax_valid: true,
        domain_status: 'resolved',
        mx_status: 'present',
        classification: 'likely_to_be_delivered',
        reason: 'Active MX',
        domain: 'domain.com',
        diagnostics: { mx_records: ['10 mx.domain.com'] }
      }
    ]);

    const batchB = makeMockBatch('b2', 'Batch 2', 2000, [
      {
        email: 'timeout@domain.com',
        syntax_valid: true,
        domain_status: 'timeout',
        mx_status: 'timeout',
        classification: 'unknown',
        reason: 'Nameserver lookup timed out.',
        domain: 'domain.com',
        diagnostics: { mx_records: [] }
      }
    ]);

    const report = compareBatches(batchA, batchB);
    const rec = report.records[0];
    expect(rec.notes.some((n) => n.includes('DNS Timeout in Batch B'))).toBe(true);
    expect(rec.notes.some((n) => n.includes('not proof of DNS configuration change'))).toBe(true);
  });

  it('generates comparison CSV with proper columns and escaping', () => {
    const batchA = makeMockBatch('b1', 'Batch 1', 1000, [
      {
        email: 'user@example.com',
        syntax_valid: true,
        domain_status: 'resolved',
        mx_status: 'present',
        classification: 'likely_to_be_delivered',
        reason: 'Active MX',
        domain: 'example.com'
      }
    ]);
    const batchB = makeMockBatch('b2', 'Batch 2', 2000, [
      {
        email: 'user@example.com',
        syntax_valid: true,
        domain_status: 'resolved',
        mx_status: 'present',
        classification: 'likely_to_be_delivered',
        reason: 'Active MX',
        domain: 'example.com'
      }
    ]);

    const report = compareBatches(batchA, batchB);
    const csv = generateComparisonCsv(report);
    expect(csv).toContain('Email Address');
    expect(csv).toContain('Comparison Status');
    expect(csv).toContain('user@example.com');
    expect(csv).toContain('UNCHANGED');
  });
});
