import React, { useEffect, useRef } from 'react';
import {
  X,
  Server,
  FileCode,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Shield,
  ArrowRight,
  RotateCcw,
  History,
  AlertOctagon
} from 'lucide-react';
import type { EmailAnalysisResult } from '../types/analysis';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

interface ResultDetailsProps {
  result: EmailAnalysisResult | null;
  onClose: () => void;
  isHistorical?: boolean;
  savedAt?: number;
  onReanalyze?: (email: string) => void;
}

export const ResultDetails: React.FC<ResultDetailsProps> = ({
  result,
  onClose,
  isHistorical = false,
  savedAt,
  onReanalyze
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key to close drawer and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (result) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [result, onClose]);

  if (!result) return null;

  const mxRecords = result.diagnostics?.mx_records || [];
  const isNullMx = mxRecords.some((r) => r.trim() === '.' || r.includes(' .') || r.startsWith('0 .'));
  const hasFallbackA = result.diagnostics?.has_fallback_a ?? false;
  const isTimeout = result.domain_status === 'timeout' || result.mx_status === 'timeout';
  const isNxDomain = result.domain_status === 'nonexistent';
  const isResolved = result.domain_status === 'resolved';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-Side Drawer Surface */}
      <aside
        ref={drawerRef}
        className="relative z-10 w-full sm:max-w-xl md:max-w-2xl bg-white h-full shadow-2xl border-l border-[#E4E7EC] flex flex-col animate-in slide-in-from-right duration-300 ease-out"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#E4E7EC] bg-[#F8F9FC] shrink-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#667085] bg-white px-2 py-0.5 rounded border border-[#E4E7EC]">
                Domain Intelligence Dossier
              </span>
              <StatusBadge type="classification" value={result.classification} size="sm" />
              {isHistorical && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F4F3FF] text-[#5925DC] border border-[#D9D6FE]">
                  <History className="w-3 h-3" />
                  Historical Snapshot
                </span>
              )}
            </div>

            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-1.5 text-[#667085] hover:text-[#182230] hover:bg-[#EAECF0] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#315EFB]"
              aria-label="Close inspection drawer (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2
            id="drawer-title"
            className="text-base sm:text-lg font-bold font-mono text-[#182230] break-all"
          >
            {result.email}
          </h2>

          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#667085] font-mono">
            {result.domain && (
              <span>
                Domain: <strong className="text-[#344054]">{result.domain}</strong>
              </span>
            )}
            {savedAt && (
              <span className="text-[11px] text-[#98A2B3]">
                Snapshot Date: {new Date(savedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content: Domain Intelligence & RFC Diagnostic Sections */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm divide-y divide-[#F2F4F7]">
          {/* Section 1: Classification & Technical Reason */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#344054] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#315EFB]" />
                1. Classification &amp; Technical Reason
              </h3>
              <StatusBadge type="classification" value={result.classification} size="sm" />
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] space-y-2">
              <p className="text-xs font-medium text-[#182230] leading-relaxed">
                {result.reason}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#667085]">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#98A2B3]" />
                  Query latency: {result.diagnostics?.response_time_ms ?? 0}ms
                </span>
                {result.diagnostics?.is_disposable && (
                  <span className="inline-flex items-center gap-1 text-[#9A6700] bg-[#FFFAEB] px-2 py-0.5 rounded font-medium border border-[#FEDF89]">
                    <AlertTriangle className="w-3 h-3" />
                    Disposable Mail Provider
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: RFC 5322 Syntax Validation */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#344054] flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#667085]" />
                2. RFC 5322 Syntax Inspection
              </h3>
              <StatusBadge type="syntax" value={result.syntax_valid} size="sm" />
            </div>

            <div className="p-4 rounded-xl border border-[#E4E7EC] bg-white space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#667085] block">Syntax Conformance:</span>
                  <span className="font-semibold text-[#182230]">
                    {result.syntax_valid ? 'Valid RFC 5321/5322 structure' : 'RFC Specification Violation'}
                  </span>
                </div>
                <div>
                  <span className="text-[#667085] block">Structural Finding:</span>
                  <span className="font-mono text-[#344054]">
                    {result.syntax_valid
                      ? 'Pass (Length limits & dot-atom)'
                      : (result.diagnostics?.syntax_error || 'Malformed address format')}
                  </span>
                </div>
              </div>
              {!result.syntax_valid && result.diagnostics?.syntax_error && (
                <div className="p-2.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs mt-2">
                  <strong>Specific Syntax Error:</strong> {result.diagnostics.syntax_error}
                </div>
              )}
              <p className="text-[11px] text-[#667085] pt-1 border-t border-[#F2F4F7]">
                Evaluates total address length &le; 254, local-part &le; 64, domain &le; 253, and IDNA/Punycode encoding.
              </p>
            </div>
          </div>

          {/* Section 3: Domain-Resolution Status */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#344054] flex items-center gap-1.5">
                <Server className="w-4 h-4 text-[#667085]" />
                3. Domain-Resolution Status
              </h3>
              <StatusBadge type="domain" value={result.domain_status} size="sm" />
            </div>

            <div className="p-4 rounded-xl border border-[#E4E7EC] bg-white space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Authoritative DNS State:</span>
                <span className="font-mono font-semibold text-[#182230]">
                  {isResolved
                    ? 'NOERROR (Active Domain)'
                    : isNxDomain
                    ? 'NXDOMAIN (Non-Existent Domain)'
                    : isTimeout
                    ? 'TIMEOUT (Nameserver Unresponsive)'
                    : 'UNRESOLVED'}
                </span>
              </div>

              {/* Explicit Technical DNS Outcomes */}
              {isNxDomain && (
                <div className="p-3 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    Confirmed Non-Existent Domain (NXDOMAIN)
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Authoritative nameservers positively confirmed that &quot;{result.domain}&quot; does not exist in the DNS registry hierarchy. Outbound mail routing is structurally impossible.
                  </p>
                </div>
              )}

              {isTimeout && (
                <div className="p-3 rounded-lg bg-[#FFFAEB] border border-[#FEDF89] text-[#9A6700] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4" />
                    DNS Timeout / Resolver Failure
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    The authoritative nameservers did not respond within the query lifetime timeout. <strong>Important:</strong> This represents a temporary network resolution failure and does NOT prove that the domain does not exist.
                  </p>
                </div>
              )}

              {isResolved && (
                <p className="text-[11px] text-[#475467]">
                  The domain &quot;{result.domain}&quot; is registered and authoritative nameservers respond with valid resource records.
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Mail-Routing Evidence & Null MX Distinction */}
          <div className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#344054] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#667085]" />
                4. Mail-Routing (MX) Evidence &amp; Intelligence
              </h3>
              <StatusBadge type="mx" value={result.mx_status} size="sm" />
            </div>

            <div className="p-4 rounded-xl border border-[#E4E7EC] bg-white space-y-2.5 text-xs">
              {/* Distinct Case A: RFC 7505 Null MX Published */}
              {isNullMx ? (
                <div className="p-3.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-xs">
                    <XCircle className="w-4 h-4 shrink-0" />
                    RFC 7505 Null MX Record Published
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This domain explicitly publishes a Null MX record (<code className="font-mono bg-white px-1 py-0.5 rounded border border-[#FECDCA]">0 .</code>) to advertise to all internet mail systems that it does <em>not</em> accept any incoming email.
                  </p>
                  <p className="text-[10px] opacity-90">
                    Standard compliant MTAs will immediately reject or bounce messages sent to this domain without attempting network transmission.
                  </p>
                </div>
              ) : result.mx_status === 'present' && mxRecords.length > 0 ? (
                /* Distinct Case B: Active MX Records Present */
                <div>
                  <p className="text-[#344054] font-medium">
                    Active mail exchange servers discovered ({mxRecords.length}):
                  </p>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    Records sorted by numerical MX preference priority (lowest preference value = highest routing priority).
                  </p>
                </div>
              ) : hasFallbackA ? (
                /* Distinct Case C: RFC 5321 Fallback Routing (No MX, but A/AAAA present) */
                <div className="p-3.5 rounded-lg bg-[#FFFAEB] border border-[#FEDF89] text-[#9A6700] space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-xs">
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    RFC 5321 Implicit Fallback Routing
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    No dedicated MX records exist for this domain. However, direct host address (A/AAAA) records are active. Under RFC 5321 Section 5.1, mail clients may attempt delivery directly to the host IP.
                  </p>
                </div>
              ) : (
                /* Distinct Case D: Empty MX with No Fallback */
                <div className="p-3.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-xs">
                    <XCircle className="w-4 h-4 shrink-0" />
                    Empty MX Response &amp; No Fallback Host
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Authoritative nameservers returned 0 MX records and 0 A/AAAA fallback host records. Mail systems have no destination IP to deliver messages.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Actual DNS Records & Supporting Telemetry */}
          <div className="pt-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#344054] flex items-center gap-1.5">
              <Server className="w-4 h-4 text-[#315EFB]" />
              5. Raw DNS Records &amp; Telemetry
            </h3>

            {mxRecords.length > 0 ? (
              <div className="rounded-xl border border-[#E4E7EC] overflow-hidden">
                <div className="bg-[#F8F9FC] px-3.5 py-2 text-xs font-semibold text-[#475467] border-b border-[#E4E7EC] flex items-center justify-between">
                  <span>Queried MX Records</span>
                  <span className="font-mono text-[10px] text-[#667085]">{mxRecords.length} record(s)</span>
                </div>
                <ul className="divide-y divide-[#F2F4F7] font-mono text-xs p-0 m-0">
                  {mxRecords.map((record, i) => (
                    <li key={i} className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-2 text-[#344054]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[#18794E] shrink-0" />
                        <span className="truncate">{record}</span>
                      </div>
                      <span className="text-[10px] text-[#667085] bg-[#F2F4F7] px-1.5 py-0.5 rounded shrink-0">
                        Priority #{i + 1}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] text-xs text-[#667085]">
                {hasFallbackA
                  ? 'DNS query returned 0 MX records. Evaluated direct host address fallback.'
                  : 'DNS query returned 0 MX records and 0 A/AAAA fallback host records.'}
              </div>
            )}
          </div>

          {/* Section 6: Confirmed Findings vs Inferences */}
          <div className="pt-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#344054] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#18794E]" />
              6. Confirmed Findings vs. Inferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#A6F4C5] space-y-1.5">
                <span className="font-semibold text-[#027A48] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmed Finding:
                </span>
                <p className="text-[11px] text-[#344054] leading-relaxed">
                  {isResolved
                    ? 'The domain is registered and nameservers respond with definitive routing records.'
                    : isNxDomain
                    ? 'The domain does not exist (authoritative nameservers returned NXDOMAIN).'
                    : isTimeout
                    ? 'Authoritative nameservers timed out during resolution.'
                    : 'Unresolved domain status.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] space-y-1.5">
                <span className="font-semibold text-[#175CD3] flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Technical Inference:
                </span>
                <p className="text-[11px] text-[#344054] leading-relaxed">
                  {result.classification === 'likely_to_be_delivered'
                    ? 'Outbound mail servers will successfully locate active destination servers.'
                    : result.classification === 'likely_to_bounce'
                    ? 'Mail systems will reject or bounce messages at DNS routing or format verification stage.'
                    : 'Network evidence is incomplete; transmission outcome remains ambiguous.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 7: Limitations & Mailbox Verification Disclaimer */}
          <div className="pt-6 space-y-3">
            <div className="p-4 rounded-xl bg-[#FFFAEB] border border-[#FEDF89] text-xs text-[#7A3E00] space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#9A6700] shrink-0" />
                7. Technical Scope &amp; Deliverability Limitations
              </div>
              <p className="leading-relaxed text-[11px]">
                <strong>Individual Mailbox Existence:</strong> MailScope performs non-intrusive DNS and RFC analysis. The actual existence of this individual recipient inbox on the destination server <em>cannot be verified without sending message traffic</em>.
              </p>
              <p className="leading-relaxed text-[11px] opacity-90">
                <strong>No SMTP Connection Testing:</strong> MailScope evaluates DNS resource records and RFC syntax non-intrusively without establishing SMTP handshakes or sending probe traffic.
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#E4E7EC] bg-[#F8F9FC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isHistorical && onReanalyze && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReanalyze(result.email)}
                icon={<RotateCcw className="w-3.5 h-3.5 text-[#315EFB]" />}
                title="Send address to Dashboard to run fresh live DNS analysis"
              >
                Reanalyze Live
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Drawer
          </Button>
        </div>
      </aside>
    </div>
  );
};


