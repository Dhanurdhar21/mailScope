import React, { useEffect } from 'react';
import {
  X,
  Server,
  FileCode,
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react';
import type { EmailAnalysisResult } from '../types/analysis';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

interface ResultDetailsProps {
  result: EmailAnalysisResult | null;
  onClose: () => void;
}

export const ResultDetails: React.FC<ResultDetailsProps> = ({ result, onClose }) => {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (result) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [result, onClose]);

  if (!result) return null;

  const mxRecords = result.diagnostics?.mx_records || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-detail-title"
    >
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Surface */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-[#E4E7EC] overflow-hidden z-10 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E4E7EC] bg-[#F8F9FC]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                Inspection Details
              </span>
              <StatusBadge type="classification" value={result.classification} size="sm" />
            </div>
            <h3 id="result-detail-title" className="text-lg font-bold font-mono text-[#182230] break-all">
              {result.email}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#98A2B3] hover:text-[#182230] hover:bg-[#EAECF0] rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#315EFB]"
            aria-label="Close details dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Diagnostic Summary Callout */}
          <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] space-y-2">
            <h4 className="text-xs font-semibold uppercase text-[#344054] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#315EFB]" />
              Reason &amp; Technical Basis
            </h4>
            <p className="text-sm text-[#182230] leading-relaxed">
              {result.reason}
            </p>
          </div>

          {/* Evidence Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Syntax Evidence */}
            <div className="p-4 rounded-xl border border-[#E4E7EC] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#667085] flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[#667085]" />
                  RFC 5322 Syntax
                </span>
                <StatusBadge type="syntax" value={result.syntax_valid} size="sm" />
              </div>
              <p className="text-xs text-[#475467]">
                {result.syntax_valid
                  ? 'Conforms to standard local-part and domain address specification.'
                  : `Failed syntax checks: ${result.diagnostics?.syntax_error || 'Invalid format'}`}
              </p>
            </div>

            {/* Domain DNS Status */}
            <div className="p-4 rounded-xl border border-[#E4E7EC] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#667085] flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#667085]" />
                  Domain Resolution
                </span>
                <StatusBadge type="domain" value={result.domain_status} size="sm" />
              </div>
              <p className="text-xs text-[#475467]">
                Domain: <code className="font-mono bg-[#F2F4F7] px-1 py-0.5 rounded">{result.domain || 'N/A'}</code>
              </p>
            </div>
          </div>

          {/* Mail Routing / MX Records Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-[#344054] tracking-wider">
                Mail Routing (MX) Evidence
              </h4>
              <StatusBadge type="mx" value={result.mx_status} size="sm" />
            </div>

            {mxRecords.length > 0 ? (
              <div className="rounded-xl border border-[#E4E7EC] overflow-hidden">
                <div className="bg-[#F8F9FC] px-3 py-2 text-xs font-semibold text-[#475467] border-b border-[#E4E7EC]">
                  Active Mail Exchange Servers ({mxRecords.length})
                </div>
                <ul className="divide-y divide-[#F2F4F7] font-mono text-xs p-0 m-0">
                  {mxRecords.map((record, i) => (
                    <li key={i} className="px-3 py-2 bg-white flex items-center gap-2 text-[#344054]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#18794E]" />
                      <span>{record}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] text-xs text-[#667085]">
                {result.diagnostics?.has_fallback_a
                  ? 'No MX records returned. Direct A/AAAA address fallback routing detected (RFC 5321 fallback).'
                  : 'No MX or fallback routing records exist for this domain.'}
              </div>
            )}
          </div>

          {/* Diagnostics Timing & Provider Flags */}
          {result.diagnostics && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085] pt-2 border-t border-[#F2F4F7]">
              <span className="inline-flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-[#98A2B3]" />
                DNS query time: {result.diagnostics.response_time_ms}ms
              </span>
              {result.diagnostics.is_disposable && (
                <span className="inline-flex items-center gap-1 text-[#9A6700] bg-[#FFFAEB] px-2 py-0.5 rounded-full font-medium border border-[#FEDF89]">
                  <AlertTriangle className="w-3 h-3" />
                  Disposable Mail Provider
                </span>
              )}
            </div>
          )}

          {/* Technical Limitations and Uncertainty Note */}
          <div className="p-4 rounded-xl bg-[#FFFAEB]/60 border border-[#FEDF89] text-xs text-[#7A3E00] space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#9A6700]" />
              Confirmed Finding vs Inference
            </div>
            <p className="leading-relaxed">
              <strong>Technical Finding:</strong> The domain DNS and MX records were inspected against authoritative nameservers without sending message traffic.
            </p>
            <p className="leading-relaxed">
              <strong>Limitation:</strong> The actual existence of this specific mailbox user on the target mail server cannot be guaranteed without real delivery attempt.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E4E7EC] bg-[#F8F9FC] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      </div>
    </div>
  );
};
