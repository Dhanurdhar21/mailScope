import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';
import type { TimelineStage } from '../types/analysis';
import { Button } from './Button';

interface ProcessingTimelineProps {
  stages: TimelineStage[];
  isAnalyzing: boolean;
  elapsedTimeMs: number;
  totalEmails: number;
  error: string | null;
  onRetry: () => void;
}

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({
  stages,
  isAnalyzing,
  elapsedTimeMs,
  totalEmails,
  error,
  onRetry
}) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const isCompleted = !isAnalyzing && !error && stages.every((s) => s.status === 'completed');
  const activeStage = stages.find((s) => s.status === 'in_progress');

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7EC] p-4 sm:p-5 shadow-xs transition-all">
      {/* Pipeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#F8F9FC] border border-[#E4E7EC] flex items-center justify-center text-[#315EFB] shrink-0">
            <Cpu className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-[#182230]">
                Processing Pipeline
              </h3>

              {isAnalyzing && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                  <Loader2 className="w-3 h-3 animate-spin text-[#315EFB]" />
                  <span>
                    {activeStage ? `Stage ${activeStage.id}: ${activeStage.title}` : 'Analyzing...'}
                  </span>
                </span>
              )}

              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All 6 Stages Completed
                </span>
              )}

              {error && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Pipeline Error
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#667085] mt-0.5">
              Verified {totalEmails} address{totalEmails === 1 ? '' : 'es'} across RFC syntax, authoritative DNS, and MX records.
            </p>
          </div>
        </div>

        {/* Right Header Actions: Elapsed Time & Expand Details */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8F9FC] border border-[#E4E7EC] text-xs font-mono text-[#344054]">
            <Clock className="w-3.5 h-3.5 text-[#667085]" />
            <span>{formatTime(elapsedTimeMs)}</span>
          </div>

          <button
            type="button"
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#315EFB] hover:text-[#2447C7] hover:bg-[#EFF8FF] rounded-lg transition-colors border border-transparent hover:border-[#B2DDFF]"
            aria-expanded={detailsExpanded}
          >
            <span>{detailsExpanded ? 'Hide details' : 'View processing details'}</span>
            {detailsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Compact Horizontal Status Sequence (Shown by default when not in detailed mode) */}
      <div className="mt-4 pt-3 border-t border-[#F2F4F7]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {stages.map((stage) => {
            const isDone = stage.status === 'completed';
            const isCurrent = stage.status === 'in_progress';
            const isFailed = stage.status === 'failed';

            return (
              <div
                key={stage.id}
                className={`p-2.5 rounded-xl border text-xs transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-[#EFF8FF] border-[#315EFB] ring-2 ring-[#315EFB]/15'
                    : isDone
                    ? 'bg-[#F8F9FC] border-[#E4E7EC]'
                    : isFailed
                    ? 'bg-[#FEF3F2] border-[#FECDCA]'
                    : 'bg-white border-[#F2F4F7] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-semibold text-[#667085]">
                    0{stage.id}
                  </span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-[#18794E]" />}
                  {isCurrent && <Loader2 className="w-3.5 h-3.5 text-[#315EFB] animate-spin" />}
                  {isFailed && <AlertCircle className="w-3.5 h-3.5 text-[#B42318]" />}
                  {!isDone && !isCurrent && !isFailed && (
                    <span className="w-2 h-2 rounded-full bg-[#D0D5DD]" />
                  )}
                </div>
                <div className="font-medium text-[11px] text-[#182230] truncate" title={stage.title}>
                  {stage.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Detailed 6-Stage View */}
      {detailsExpanded && (
        <div className="mt-4 pt-4 border-t border-[#E4E7EC] space-y-3 animate-in fade-in duration-200">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#667085] mb-2">
            Detailed Diagnostic Sequence
          </h4>

          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const isLast = idx === stages.length - 1;
              const isDone = stage.status === 'completed';
              const isCurrent = stage.status === 'in_progress';
              const isFailed = stage.status === 'failed';

              return (
                <div key={stage.id} className="relative flex items-start gap-3">
                  {!isLast && (
                    <div
                      className={`absolute left-[13px] top-[26px] w-[2px] h-[calc(100%-8px)] transition-colors ${
                        isDone ? 'bg-[#18794E]/30' : 'bg-[#E4E7EC]'
                      }`}
                      aria-hidden="true"
                    />
                  )}

                  <div
                    className={`relative z-10 w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-xs font-semibold ${
                      isDone
                        ? 'bg-[#18794E] text-white border-[#18794E]'
                        : isCurrent
                        ? 'bg-[#315EFB] text-white border-[#315EFB] ring-4 ring-[#315EFB]/15'
                        : isFailed
                        ? 'bg-[#B42318] text-white border-[#B42318]'
                        : 'bg-[#F2F4F7] text-[#98A2B3] border-[#D0D5DD]'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFailed ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      stage.id
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#182230]">
                          Stage {stage.id} &mdash; {stage.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-[#EFF8FF] text-[#175CD3] px-1.5 py-0.2 rounded font-medium border border-[#B2DDFF]">
                            Active
                          </span>
                        )}
                      </div>
                      {stage.note && (
                        <span className="text-[11px] font-mono text-[#315EFB] bg-[#EFF8FF] px-2 py-0.5 rounded border border-[#B2DDFF]/50 self-start sm:self-auto">
                          {stage.note}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failure State & Retry */}
      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#B42318] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#B42318]">Pipeline Execution Interrupted</p>
              <p className="text-[11px] text-[#912015] mt-0.5">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="danger" onClick={onRetry}>
            Retry Pipeline
          </Button>
        </div>
      )}
    </div>
  );
};

