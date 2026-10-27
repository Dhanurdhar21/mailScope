/**
 * RFC 4180 Compliant CSV Parser & Batch Processor
 * Handles quoted fields with embedded commas/newlines, UTF-8 BOM,
 * multi-column selection, duplicate detection, and address syntax validation.
 */

export interface CsvColumn {
  index: number;
  name: string;
  sampleValues: string[];
  isLikelyEmail: boolean;
}

export interface CsvRowPreview {
  id: string;
  originalRowNumber: number;
  rowIndex: number;
  email: string;
  emailCandidate: string;
  isValidSyntax: boolean;
  isDuplicate: boolean;
  isEmpty: boolean;
  status: 'valid' | 'duplicate' | 'invalid' | 'empty';
  error?: string;
  rawCells: string[];
}

export interface CsvBatchParseResult {
  filename: string;
  hasHeader: boolean;
  columns: CsvColumn[];
  detectedColumns: string[];
  selectedColumnIndex: number;
  totalRows: number;
  emptyRowsCount: number;
  emptyRowCount: number;
  duplicateCount: number;
  invalidSyntaxCount: number;
  invalidCount: number;
  validUniqueEmails: string[];
  uniqueValidEmails: string[];
  rowPreviews: CsvRowPreview[];
  rows: CsvRowPreview[];
}

export type CsvParseResult = CsvBatchParseResult;

/**
 * Basic syntactic check for previewing RFC 5322 compliance before backend submission.
 */
export function isSyntacticallyValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;

  // Basic structure check: local-part@domain with no whitespace, no consecutive dots
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain || local.length > 64 || domain.length > 253) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  if (!domain.includes('.')) return false;

  return true;
}

/**
 * Tokenizes raw CSV text into a 2D array of cells according to RFC 4180 rules.
 */
export function tokenizeCsv(rawText: string): string[][] {
  if (!rawText) return [];

  // Remove UTF-8 Byte Order Mark (BOM) if present
  let text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;

  // Normalize CRLF to LF
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      } else {
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  // Push final cell and row if non-empty or if cells exist
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Detects whether row 0 is likely a header row.
 */
export function detectHasHeader(rows: string[][]): boolean {
  if (rows.length === 0) return false;
  const headerRow = rows[0];

  // If any cell in row 0 contains an '@' sign, it is almost certainly an email address, NOT a header!
  if (headerRow.some((cell) => cell.includes('@'))) {
    return false;
  }

  // If any cell contains common email header keywords
  const emailKeywords = /^(email|mail|e-mail|e_mail|recipient|address|contact|user_email|account|billing contact|primary contact|id|name|full name|role|company)$/i;
  const hasKeyword = headerRow.some((cell) => emailKeywords.test(cell.trim()));
  if (hasKeyword) return true;

  // If first row has no @ but second row has @
  if (rows.length > 1) {
    const row0HasAt = headerRow.some((cell) => cell.includes('@'));
    const row1HasAt = rows[1].some((cell) => cell.includes('@'));
    if (!row0HasAt && row1HasAt) {
      return true;
    }
  }

  return false;
}

/**
 * Parses a CSV file content and produces structured batch preview metrics.
 */
export function parseCsvBatch(
  rawText: string,
  columnOrFilename?: number | string,
  maybeColumnIndex?: number
): CsvBatchParseResult {
  const filename = typeof columnOrFilename === 'string' ? columnOrFilename : 'batch.csv';
  const overrideColumnIndex =
    typeof columnOrFilename === 'number'
      ? columnOrFilename
      : typeof maybeColumnIndex === 'number'
      ? maybeColumnIndex
      : undefined;

  const rawRows = tokenizeCsv(rawText);

  // Filter out completely blank lines
  const nonEmptyRows = rawRows.filter((row) => row.some((cell) => cell.trim().length > 0));

  if (nonEmptyRows.length === 0) {
    return {
      filename,
      hasHeader: false,
      columns: [],
      detectedColumns: [],
      selectedColumnIndex: 0,
      totalRows: 0,
      emptyRowsCount: rawRows.length,
      emptyRowCount: rawRows.length,
      duplicateCount: 0,
      invalidSyntaxCount: 0,
      invalidCount: 0,
      validUniqueEmails: [],
      uniqueValidEmails: [],
      rowPreviews: [],
      rows: []
    };
  }

  const hasHeader = detectHasHeader(nonEmptyRows);
  const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;
  const headerRow = hasHeader ? nonEmptyRows[0] : [];

  // Determine max columns
  let maxColCount = 1;
  for (const row of nonEmptyRows) {
    if (row.length > maxColCount) maxColCount = row.length;
  }

  // Inspect columns and find the most likely email column
  const columns: CsvColumn[] = [];
  let bestColIndex = 0;
  let maxEmailLikelihood = -1;

  for (let c = 0; c < maxColCount; c++) {
    const colName = headerRow[c] && headerRow[c].trim() ? headerRow[c].trim() : `Column ${c + 1}`;
    const samples = dataRows.slice(0, 3).map((r) => r[c] || '').filter((v) => v.length > 0);

    // Count how many values contain '@' in this column
    let atCount = 0;
    for (const r of dataRows) {
      if (r[c] && r[c].includes('@')) atCount++;
    }

    const isLikely = /email|mail|recipient/i.test(colName) || atCount > 0;
    if (atCount > maxEmailLikelihood) {
      maxEmailLikelihood = atCount;
      bestColIndex = c;
    }

    columns.push({
      index: c,
      name: colName,
      sampleValues: samples,
      isLikelyEmail: isLikely
    });
  }

  const selectedColumn =
    overrideColumnIndex !== undefined && overrideColumnIndex >= 0 && overrideColumnIndex < maxColCount
      ? overrideColumnIndex
      : bestColIndex;

  // Process data rows
  const seenEmails = new Set<string>();
  const validUniqueEmails: string[] = [];
  const rowPreviews: CsvRowPreview[] = [];
  let duplicateCount = 0;
  let invalidSyntaxCount = 0;
  let emptyCount = rawRows.length - nonEmptyRows.length;

  dataRows.forEach((row, idx) => {
    const rawVal = (row[selectedColumn] || '').trim();
    const rowNum = (hasHeader ? 2 : 1) + idx;

    if (!rawVal) {
      emptyCount++;
      const item: CsvRowPreview = {
        id: `csv_row_${rowNum}_empty_${idx}`,
        originalRowNumber: rowNum,
        rowIndex: rowNum,
        email: '',
        emailCandidate: '',
        isValidSyntax: false,
        isDuplicate: false,
        isEmpty: true,
        status: 'empty',
        rawCells: row
      };
      rowPreviews.push(item);
      return;
    }

    const normalized = rawVal.toLowerCase();
    const isValid = isSyntacticallyValidEmail(rawVal);
    const isDup = seenEmails.has(normalized);

    if (!isValid) {
      invalidSyntaxCount++;
    }

    if (isDup) {
      duplicateCount++;
    } else {
      seenEmails.add(normalized);
      if (isValid) {
        validUniqueEmails.push(rawVal);
      }
    }

    const status: 'valid' | 'duplicate' | 'invalid' | 'empty' = isDup
      ? 'duplicate'
      : isValid
      ? 'valid'
      : 'invalid';

    rowPreviews.push({
      id: `csv_row_${rowNum}_${idx}`,
      originalRowNumber: rowNum,
      rowIndex: rowNum,
      email: rawVal,
      emailCandidate: rawVal,
      isValidSyntax: isValid,
      isDuplicate: isDup,
      isEmpty: false,
      status,
      error: !isValid ? 'Invalid RFC 5322 syntax' : undefined,
      rawCells: row
    });
  });

  return {
    filename,
    hasHeader,
    columns,
    detectedColumns: columns.map((c) => c.name),
    selectedColumnIndex: selectedColumn,
    totalRows: dataRows.length,
    emptyRowsCount: emptyCount,
    emptyRowCount: emptyCount,
    duplicateCount,
    invalidSyntaxCount,
    invalidCount: invalidSyntaxCount,
    validUniqueEmails,
    uniqueValidEmails: validUniqueEmails,
    rowPreviews,
    rows: rowPreviews
  };
}
