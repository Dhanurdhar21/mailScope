import { describe, it, expect } from 'vitest';
import { parseEmailInput } from '../services/emailParser';

describe('emailParser service', () => {
  it('parses single email address', () => {
    const res = parseEmailInput('user@example.com');
    expect(res.allEntries).toEqual(['user@example.com']);
    expect(res.uniqueEmails).toEqual(['user@example.com']);
    expect(res.allEntries.length).toBe(1);
    expect(res.uniqueEmails.length).toBe(1);
    expect(res.exceedsLimit).toBe(false);
  });

  it('handles multiple separators: newlines, commas, semicolons, tabs, and spaces', () => {
    const input = "first@a.com\nsecond@b.com,third@c.com;fourth@d.com\tfifth@e.com sixth@f.com";
    const res = parseEmailInput(input);
    expect(res.uniqueEmails).toEqual([
      'first@a.com',
      'second@b.com',
      'third@c.com',
      'fourth@d.com',
      'fifth@e.com',
      'sixth@f.com'
    ]);
    expect(res.allEntries.length).toBe(6);
  });

  it('deduplicates case-insensitively while preserving original casing', () => {
    const input = "User@Example.com, user@example.com, USER@EXAMPLE.COM, other@test.com";
    const res = parseEmailInput(input);
    expect(res.allEntries.length).toBe(4);
    expect(res.uniqueEmails.length).toBe(2);
    expect(res.duplicateCount).toBe(2);
    expect(res.uniqueEmails).toEqual(['User@Example.com', 'other@test.com']);
  });

  it('filters out empty tokens and whitespace-only lines', () => {
    const input = "\n  \n  contact@company.com  \n\n   \n";
    const res = parseEmailInput(input);
    expect(res.uniqueEmails).toEqual(['contact@company.com']);
    expect(res.allEntries.length).toBe(1);
  });

  it('caps batches at exactly 200 addresses and sets exceedsLimit=true', () => {
    const addresses = Array.from({ length: 250 }, (_, i) => `user${i}@example.com`);
    const input = addresses.join('\n');
    const res = parseEmailInput(input);

    expect(res.allEntries.length).toBe(250);
    expect(res.uniqueEmails.length).toBe(200);
    expect(res.exceedsLimit).toBe(true);
    expect(res.uniqueEmails[199]).toBe('user199@example.com');
  });

  it('handles empty or blank input gracefully', () => {
    const resEmpty = parseEmailInput('');
    expect(resEmpty.allEntries).toEqual([]);
    expect(resEmpty.uniqueEmails).toEqual([]);
    expect(resEmpty.duplicateCount).toBe(0);
    expect(resEmpty.exceedsLimit).toBe(false);

    const resWhitespace = parseEmailInput('    \t   \n  ');
    expect(resWhitespace.uniqueEmails).toEqual([]);
    expect(resWhitespace.allEntries.length).toBe(0);
  });
});
