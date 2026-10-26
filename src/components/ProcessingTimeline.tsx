import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
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
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#F2F4F7]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#182230]">
              Processing Pipeline
            </h3>
            {isAnalyzing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#315EFB] animate-pulse" />
                Live Analysis In Progress
              </span>
            )}
            {!isAnalyzing && !error && stages.every((s) => s.status === 'completed') && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Analyzing {totalEmails} address{totalEmails === 1 ? '' : 'es'} through the six-stage validation pipeline.
          </p>
        </div>

        {/* Elapsed Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F9FC] border border-[#E4E7EC] text-xs font-mono text-[#344054]">
            <Clock className="w-3.5 h-3.5 text-[#667085]" />
            <span>Time: {formatTime(elapsedTimeMs)}</span>
          </div>
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;

          let icon = null;
          let nodeBg = 'bg-[#F2F4F7] text-[#98A2B3] border-[#D0D5DD]';
          let textColor = 'text-[#667085]';
          let titleColor = 'text-[#344054]';

          if (stage.status === 'completed') {
            nodeBg = 'bg-[#18794E] text-white border-[#18794E]';
            icon = <CheckCircle2 className="w-4 h-4" />;
            textColor = 'text-[#475467]';
            titleColor = 'text-[#182230] font-semibold';
          } else if (stage.status === 'in_progress') {
            nodeBg = 'bg-[#315EFB] text-white border-[#315EFB] ring-4 ring-[#315EFB]/15';
            icon = <Loader2 className="w-4 h-4 animate-spin" />;
            textColor = 'text-[#315EFB] font-medium';
            titleColor = 'text-[#182230] font-semibold';
          } else if (stage.status === 'failed') {
            nodeBg = 'bg-[#B42318] text-white border-[#B42318]';
            icon = <AlertCircle className="w-4 h-4" />;
            textColor = 'text-[#B42318] font-medium';
            titleColor = 'text-[#B42318] font-semibold';
          } else {
            icon = <span className="text-xs font-semibold">{stage.id}</span>;
          }

          return (
            <div key={stage.id} className="relative flex items-start gap-4">
              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`absolute left-[15px] top-[32px] w-[2px] h-[calc(100%-12px)] transition-colors ${
                    stage.status === 'completed' ? 'bg-[#18794E]/30' : 'bg-[#E4E7EC]'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Status Circle */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all ${nodeBg}`}
              >
                {icon}
              </div>

              {/* Stage Content */}
              <div className="flex-1 min-w-0 pt-0.5 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h4 className={`text-sm ${titleColor}`}>
                    STAGE {stage.id} &mdash; {stage.title}
                  </h4>
                  {stage.note && (
                    <span className="text-xs font-mono text-[#315EFB] bg-[#EFF8FF] px-2 py-0.5 rounded border border-[#B2DDFF]/50 self-start sm:self-auto">
                      {stage.note}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${textColor}`}>{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Failure State & Retry */}
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#B42318] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#B42318]">Analysis Pipeline Interrupted</p>
              <p className="text-xs text-[#912015] mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={onRetry}
          >
            Retry Pipeline
          </Button>
        </div>
      )}
    </div>
  );
};
