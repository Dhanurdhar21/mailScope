import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell, generateCsvContent } from '../services/csvExport';
import type { EmailAnalysisResult } from '../types/analysis';

describe('csvExport service', () => {
  describe('sanitizeCsvCell & CWE-1236 mitigation', () => {
    it('wraps normal text in quotes', () => {
      expect(sanitizeCsvCell('hello world')).toBe('"hello world"');
    });

    it('escapes inner double quotes', () => {
      expect(sanitizeCsvCell('he said "hello"')).toBe('"he said ""hello"""');
    });

    it('handles null and undefined safely', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it('neutralizes standard formula injection prefixes (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=cmd|"/C calc"!A0')).toBe(`"'=cmd|""/C calc""!A0"`);
      expect(sanitizeCsvCell('+12345')).toBe(`"'+12345"`);
      expect(sanitizeCsvCell('-SUM(A1:A5)')).toBe(`"'-SUM(A1:A5)"`);
      expect(sanitizeCsvCell('@calc')).toBe(`"'@calc"`);
    });

    it('neutralizes pipe (|) and percent (%) operators', () => {
      expect(sanitizeCsvCell('|cmd.exe')).toBe(`"'|cmd.exe"`);
      expect(sanitizeCsvCell('%username%')).toBe(`"'%username%"`);
    });

    it('neutralizes formula injection with leading whitespace or tabs', () => {
      // Space-prefixed formula bypass
      expect(sanitizeCsvCell('   =2+2')).toBe(`"'   =2+2"`);
      // Tab-prefixed formula bypass
      expect(sanitizeCsvCell('\t=cmd')).toBe(`"'\t=cmd"`);
      // CRLF prefixed formula bypass
      expect(sanitizeCsvCell('\r=calc')).toBe(`"'\r=calc"`);
    });
  });

  describe('generateCsvContent', () => {
    it('generates well-formatted CSV with headers and rows', () => {
      const mockResults: EmailAnalysisResult[] = [
        {
          email: 'valid@example.com',
          normalized_email: 'valid@example.com',
          syntax_valid: true,
          domain: 'example.com',
          domain_status: 'resolved',
          mx_status: 'present',
          classification: 'likely_to_be_delivered',
          reason: 'Domain has active MX records.',
          diagnostics: {
            has_mx: true,
            has_fallback_a: false,
            mx_records: ['mx.example.com (priority: 10)'],
            is_disposable: false,
            response_time_ms: 12.5
          }
        },
        {
          email: 'bounce@bad.org',
          normalized_email: 'bounce@bad.org',
          syntax_valid: true,
          domain: 'bad.org',
          domain_status: 'nonexistent',
          mx_status: 'none',
          classification: 'likely_to_bounce',
          reason: 'Domain does not exist.',
          diagnostics: {
            has_mx: false,
            has_fallback_a: false,
            mx_records: [],
            is_disposable: false,
            response_time_ms: 8.0
          }
        }
      ];

      const csv = generateCsvContent(mockResults);
      const lines = csv.split('\r\n');

      expect(lines.length).toBe(3); // 1 header line + 2 data rows
      expect(lines[0]).toContain('"Email Address"');
      expect(lines[0]).toContain('"Classification"');
      expect(lines[1]).toContain('"valid@example.com"');
      expect(lines[1]).toContain('"LIKELY TO BE DELIVERED"');
      expect(lines[1]).toContain('"VALID"');
      expect(lines[2]).toContain('"bounce@bad.org"');
      expect(lines[2]).toContain('"LIKELY TO BOUNCE"');
    });

    it('handles empty results array', () => {
      const csv = generateCsvContent([]);
      const lines = csv.split('\r\n');
      expect(lines.length).toBe(1); // Header only
      expect(lines[0]).toContain('"Email Address"');
    });
  });
});
