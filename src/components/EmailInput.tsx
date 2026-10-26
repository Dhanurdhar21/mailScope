import React from 'react';
import {
  Sparkles,
  Trash2,
  Play,
  AlertCircle,
  CopyCheck,
  HelpCircle
} from 'lucide-react';
import { Button } from './Button';
import type { ParsedEmailResult } from '../services/emailParser';

interface EmailInputProps {
  inputText: string;
  onChange: (val: string) => void;
  parsed: ParsedEmailResult;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onLoadSample: () => void;
  onClear: () => void;
  hasResults: boolean;
}

export const EmailInput: React.FC<EmailInputProps> = ({
  inputText,
  onChange,
  parsed,
  isAnalyzing,
  onAnalyze,
  onLoadSample,
  onClear,
  hasResults
}) => {
  const count = parsed.uniqueEmails.length;
  const isOverLimit = parsed.exceedsLimit;
  const hasDuplicates = parsed.duplicateCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 shadow-xs">
      {/* Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#182230] tracking-tight">
            Analyze email addresses
          </h2>
          <p className="text-sm text-[#667085] mt-0.5">
            Paste one or more email addresses to inspect their syntax and available domain mail-routing evidence.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadSample}
            disabled={isAnalyzing}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#315EFB]" />}
            title="Populate input with real and invalid sample email addresses"
          >
            Load Sample Data
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={isAnalyzing || !inputText}
            icon={<Trash2 className="w-3.5 h-3.5 text-[#667085]" />}
            title="Clear all entered text"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Textarea Input Field */}
      <div className="relative">
        <label htmlFor="email-input-textarea" className="sr-only">
          Email addresses to analyze
        </label>
        <textarea
          id="email-input-textarea"
          rows={6}
          value={inputText}
          onChange={(e) => onChange(e.target.value)}
          disabled={isAnalyzing}
          placeholder={`alex@example.com\njordan@company.org\ncontact@sample.net\n(Accepts newlines, commas, semicolons, or spaces)`}
          className={`w-full font-mono text-sm p-4 rounded-xl border transition-all resize-y outline-none ${
            isOverLimit
              ? 'border-[#FDA29B] focus:ring-2 focus:ring-[#F04438]/20 bg-[#FFFBFA]'
              : 'border-[#D0D5DD] focus:border-[#315EFB] focus:ring-2 focus:ring-[#315EFB]/15 bg-white'
          } ${isAnalyzing ? 'bg-[#F9FAFB] cursor-not-allowed opacity-75' : ''}`}
        />

        {/* Counter Overlay */}
        <div className="flex items-center justify-between text-xs text-[#667085] mt-2 px-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-[#344054]">
              Detected: <strong className="text-[#182230]">{count}</strong> address{count === 1 ? '' : 'es'}
            </span>
            {hasDuplicates && (
              <span className="inline-flex items-center gap-1 text-[#475467] bg-[#F2F4F7] px-2 py-0.5 rounded-full text-[11px]">
                <CopyCheck className="w-3 h-3 text-[#667085]" />
                {parsed.duplicateCount} duplicate{parsed.duplicateCount > 1 ? 's' : ''} deduplicated
              </span>
            )}
            {isOverLimit && (
              <span className="inline-flex items-center gap-1 text-[#B42318] bg-[#FEF3F2] px-2 py-0.5 rounded-full text-[11px] font-medium">
                <AlertCircle className="w-3 h-3 text-[#F04438]" />
                Batch capped to {parsed.maxLimit} addresses
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#98A2B3] hidden sm:block">
            Supports newlines, commas, semicolons &amp; spaces
          </div>
        </div>
      </div>

      {/* Warnings & Help Notice */}
      {isOverLimit && (
        <div className="mt-3 p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            You entered {parsed.allEntries.length} addresses. The analyzer processes a maximum of {parsed.maxLimit} addresses per batch to guarantee stable DNS lookup performance.
          </span>
        </div>
      )}

      {/* Submission Footer */}
      <div className="mt-5 pt-4 border-t border-[#F2F4F7] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-xs text-[#667085] flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
          <span>No emails will be sent. Analysis is performed non-intrusively via DNS and RFC rules.</span>
        </div>

        <Button
          size="md"
          variant="primary"
          onClick={onAnalyze}
          isLoading={isAnalyzing}
          disabled={count === 0 || isAnalyzing}
          icon={<Play className="w-4 h-4 fill-current" />}
          className="self-end sm:self-auto min-w-[160px]"
        >
          {isAnalyzing ? 'Analyzing...' : hasResults ? 'Re-analyze Emails' : 'Analyze Emails'}
        </Button>
      </div>
    </div>
  );
};
