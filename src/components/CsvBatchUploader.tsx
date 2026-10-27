import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  CopyCheck,
  XCircle,
  Trash2,
  ArrowRight,
  RefreshCw,
  Columns
} from 'lucide-react';
import { parseCsvBatch } from '../services/csvParser';
import type { CsvParseResult, CsvRowPreview } from '../services/csvParser';
import { Button } from './Button';

interface CsvBatchUploaderProps {
  onAddressesSelected: (emails: string[], filename: string) => void;
  disabled?: boolean;
}

export const CsvBatchUploader: React.FC<CsvBatchUploaderProps> = ({
  onAddressesSelected,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | undefined>(undefined);
  const [removedIndexes, setRemovedIndexes] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process a chosen or dropped File
  const handleFile = useCallback((file: File) => {
    setErrorMessage(null);
    setRemovedIndexes(new Set());

    // Basic file extension / mime verification
    const isCsvOrText =
      file.name.endsWith('.csv') ||
      file.name.endsWith('.txt') ||
      file.type === 'text/csv' ||
      file.type === 'text/plain';

    if (!isCsvOrText) {
      setErrorMessage('Please upload a valid CSV (.csv) or text (.txt) file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds 5MB limit. Please provide a smaller batch.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          setErrorMessage('The uploaded CSV file is empty.');
          return;
        }

        setFileName(file.name);
        setRawContent(text);

        const result = parseCsvBatch(text);
        setParseResult(result);
        setSelectedColumn(result.selectedColumnIndex);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse CSV file content.');
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.');
    };

    reader.readAsText(file);
  }, []);

  // Drag & drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Re-parse when the user changes the column selector
  const handleColumnChange = (newColIndex: number) => {
    if (!rawContent) return;
    setSelectedColumn(newColIndex);
    setRemovedIndexes(new Set());
    const result = parseCsvBatch(rawContent, newColIndex);
    setParseResult(result);
  };

  // Allow removing a row from the preview before analysis
  const handleRemoveRow = (originalIndex: number) => {
    setRemovedIndexes((prev) => {
      const next = new Set(prev);
      next.add(originalIndex);
      return next;
    });
  };

  // Reset uploader state
  const handleReset = () => {
    setFileName(null);
    setRawContent(null);
    setParseResult(null);
    setSelectedColumn(undefined);
    setRemovedIndexes(new Set());
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Compute final valid emails excluding removed items
  const activeValidEmails = React.useMemo(() => {
    if (!parseResult) return [];
    return parseResult.uniqueValidEmails.filter((email) => {
      // Find matching row and check if removed
      const row = parseResult.rows.find((r) => r.emailCandidate === email);
      return row ? !removedIndexes.has(row.rowIndex) : true;
    });
  }, [parseResult, removedIndexes]);

  const handleApplyToAnalyzer = () => {
    if (activeValidEmails.length === 0) {
      setErrorMessage('No valid email addresses selected for analysis.');
      return;
    }
    onAddressesSelected(activeValidEmails, fileName || 'imported_batch.csv');
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Upload Zone (if no file loaded yet) */}
      {!parseResult ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#315EFB] bg-[#EFF8FF]'
              : 'border-[#D0D5DD] hover:border-[#315EFB] hover:bg-[#F8F9FC] bg-white'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#EFF8FF] text-[#315EFB] flex items-center justify-center border border-[#B2DDFF]">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-[#182230]">
                Click to browse or drag and drop your CSV file
              </p>
              <p className="text-xs text-[#667085] mt-1">
                Supports standard RFC 4180 CSV, quoted fields, UTF-8, and header / headerless files (up to 5MB)
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              icon={<FileSpreadsheet className="w-4 h-4 text-[#315EFB]" />}
            >
              Select CSV File
            </Button>
          </div>
        </div>
      ) : (
        /* Parsed File Details & Validation Preview */
        <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          {/* File Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E7EC]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EFF8FF] text-[#315EFB] flex items-center justify-center border border-[#B2DDFF] shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#182230] truncate" title={fileName || ''}>
                  {fileName}
                </h3>
                <p className="text-[11px] text-[#667085]">
                  {parseResult.totalRows} raw rows &bull;{' '}
                  {parseResult.hasHeader ? 'Header detected' : 'No header detected'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Choose Another File
              </Button>
            </div>
          </div>

          {/* Column Selector (if 2+ columns available) */}
          {parseResult.detectedColumns.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] text-xs">
              <div className="flex items-center gap-1.5 text-[#344054] font-medium shrink-0">
                <Columns className="w-4 h-4 text-[#315EFB]" />
                <span>Target Email Column:</span>
              </div>
              <select
                value={selectedColumn ?? 0}
                onChange={(e) => handleColumnChange(Number(e.target.value))}
                className="bg-white border border-[#D0D5DD] rounded-lg px-2.5 py-1 text-xs text-[#182230] focus:ring-2 focus:ring-[#315EFB]/20 focus:border-[#315EFB] outline-none"
              >
                {parseResult.detectedColumns.map((colName, idx) => (
                  <option key={idx} value={idx}>
                    Column {idx + 1}: &quot;{colName}&quot;
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-[#667085] ml-auto">
                Auto-detected highest match column
              </span>
            </div>
          )}

          {/* Validation Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC]">
              <span className="text-[11px] text-[#667085] block">Total Rows</span>
              <strong className="text-base text-[#182230] font-mono">{parseResult.totalRows}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-[#ECFDF3] border border-[#A6F4C5]">
              <span className="text-[11px] text-[#027A48] block">Valid Targets</span>
              <strong className="text-base text-[#027A48] font-mono">
                {activeValidEmails.length}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF]">
              <span className="text-[11px] text-[#175CD3] block">Duplicates</span>
              <strong className="text-base text-[#175CD3] font-mono">
                {parseResult.duplicateCount}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA]">
              <span className="text-[11px] text-[#B42318] block">Invalid Syntax</span>
              <strong className="text-base text-[#B42318] font-mono">
                {parseResult.invalidCount}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] col-span-2 sm:col-span-1">
              <span className="text-[11px] text-[#667085] block">Empty Rows</span>
              <strong className="text-base text-[#667085] font-mono">
                {parseResult.emptyRowCount}
              </strong>
            </div>
          </div>

          {/* Interactive Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#667085]">
              <span className="font-medium text-[#344054]">
                Batch Preview (Showing up to 100 rows)
              </span>
              <span>
                {parseResult.rows.filter((r) => !removedIndexes.has(r.rowIndex)).length} of{' '}
                {parseResult.rows.length} rows active
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto border border-[#E4E7EC] rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#F8F9FC] border-b border-[#E4E7EC] text-[#475467] sticky top-0">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">#</th>
                    <th className="py-2 px-3">Email Candidate</th>
                    <th className="py-2 px-3 w-32">Status</th>
                    <th className="py-2 px-3 w-16 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7] bg-white">
                  {parseResult.rows.slice(0, 100).map((row: CsvRowPreview) => {
                    const isRemoved = removedIndexes.has(row.rowIndex);
                    return (
                      <tr
                        key={row.rowIndex}
                        className={`transition-colors ${
                          isRemoved ? 'bg-[#F9FAFB] opacity-40 line-through' : 'hover:bg-[#F8F9FC]'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-[#98A2B3]">{row.rowIndex}</td>
                        <td className="py-2 px-3 truncate max-w-xs font-medium text-[#182230]">
                          {row.emailCandidate || (
                            <span className="italic text-[#98A2B3]">(empty row)</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#027A48] bg-[#ECFDF3] px-2 py-0.5 rounded-md font-sans font-medium border border-[#A6F4C5]">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          ) : row.status === 'duplicate' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#175CD3] bg-[#EFF8FF] px-2 py-0.5 rounded-md font-sans font-medium border border-[#B2DDFF]">
                              <CopyCheck className="w-3 h-3" /> Duplicate
                            </span>
                          ) : row.status === 'empty' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-md font-sans border border-[#E4E7EC]">
                              Empty
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-[#B42318] bg-[#FEF3F2] px-2 py-0.5 rounded-md font-sans font-medium border border-[#FECDCA]"
                              title={row.error}
                            >
                              <XCircle className="w-3 h-3" /> Invalid
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.rowIndex)}
                            disabled={isRemoved}
                            className="text-[#98A2B3] hover:text-[#F04438] p-1 rounded transition-colors disabled:opacity-30"
                            title="Remove from this batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#F2F4F7]">
            <span className="text-xs text-[#667085]">
              Ready to analyze <strong>{activeValidEmails.length}</strong> unique email address(es)
            </span>

            <Button
              size="md"
              variant="primary"
              disabled={activeValidEmails.length === 0 || disabled}
              onClick={handleApplyToAnalyzer}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Load {activeValidEmails.length} Addresses into Analyzer
            </Button>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
