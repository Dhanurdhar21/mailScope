import React, { useState } from 'react';
import {
  Sparkles,
  Trash2,
  Play,
  AlertCircle,
  CopyCheck,
  Maximize2,
  Minimize2,
  ShieldCheck
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
  const [isExpanded, setIsExpanded] = useState(false);
  const count = parsed.uniqueEmails.length;
  const isOverLimit = parsed.exceedsLimit;
  const hasDuplicates = parsed.duplicateCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7EC] p-4 sm:p-5 shadow-xs transition-all">
      {/* Top Bar: Title & Quick Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#EFF8FF] text-[#315EFB] flex items-center justify-center font-bold text-xs border border-[#B2DDFF]/60 shrink-0">
            &gt;_
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#182230] tracking-tight">
              Email Target Input
            </h2>
            <p className="text-[11px] text-[#667085]">
              Paste single or bulk addresses to inspect RFC syntax and authoritative DNS routing.
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#475467] bg-[#F8F9FC] hover:bg-[#F2F4F7] border border-[#E4E7EC] rounded-lg transition-colors"
            title={isExpanded ? 'Collapse input area' : 'Expand input area'}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#667085]" />
                <span className="hidden sm:inline">Compact</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#667085]" />
                <span className="hidden sm:inline">Expand</span>
              </>
            )}
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={onLoadSample}
            disabled={isAnalyzing}
            icon={<Sparkles className="w-3.5 h-3.5 text-[#315EFB]" />}
            title="Populate input with real and invalid sample email addresses"
          >
            Load Sample
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
          rows={isExpanded ? 10 : 3}
          value={inputText}
          onChange={(e) => onChange(e.target.value)}
          disabled={isAnalyzing}
          placeholder="Enter addresses (e.g. user@domain.com, team@company.org)... Accepts newlines, commas, semicolons, or spaces"
          className={`w-full font-mono text-xs sm:text-sm p-3.5 rounded-xl border transition-all resize-y outline-none leading-relaxed ${
            isOverLimit
              ? 'border-[#FDA29B] focus:ring-2 focus:ring-[#F04438]/20 bg-[#FFFBFA]'
              : 'border-[#D0D5DD] focus:border-[#315EFB] focus:ring-2 focus:ring-[#315EFB]/15 bg-white'
          } ${isAnalyzing ? 'bg-[#F9FAFB] cursor-not-allowed opacity-75' : ''}`}
        />

        {/* Live Detected-Address Status Badges Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F2F4F7] text-[#344054] border border-[#E4E7EC]">
              Detected: <strong className="text-[#182230]">{count}</strong>
            </span>

            {hasDuplicates && (
              <span className="inline-flex items-center gap-1 text-[#475467] bg-[#F8F9FC] border border-[#E4E7EC] px-2 py-0.5 rounded-full text-[11px]">
                <CopyCheck className="w-3 h-3 text-[#667085]" />
                {parsed.duplicateCount} duplicate{parsed.duplicateCount > 1 ? 's' : ''} removed
              </span>
            )}

            {isOverLimit && (
              <span className="inline-flex items-center gap-1 text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] px-2 py-0.5 rounded-full text-[11px] font-medium">
                <AlertCircle className="w-3 h-3 text-[#F04438]" />
                Batch capped to {parsed.maxLimit} max
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#98A2B3] hidden md:block">
            Supports newlines, commas, semicolons, and spaces
          </div>
        </div>
      </div>

      {/* Overflow Warning */}
      {isOverLimit && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Input contains {parsed.allEntries.length} addresses. The analyzer processes a maximum of {parsed.maxLimit} addresses per batch to guarantee stable DNS lookup performance.
          </span>
        </div>
      )}

      {/* Execution Footer Bar */}
      <div className="mt-3 pt-3 border-t border-[#F2F4F7] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-[11px] text-[#667085] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#18794E] shrink-0" />
          <span>Zero email traffic sent &bull; 100% non-intrusive DNS and RFC analysis</span>
        </div>

        <Button
          size="md"
          variant="primary"
          onClick={onAnalyze}
          isLoading={isAnalyzing}
          disabled={count === 0 || isAnalyzing}
          icon={<Play className="w-4 h-4 fill-current" />}
          className="self-end sm:self-auto min-w-[160px] shadow-sm hover:shadow-md"
        >
          {isAnalyzing ? 'Analyzing...' : hasResults ? 'Re-analyze Emails' : 'Analyze Emails'}
        </Button>
      </div>
    </div>
  );
};

