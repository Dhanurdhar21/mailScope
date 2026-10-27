/**
 * CSV Export Service for MailScope Results
 * Handles RFC 4180 CSV generation with spreadsheet formula injection protection.
 */

import type { EmailAnalysisResult } from '../types/analysis';

/**
 * Escapes field values according to RFC 4180 standards and prevents CSV/Spreadsheet
 * Formula Injection (CWE-1236) by neutralizing formula-leading characters, including
 * variants with leading whitespace, tabs, or dangerous operators.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Check for CSV formula injection characters: =, +, -, @, |, %, tab (\t), CR (\r)
  // Even if preceded by whitespace, spreadsheet applications like Excel strip leading spaces
  // and execute formulas.
  const dangerousChars = ['=', '+', '-', '@', '|', '%', '\t', '\r'];
  const trimmed = str.trimStart();
  if (trimmed.length > 0 && dangerousChars.some((char) => trimmed.startsWith(char))) {
    // Prefix with single quote to force spreadsheet programs to treat as literal text
    str = `'${str}`;
  }

  // Escape inner double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts email analysis results into a clean, downloadable CSV string.
 */
export function generateCsvContent(results: EmailAnalysisResult[]): string {
  const headers = [
    'Email Address',
    'Classification',
    'Syntax Valid',
    'Domain',
    'Domain DNS Status',
    'Mail Routing (MX)',
    'MX Records Count',
    'MX Server Details',
    'Reason / Explanation',
    'Response Time (ms)'
  ];

  const rows = results.map((item) => {
    const mxCount = item.diagnostics?.mx_records.length ?? 0;
    const mxServers = item.diagnostics?.mx_records.join('; ') ?? 'None';
    const respTime = item.diagnostics?.response_time_ms ? `${item.diagnostics.response_time_ms}ms` : 'N/A';

    return [
      sanitizeCsvCell(item.email),
      sanitizeCsvCell(item.classification.replace(/_/g, ' ').toUpperCase()),
      sanitizeCsvCell(item.syntax_valid ? 'VALID' : 'INVALID'),
      sanitizeCsvCell(item.domain || 'N/A'),
      sanitizeCsvCell(item.domain_status),
      sanitizeCsvCell(item.mx_status),
      sanitizeCsvCell(mxCount),
      sanitizeCsvCell(mxServers),
      sanitizeCsvCell(item.reason),
      sanitizeCsvCell(respTime)
    ].join(',');
  });

  return [headers.map(sanitizeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Triggers browser file download with the CSV data.
 */
export function downloadCsvFile(results: EmailAnalysisResult[], filenamePrefix: string = 'mailscope-analysis'): boolean {
  if (!results || results.length === 0) {
    return false;
  }

  const csvData = generateCsvContent(results);
  const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' }); // \uFEFF BOM for Excel UTF-8 support
  const url = URL.createObjectURL(blob);

  const safePrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_') || 'mailscope-analysis';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${safePrefix}-${timestamp}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  return true;
}
