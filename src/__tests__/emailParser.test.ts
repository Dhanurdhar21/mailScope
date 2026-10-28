import { describe, it, expect } from 'vitest';
import { parseEmailInput, quickFrontendSyntaxCheck } from '../services/emailParser';

describe('emailParser service', () => {
  it('parses single email address', () => {
    const res = parseEmailInput('user@example.com');
    expect(res.allEntries).toEqual(['user@example.com']);
    expect(res.uniqueEmails).toEqual(['user@example.com']);
    expect(res.allEntries.length).toBe(1);
    expect(res.uniqueEmails.length).toBe(1);
    expect(res.exceedsLimit).toBe(false);
  });

  // Problem 3.A: Forty normal lines produce 40 candidates
  it('produces exactly 40 candidates from forty normal lines', () => {
    const lines = Array.from({ length: 40 }, (_, i) => `user${i + 1}@example.com`);
    const input = lines.join('\n');
    const res = parseEmailInput(input);

    expect(res.allEntries.length).toBe(40);
    expect(res.uniqueEmails.length).toBe(40);
    expect(res.duplicateCount).toBe(0);
    expect(res.exceedsLimit).toBe(false);
  });

  // Problem 3.A: An address containing an internal space remains one candidate and is marked syntactically invalid
  it('preserves an address containing internal space as one candidate and flags it as syntactically invalid', () => {
    const input = 'user name@example.com';
    const res = parseEmailInput(input);

    expect(res.allEntries.length).toBe(1);
    expect(res.uniqueEmails.length).toBe(1);
    expect(res.uniqueEmails[0]).toBe('user name@example.com');
    // Early frontend check identifies it as malformed without splitting
    expect(quickFrontendSyntaxCheck(res.uniqueEmails[0])).toBe(false);
  });

  // Problem 3.A: Leading and trailing whitespace is trimmed
  it('trims leading and trailing whitespace from each line', () => {
    const input = '   leading-and-trailing@example.com   \n\t  another@test.org \t ';
    const res = parseEmailInput(input);

    expect(res.allEntries).toEqual(['leading-and-trailing@example.com', 'another@test.org']);
    expect(res.uniqueEmails).toEqual(['leading-and-trailing@example.com', 'another@test.org']);
  });

  // Problem 3.A: Blank lines are ignored
  it('ignores blank lines and whitespace-only lines', () => {
    const input = '\n  \n  contact@company.com  \n\n   \n\t\ninfo@domain.org\n\n';
    const res = parseEmailInput(input);

    expect(res.allEntries).toEqual(['contact@company.com', 'info@domain.org']);
    expect(res.uniqueEmails).toEqual(['contact@company.com', 'info@domain.org']);
    expect(res.allEntries.length).toBe(2);
  });

  // Problem 3.A: CRLF and LF line endings work
  it('handles both Windows CRLF and Unix LF line endings consistently', () => {
    const inputCRLF = 'alpha@example.com\r\nbeta@example.com\r\ngamma@example.com';
    const resCRLF = parseEmailInput(inputCRLF);
    expect(resCRLF.allEntries).toEqual(['alpha@example.com', 'beta@example.com', 'gamma@example.com']);

    const inputMixed = 'alpha@example.com\r\nbeta@example.com\ngamma@example.com\rdelta@example.com';
    const resMixed = parseEmailInput(inputMixed);
    expect(resMixed.allEntries).toEqual([
      'alpha@example.com',
      'beta@example.com',
      'gamma@example.com',
      'delta@example.com'
    ]);
  });

  // Problem 3.A: Duplicate addresses follow the documented policy
  it('deduplicates case-insensitively while preserving original casing', () => {
    const input = 'User@Example.com\nuser@example.com\nUSER@EXAMPLE.COM\nother@test.com';
    const res = parseEmailInput(input);

    expect(res.allEntries.length).toBe(4);
    expect(res.uniqueEmails.length).toBe(2);
    expect(res.duplicateCount).toBe(2);
    expect(res.uniqueEmails).toEqual(['User@Example.com', 'other@test.com']);
    expect(res.duplicateMap['user@example.com']).toBe(3);
  });

  // Problem 3.A: A trailing newline does not create an additional candidate
  it('does not create an additional candidate for a trailing newline', () => {
    const inputWithTrailing = 'first@example.com\nsecond@example.com\n';
    const res = parseEmailInput(inputWithTrailing);

    expect(res.allEntries.length).toBe(2);
    expect(res.uniqueEmails.length).toBe(2);
    expect(res.allEntries).toEqual(['first@example.com', 'second@example.com']);
  });

  // Problem 3.A: Batch-size limits are enforced
  it('enforces batch-size limits and flags exceedsLimit when over 200', () => {
    const exactly200 = Array.from({ length: 200 }, (_, i) => `user${i}@example.com`).join('\n');
    const res200 = parseEmailInput(exactly200);
    expect(res200.allEntries.length).toBe(200);
    expect(res200.uniqueEmails.length).toBe(200);
    expect(res200.exceedsLimit).toBe(false);

    const over200 = Array.from({ length: 205 }, (_, i) => `user${i}@example.com`).join('\n');
    const res205 = parseEmailInput(over200);
    expect(res205.allEntries.length).toBe(205);
    expect(res205.uniqueEmails.length).toBe(205);
    expect(res205.exceedsLimit).toBe(true);
  });

  // Problem 3.A: A mixture of valid and malformed addresses preserves the correct count
  it('preserves the exact count with a mixture of valid and malformed addresses', () => {
    const mixedInput = [
      'valid1@google.com',
      'user name@example.com',          // space in address
      'valid2@github.com',
      'plainaddress-without-at',        // missing @
      '@missing-local.com',             // missing local-part
      'user@.double-dot..org',          // invalid domain
      'valid3@cloudflare.com'
    ].join('\n');

    const res = parseEmailInput(mixedInput);
    expect(res.allEntries.length).toBe(7);
    expect(res.uniqueEmails.length).toBe(7);
    expect(res.uniqueEmails).toContain('user name@example.com');
    expect(res.uniqueEmails).toContain('plainaddress-without-at');
    expect(res.uniqueEmails).toContain('@missing-local.com');
  });

  // Edge cases: empty or whitespace
  it('handles empty or blank input gracefully', () => {
    const resEmpty = parseEmailInput('');
    expect(resEmpty.allEntries).toEqual([]);
    expect(resEmpty.uniqueEmails).toEqual([]);
    expect(resEmpty.duplicateCount).toBe(0);
    expect(resEmpty.exceedsLimit).toBe(false);

    const resWhitespace = parseEmailInput('    \t   \n  \r\n ');
    expect(resWhitespace.uniqueEmails).toEqual([]);
    expect(resWhitespace.allEntries.length).toBe(0);
  });
});
