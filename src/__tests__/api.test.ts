import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkBackendHealth, analyzeEmailsApi } from '../services/api';

describe('api service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('checkBackendHealth', () => {
    it('returns healthy status when backend responds 200 ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ok',
          service: 'mailscope-analyzer',
          version: '1.0.0',
          timestamp: 123456789,
          dns_resolver: 'active'
        })
      } as Response);

      const health = await checkBackendHealth();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('mailscope-analyzer');
      expect(health.version).toBe('1.0.0');
      expect(health.dns_resolver).toBe('active');
    });

    it('throws ApiError when backend fetch fails', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(checkBackendHealth()).rejects.toThrow('Cannot connect to MailScope API');
    });
  });

  describe('analyzeEmailsApi', () => {
    it('sends POST request and parses response successfully', async () => {
      const mockApiResponse = {
        results: [
          {
            email: 'test@example.com',
            normalized_email: 'test@example.com',
            syntax_valid: true,
            domain: 'example.com',
            domain_status: 'resolved',
            mx_status: 'present',
            classification: 'likely_to_be_delivered',
            reason: 'OK',
            diagnostics: {
              has_mx: true,
              has_fallback_a: false,
              mx_records: ['mx.example.com'],
              is_disposable: false,
              response_time_ms: 10.0
            }
          }
        ],
        summary: {
          total: 1,
          likely_to_be_delivered: 1,
          likely_to_bounce: 0,
          unknown: 0,
          duration_ms: 25.5
        }
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      } as Response);

      const res = await analyzeEmailsApi(['test@example.com']);
      expect(res.results.length).toBe(1);
      expect(res.summary.total).toBe(1);
      expect(res.results[0].classification).toBe('likely_to_be_delivered');
    });

    it('throws error message when API responds with error status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ detail: 'Batch exceeds maximum permitted size of 200.' })
      } as Response);

      await expect(analyzeEmailsApi(['bad@test.com'])).rejects.toThrow(
        'Batch exceeds maximum permitted size of 200.'
      );
    });

    it('handles payload too large 413 error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
        json: async () => ({ detail: 'Payload Too Large: Request body exceeds limit.' })
      } as Response);

      await expect(analyzeEmailsApi(['bad@test.com'])).rejects.toThrow(
        'Payload Too Large'
      );
    });

    // Problem 3.B: API consistency invariants with 40-candidate fixture
    it('maintains exact 1:1 mapping and summary invariants for 40 candidates', async () => {
      const candidates = Array.from({ length: 39 }, (_, i) => `user${i + 1}@example.com`);
      candidates.push('user name@example.com'); // malformed line with internal space

      const mockResults = candidates.map((email, idx) => ({
        email,
        normalized_email: email.trim().toLowerCase(),
        syntax_valid: email !== 'user name@example.com',
        domain: email === 'user name@example.com' ? '' : 'example.com',
        domain_status: email === 'user name@example.com' ? 'not_checked' : 'resolved',
        mx_status: email === 'user name@example.com' ? 'not_checked' : 'present',
        classification:
          email === 'user name@example.com'
            ? 'likely_to_bounce'
            : idx < 20
              ? 'likely_to_be_delivered'
              : 'likely_to_bounce',
        reason: email === 'user name@example.com' ? 'Syntax validation failed: Address contains unquoted whitespace characters.' : 'Valid routing',
        diagnostics: {
          has_mx: email !== 'user name@example.com',
          has_fallback_a: false,
          mx_records: email !== 'user name@example.com' ? ['mx.example.com'] : [],
          is_disposable: false,
          syntax_error: email === 'user name@example.com' ? 'Address contains unquoted whitespace characters.' : null,
          response_time_ms: 15.0
        }
      }));

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: mockResults,
          summary: {
            total: 40,
            likely_to_be_delivered: 20,
            likely_to_bounce: 20,
            unknown: 0,
            duration_ms: 120.0
          }
        })
      } as Response);

      const res = await analyzeEmailsApi(candidates);

      // Invariants
      expect(res.results.length).toBe(40);
      expect(res.summary.total).toBe(40);
      expect(res.summary.total).toBe(res.results.length);
      expect(
        res.summary.likely_to_be_delivered +
        res.summary.likely_to_bounce +
        res.summary.unknown
      ).toBe(res.summary.total);

      // Verify malformed line preserved and classified as syntactically invalid
      const malformedResult = res.results.find((r) => r.email === 'user name@example.com');
      expect(malformedResult).toBeDefined();
      expect(malformedResult?.syntax_valid).toBe(false);
      expect(malformedResult?.classification).toBe('likely_to_bounce');
      expect(malformedResult?.reason).toContain('Syntax validation failed');
    });
  });
});
