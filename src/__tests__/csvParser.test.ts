import { describe, it, expect } from 'vitest';
import { parseCsvBatch, tokenizeCsv } from '../services/csvParser';
import { escapeCsvField } from '../services/csvExport';

describe('CSV Parser and Validator', () => {
  it('parses header-based CSV and auto-detects email column', () => {
    const csv = `id,Full Name,Email Address,Company
1,"John Doe",john@example.com,"Acme Corp"
2,"Jane Smith",jane@test.org,"Beta LLC"`;

    const result = parseCsvBatch(csv);
    expect(result.hasHeader).toBe(true);
    expect(result.selectedColumnIndex).toBe(2);
    expect(result.uniqueValidEmails).toEqual(['john@example.com', 'jane@test.org']);
    expect(result.duplicateCount).toBe(0);
    expect(result.invalidCount).toBe(0);
  });

  it('parses headerless CSV without crashing', () => {
    const csv = `alice@domain.com,Customer
bob@company.org,Vendor`;

    const result = parseCsvBatch(csv);
    expect(result.hasHeader).toBe(false);
    expect(result.selectedColumnIndex).toBe(0);
    expect(result.uniqueValidEmails).toContain('alice@domain.com');
    expect(result.uniqueValidEmails).toContain('bob@company.org');
  });

  it('correctly handles quoted fields containing commas and quotes (RFC 4180)', () => {
    const csv = `"Doe, John",john@company.com,"He said ""Hello, world!"""
"Smith, Jane",jane@company.com,"Engineering, QA"`;

    const rows = tokenizeCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('Doe, John');
    expect(rows[0][1]).toBe('john@company.com');
    expect(rows[0][2]).toBe('He said "Hello, world!"');
  });

  it('detects duplicate email addresses in CSV', () => {
    const csv = `email
user@example.com
different@example.com
user@example.com
USER@example.com`;

    const result = parseCsvBatch(csv);
    expect(result.duplicateCount).toBe(2);
    expect(result.uniqueValidEmails).toHaveLength(2);
  });

  it('identifies invalid email syntax entries', () => {
    const csv = `email
valid@domain.com
plainaddress
@missinguser.com
missing-at-sign.com`;

    const result = parseCsvBatch(csv);
    expect(result.invalidCount).toBe(3);
    expect(result.uniqueValidEmails).toEqual(['valid@domain.com']);
  });

  it('handles empty rows gracefully', () => {
    const csv = `email
alpha@domain.com

beta@domain.com
   
gamma@domain.com`;

    const result = parseCsvBatch(csv);
    expect(result.emptyRowCount).toBe(2);
    expect(result.uniqueValidEmails).toHaveLength(3);
  });

  it('allows explicit column selection when multiple columns exist', () => {
    const csv = `Primary Contact,Billing Contact
lead@sales.com,finance@accounts.com`;

    // Explicitly select column 1 (Billing Contact)
    const result = parseCsvBatch(csv, 1);
    expect(result.selectedColumnIndex).toBe(1);
    expect(result.uniqueValidEmails).toEqual(['finance@accounts.com']);
  });

  it('handles large batches with 500 rows efficiently', () => {
    const lines = ['email,role'];
    for (let i = 0; i < 500; i++) {
      lines.push(`user${i}@domain.com,member`);
    }
    const csv = lines.join('\n');

    const start = performance.now();
    const result = parseCsvBatch(csv);
    const duration = performance.now() - start;

    expect(result.totalRows).toBe(500);
    expect(result.uniqueValidEmails).toHaveLength(500);
    expect(duration).toBeLessThan(500); // Must be fast (<500ms)
  });

  it('escapes spreadsheet formula injection prefixes in CSV export (CWE-1236)', () => {
    expect(escapeCsvField('=SUM(A1:A10)')).toBe(`"'=SUM(A1:A10)"`);
    expect(escapeCsvField('+12345')).toBe(`"'+12345"`);
    expect(escapeCsvField('-100')).toBe(`"'-100"`);
    expect(escapeCsvField('@evil.com')).toBe(`"'@evil.com"`);
  });

  it('escapes fields with commas, double quotes, and newlines', () => {
    expect(escapeCsvField('Hello, World')).toBe('"Hello, World"');
    expect(escapeCsvField('Quotes "here"')).toBe('"Quotes ""here"""');
    expect(escapeCsvField('Line1\nLine2')).toBe('"Line1\nLine2"');
  });
});
