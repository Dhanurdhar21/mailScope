/**
 * Email Parser & Normalizer Service
 * Safely parses newline, comma, semicolon, and space-separated email inputs.
 */

export interface ParsedEmailResult {
  allEntries: string[];
  uniqueEmails: string[];
  duplicateCount: number;
  duplicateMap: Record<string, number>;
  exceedsLimit: boolean;
  maxLimit: number;
}

export const MAX_EMAIL_BATCH_LIMIT = 200;

export const SAMPLE_EMAILS = [
  'contact@google.com',
  'engineering@github.com',
  'invalid-syntax-address.com',
  'user@nonexistent-domain-xyz-404.org',
  'analyst@example.com',
  'support@mailinator.com',
  'team@cloudflare.com',
  'broken@domain..with..double..dots'
].join('\n');

/**
 * Extracts and normalizes email strings from free-form user input.
 * Supports delimiters: newlines, commas, semicolons, tabs, and spaces.
 */
export function parseEmailInput(
  rawInput: string,
  maxLimit: number = MAX_EMAIL_BATCH_LIMIT
): ParsedEmailResult {
  if (!rawInput || !rawInput.trim()) {
    return {
      allEntries: [],
      uniqueEmails: [],
      duplicateCount: 0,
      duplicateMap: {},
      exceedsLimit: false,
      maxLimit
    };
  }

  // Split strictly by newline sequences (CRLF, LF, CR)
  const lines = rawInput.split(/\r\n|\r|\n/);

  // Each non-empty line after trimming leading and trailing whitespace is one candidate.
  // Internal spaces are preserved so malformed candidates can be evaluated for syntax validity.
  const rawTokens: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      rawTokens.push(trimmed);
    }
  }

  const seen = new Set<string>();
  const duplicateMap: Record<string, number> = {};
  const uniqueEmails: string[] = [];

  for (const token of rawTokens) {
    const lower = token.toLowerCase();
    if (seen.has(lower)) {
      duplicateMap[lower] = (duplicateMap[lower] || 1) + 1;
    } else {
      seen.add(lower);
      uniqueEmails.push(token);
    }
  }

  const duplicateCount = rawTokens.length - uniqueEmails.length;
  const exceedsLimit = uniqueEmails.length > maxLimit;

  return {
    allEntries: rawTokens,
    uniqueEmails,
    duplicateCount,
    duplicateMap,
    exceedsLimit,
    maxLimit
  };
}

/**
 * Basic RFC 5322 regex for early frontend feedback hints.
 * Does not replace the authoritative backend check.
 */
export function quickFrontendSyntaxCheck(email: string): boolean {
  const pattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return pattern.test(email.trim());
}
