import { describe, it, expect, beforeEach, vi } from 'vitest';
import { historyStorage } from '../services/historyStorage';
import type { AnalyzeResponse } from '../types/analysis';

const mockResponse: AnalyzeResponse = {
  results: [
    {
      email: 'user@example.com',
      normalized_email: 'user@example.com',
      syntax_valid: true,
      domain_status: 'resolved',
      mx_status: 'present',
      classification: 'likely_to_be_delivered',
      reason: 'Valid RFC syntax and active MX routing.',
      domain: 'example.com',
      diagnostics: {
        has_mx: true,
        is_disposable: false,
        mx_records: ['10 mail.example.com'],
        has_fallback_a: false,
        response_time_ms: 45
      }
    },
    {
      email: 'bad@nonexistent.domain',
      normalized_email: 'bad@nonexistent.domain',
      syntax_valid: true,
      domain_status: 'nonexistent',
      mx_status: 'none',
      classification: 'likely_to_bounce',
      reason: 'Domain does not exist.',
      domain: 'nonexistent.domain',
      diagnostics: {
        has_mx: false,
        is_disposable: false,
        mx_records: [],
        has_fallback_a: false,
        response_time_ms: 30
      }
    }
  ],
  summary: {
    total: 2,
    total_emails: 2,
    likely_to_be_delivered: 1,
    likely_to_bounce: 1,
    unknown: 0,
    deliverability_percentage: 50.0,
    duration_ms: 75
  }
};

describe('History Storage Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves and loads a valid analysis batch', () => {
    const saved = historyStorage.saveBatch(mockResponse, 'Batch A');
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Batch A');
    expect(saved.summary.total_emails).toBe(2);

    const history = historyStorage.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(saved.id);
    expect(history[0].name).toBe('Batch A');
  });

  it('generates a readable default batch name when name is omitted', () => {
    const saved = historyStorage.saveBatch(mockResponse);
    expect(saved.name).toMatch(/^Batch \d{4}-\d{2}-\d{2}/);
  });

  it('renames an existing batch', () => {
    const saved = historyStorage.saveBatch(mockResponse, 'Old Name');
    const updated = historyStorage.renameBatch(saved.id, 'New Name');
    expect(updated.name).toBe('New Name');

    const loaded = historyStorage.getBatchById(saved.id);
    expect(loaded?.name).toBe('New Name');
  });

  it('throws error when renaming nonexistent batch or giving empty name', () => {
    expect(() => historyStorage.renameBatch('non-existent', 'Name')).toThrow('not found');
    const saved = historyStorage.saveBatch(mockResponse);
    expect(() => historyStorage.renameBatch(saved.id, '   ')).toThrow('cannot be empty');
  });

  it('deletes an individual batch', () => {
    const batch1 = historyStorage.saveBatch(mockResponse, 'Batch 1');
    const batch2 = historyStorage.saveBatch(mockResponse, 'Batch 2');

    expect(historyStorage.getHistory()).toHaveLength(2);

    const success = historyStorage.deleteBatch(batch1.id);
    expect(success).toBe(true);

    const history = historyStorage.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(batch2.id);
  });

  it('clears all history batches after confirmation', () => {
    historyStorage.saveBatch(mockResponse, 'Batch 1');
    historyStorage.saveBatch(mockResponse, 'Batch 2');
    expect(historyStorage.getHistory()).toHaveLength(2);

    historyStorage.clearAllHistory();
    expect(historyStorage.getHistory()).toHaveLength(0);
  });

  it('handles invalid stored JSON gracefully without crashing', () => {
    localStorage.setItem('mailscope_history_v1', 'not valid json {{{');
    const history = historyStorage.getHistory();
    expect(history).toEqual([]);
  });

  it('filters out malformed or missing fields in stored records', () => {
    const corruptedList = [
      { id: 'valid-1', name: 'Valid Batch', timestamp: 123456789, results: [], summary: { total_emails: 0, likely_to_be_delivered: 0, likely_to_bounce: 0, unknown: 0, deliverability_percentage: 0 } },
      { id: 'corrupt-1' }, // Missing results, summary, timestamp
      null,
      'just a string'
    ];
    localStorage.setItem('mailscope_history_v1', JSON.stringify(corruptedList));

    const history = historyStorage.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('valid-1');
  });

  it('handles localStorage unavailable gracefully', () => {
    const originalGetItem = localStorage.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });

    expect(() => historyStorage.getHistory()).not.toThrow();
    expect(historyStorage.getHistory()).toEqual([]);

    Storage.prototype.getItem = originalGetItem;
  });

  it('handles quota failure with clear user-facing error and never silently erases', () => {
    const originalSetItem = localStorage.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      throw err;
    });

    expect(() => historyStorage.saveBatch(mockResponse, 'Quota Test')).toThrow(
      'Storage quota exceeded'
    );

    Storage.prototype.setItem = originalSetItem;
  });

  it('returns empty array when history is empty', () => {
    expect(historyStorage.getHistory()).toEqual([]);
  });
});
