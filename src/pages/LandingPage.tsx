import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Server,
  Shield,
  FileCode,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION: Asymmetric, Editorial Layout */}
      <section id="overview" className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-[#E4E7EC]/60">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#E4E7EC_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Column (7 cols): Editorial Content, CTAs, and Trust Strip */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E4E7EC] text-xs font-mono font-medium text-[#344054] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#18794E] animate-pulse" />
                <span>EMAIL INTELLIGENCE &amp; DELIVERABILITY CONSOLE</span>
              </div>

              {/* Editorial Left-Aligned Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#182230] leading-[1.12]">
                Authoritative DNS &amp; RFC syntax inspection for critical inboxes.
              </h1>

              {/* Concise Explanation */}
              <p className="text-base sm:text-lg text-[#667085] leading-relaxed max-w-xl">
                Inspect email deliverability evidence through deterministic RFC 5321/5322 syntax validation, asynchronous authoritative nameserver resolution, and MX record priority analysis&mdash;without sending a single intrusive test email.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                    className="shadow-sm hover:shadow-md"
                  >
                    Analyze Email Addresses
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg">
                    Explore the Methodology
                  </Button>
                </a>
              </div>

              {/* Compact Trust Indicators */}
              <div className="pt-6 border-t border-[#E4E7EC] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#475467]">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E4E7EC]/70 shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-[#ECFDF3] flex items-center justify-center text-[#18794E] shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="font-medium">No test emails sent</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E4E7EC]/70 shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-[#EFF8FF] flex items-center justify-center text-[#315EFB] shrink-0">
                    <Server className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Evidence-based analysis</span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E4E7EC]/70 shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-[#F4F3FF] flex items-center justify-center text-[#5925DC] shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Transparent results</span>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Polished Technical Diagnostics Console Preview */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-xl overflow-hidden transition-all">
                {/* Console Frame Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#F8F9FC] border-b border-[#E4E7EC]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FDA29B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEDF89]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A6F4C5]" />
                    <span className="text-[11px] font-mono text-[#667085] ml-1.5 font-medium">
                      mailscope-diagnostics // telemetry
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                    Illustrative Data
                  </span>
                </div>

                {/* Console Body: 3 Distinct Sample Inspections */}
                <div className="p-4 space-y-3 font-mono text-xs">
                  {/* Item 1: Valid Domain & MX */}
                  <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#182230] truncate">
                        ops@acme-cloud.io
                      </span>
                      <StatusBadge type="classification" value="likely_to_be_delivered" size="sm" />
                    </div>
                    <div className="text-[11px] text-[#667085] flex flex-wrap gap-2">
                      <span className="text-[#18794E]">&bull; RFC 5322 Valid</span>
                      <span>&bull; MX: 10 mail.acme-cloud.io</span>
                      <span>&bull; Latency: 14ms</span>
                    </div>
                  </div>

                  {/* Item 2: RFC 7505 Null MX Rejection */}
                  <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#182230] truncate">
                        billing@2outlook.com
                      </span>
                      <StatusBadge type="classification" value="likely_to_bounce" size="sm" />
                    </div>
                    <div className="text-[11px] text-[#B42318] flex flex-wrap gap-2">
                      <span>&bull; RFC 7505 Null MX (&quot;.&quot;)</span>
                      <span>&bull; Domain refuses all mail</span>
                    </div>
                  </div>

                  {/* Item 3: Ambiguous Fallback A Routing */}
                  <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#182230] truncate">
                        dev@legacy-system.corp
                      </span>
                      <StatusBadge type="classification" value="unknown" size="sm" />
                    </div>
                    <div className="text-[11px] text-[#9A6700] flex flex-wrap gap-2">
                      <span>&bull; No MX returned</span>
                      <span>&bull; RFC 5321 fallback A record</span>
                    </div>
                  </div>
                </div>

                {/* Console Telemetry Footer */}
                <div className="px-4 py-2.5 bg-[#F8F9FC] border-t border-[#E4E7EC] flex items-center justify-between text-[11px] font-mono text-[#667085]">
                  <span>RESOLVER: async-dnspython</span>
                  <Link to="/dashboard" className="text-[#315EFB] font-semibold hover:underline inline-flex items-center gap-1">
                    Live Analyzer &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROCESS SECTION: Compact Horizontal Workflow */}
      <section id="how-it-works" className="py-16 md:py-20 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#315EFB]">
              01 // WORKFLOW ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#182230] tracking-tight mt-1">
              Deterministic 3-step evaluation sequence
            </h2>
            <p className="text-sm text-[#667085] mt-1.5">
              From raw multi-delimiter text to RFC-verified routing evidence in milliseconds.
            </p>
          </div>

          {/* Compact Horizontal Workflow Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 border border-[#E4E7EC] rounded-2xl bg-white overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#E4E7EC] shadow-xs">
            {/* Step 01 */}
            <div className="p-6 sm:p-7 space-y-3 bg-white hover:bg-[#F8F9FC]/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#315EFB] bg-[#EFF8FF] px-2.5 py-1 rounded-md border border-[#B2DDFF]">
                  STAGE 01
                </span>
                <span className="text-xs font-mono text-[#98A2B3]">Parser</span>
              </div>
              <h3 className="text-base font-bold text-[#182230]">
                Input Addresses
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Paste single or bulk addresses. Normalizes newlines, commas, semicolons, and spaces, isolating unique targets and deduplicating entries automatically.
              </p>
            </div>

            {/* Step 02 */}
            <div className="p-6 sm:p-7 space-y-3 bg-white hover:bg-[#F8F9FC]/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#18794E] bg-[#ECFDF3] px-2.5 py-1 rounded-md border border-[#A6F4C5]">
                  STAGE 02
                </span>
                <span className="text-xs font-mono text-[#98A2B3]">DNS Engine</span>
              </div>
              <h3 className="text-base font-bold text-[#182230]">
                Analyze Syntax &amp; DNS
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Validates RFC 5321/5322 boundaries, queries authoritative nameservers for MX records, detects RFC 7505 Null MX, and evaluates A/AAAA fallback routing.
              </p>
            </div>

            {/* Step 03 */}
            <div className="p-6 sm:p-7 space-y-3 bg-white hover:bg-[#F8F9FC]/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#5925DC] bg-[#F4F3FF] px-2.5 py-1 rounded-md border border-[#D9D6FE]">
                  STAGE 03
                </span>
                <span className="text-xs font-mono text-[#98A2B3]">Diagnostic</span>
              </div>
              <h3 className="text-base font-bold text-[#182230]">
                Inspect Evidence
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Review verified technical dossiers with raw nameserver records, query response times, transparent classification rationale, and CWE-1236 safe CSV export.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CAPABILITIES SECTION: Asymmetric Split Layout */}
      <section id="capabilities" className="py-16 md:py-24 bg-[#F7F8FA] border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column (5 cols): Headings & 4 Concise Capability Points */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#315EFB]">
                  02 // CAPABILITIES
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#182230] tracking-tight mt-1">
                  Engineered for diagnostic accuracy, not guesswork.
                </h2>
                <p className="text-xs sm:text-sm text-[#667085] mt-2 leading-relaxed">
                  Traditional verifiers rely on opaque deliverability scores and intrusive SMTP pings. MailScope isolates authoritative network evidence without risk.
                </p>
              </div>

              {/* 4 Concise Capability Points */}
              <div className="space-y-3.5 pt-2">
                <div className="p-3.5 rounded-xl bg-white border border-[#E4E7EC] shadow-2xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#EFF8FF] text-[#315EFB] flex items-center justify-center shrink-0">
                      <FileCode className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-[#182230]">
                      Strict RFC 5321 &amp; 5322 Syntax Engine
                    </h3>
                  </div>
                  <p className="text-xs text-[#667085] leading-relaxed pl-7">
                    Enforces local-part (&le;64 chars) and domain (&le;253 chars) limits, dot-atom boundaries, and IDNA/Punycode without crude regex shortcuts.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E4E7EC] shadow-2xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#ECFDF3] text-[#18794E] flex items-center justify-center shrink-0">
                      <Server className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-[#182230]">
                      Authoritative MX &amp; RFC 7505 Null MX
                    </h3>
                  </div>
                  <p className="text-xs text-[#667085] leading-relaxed pl-7">
                    Sorts mail exchangers by preference priority; immediately detects RFC 7505 Null MX records (<code className="font-mono text-[11px] bg-[#F2F4F7] px-1 py-0.5 rounded">.</code>) that advertise a domain refuses all email.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E4E7EC] shadow-2xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#FFFAEB] text-[#9A6700] flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-[#182230]">
                      RFC 5321 Fallback Routing Evaluation
                    </h3>
                  </div>
                  <p className="text-xs text-[#667085] leading-relaxed pl-7">
                    When no dedicated MX records exist, automatically evaluates host address A and AAAA records for implicit mail routing compliance.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E4E7EC] shadow-2xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#F4F3FF] text-[#5925DC] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-[#182230]">
                      Truthful Outcome Classification
                    </h3>
                  </div>
                  <p className="text-xs text-[#667085] leading-relaxed pl-7">
                    Distinguishes confirmed NXDOMAIN from temporary nameserver timeouts, preventing transient DNS hiccups from being flagged as hard bounces.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column (7 cols): Technical Evidence Preview Dossier */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-md overflow-hidden">
                {/* Dossier Header */}
                <div className="px-5 py-3.5 bg-[#F8F9FC] border-b border-[#E4E7EC] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#315EFB]" />
                    <span className="text-xs font-mono font-bold text-[#182230]">
                      TECHNICAL EVIDENCE INSPECTION DOSSIER
                    </span>
                  </div>
                  <StatusBadge type="classification" value="likely_to_be_delivered" size="sm" />
                </div>

                {/* Dossier Content Grid */}
                <div className="p-5 space-y-4 text-xs">
                  {/* Target Summary */}
                  <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
                    <div>
                      <span className="text-[#667085]">Evaluated Target: </span>
                      <strong className="text-[#182230]">eng-team@acme-cloud.io</strong>
                    </div>
                    <span className="text-[11px] text-[#18794E] bg-[#ECFDF3] px-2 py-0.5 rounded border border-[#A6F4C5]">
                      DNS Query: 18ms
                    </span>
                  </div>

                  {/* Evidence Stage 1: Syntax Breakdown */}
                  <div className="p-3.5 rounded-xl border border-[#E4E7EC] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#344054] flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-[#667085]" />
                        RFC 5322 Syntax Decomposition
                      </span>
                      <StatusBadge type="syntax" value={true} size="sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#667085] font-mono">
                      <div>Local-part: &quot;eng-team&quot; (8 chars &le; 64)</div>
                      <div>Domain: &quot;acme-cloud.io&quot; (13 chars &le; 253)</div>
                      <div>Dot-atom: Valid boundaries</div>
                      <div>IDN/Punycode: Standard ASCII</div>
                    </div>
                  </div>

                  {/* Evidence Stage 2: Domain Resolution */}
                  <div className="p-3.5 rounded-xl border border-[#E4E7EC] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#344054] flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-[#667085]" />
                        Authoritative Domain Lookup
                      </span>
                      <StatusBadge type="domain" value="resolved" size="sm" />
                    </div>
                    <p className="text-[11px] text-[#475467] leading-relaxed">
                      Nameserver response: <code className="font-mono bg-[#F2F4F7] px-1 py-0.5 rounded">NOERROR</code>. Domain is active and registered in the global DNS hierarchy.
                    </p>
                  </div>

                  {/* Evidence Stage 3: MX Record Routing Table */}
                  <div className="rounded-xl border border-[#E4E7EC] overflow-hidden">
                    <div className="bg-[#F8F9FC] px-3.5 py-2 font-semibold text-[#475467] border-b border-[#E4E7EC] flex items-center justify-between text-[11px]">
                      <span>Queried Mail Exchange (MX) Telemetry</span>
                      <StatusBadge type="mx" value="present" size="sm" />
                    </div>
                    <div className="divide-y divide-[#F2F4F7] font-mono text-[11px]">
                      <div className="p-2.5 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#18794E]" />
                          <span>mx1.acme-cloud.io (Resolved: 104.21.42.1)</span>
                        </div>
                        <span className="text-[#667085] bg-[#F2F4F7] px-1.5 py-0.5 rounded">
                          Preference 10 (Primary)
                        </span>
                      </div>
                      <div className="p-2.5 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#18794E]" />
                          <span>mx2.acme-cloud.io (Resolved: 104.21.42.2)</span>
                        </div>
                        <span className="text-[#667085] bg-[#F2F4F7] px-1.5 py-0.5 rounded">
                          Preference 20 (Backup)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dossier Footer Callout */}
                <div className="px-5 py-3 bg-[#F8F9FC] border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#667085]">
                  <span>Synthesis: Confirmed MX presence &amp; valid syntax</span>
                  <Link to="/dashboard" className="text-[#315EFB] font-semibold hover:underline">
                    Inspect your domains &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CLASSIFICATION SECTION: Compact, Visually Balanced Comparison Layout */}
      <section id="classifications" className="py-16 md:py-20 bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#315EFB]">
              03 // DELIVERABILITY TAXONOMY
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#182230] tracking-tight mt-1">
              Deterministic Deliverability Taxonomy
            </h2>
            <p className="text-sm text-[#667085] mt-1.5">
              Clear distinction between verified technical findings and statistical inferences.
            </p>
          </div>

          {/* Balanced 3-Column Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category 1: Likely to Be Delivered */}
            <div className="p-6 rounded-2xl bg-[#F0FDF4]/40 border border-[#A6F4C5] space-y-4 flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#18794E]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#027A48]">
                      Likely to be Delivered
                    </h3>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#18794E]" />
                </div>

                <p className="text-xs text-[#344054] leading-relaxed">
                  Available evidence confirms active routing: RFC syntax conforms strictly and authoritative nameservers return responsive MX servers.
                </p>

                <div className="space-y-2 pt-2 border-t border-[#D1FADF] text-xs">
                  <div>
                    <span className="font-semibold text-[#027A48] block text-[11px] uppercase tracking-wider">
                      Technical Finding:
                    </span>
                    <span className="text-[#344054]">
                      DNS resolution successful; MX servers actively responding with defined preferences.
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-[#175CD3] block text-[11px] uppercase tracking-wider">
                      Deliverability Inference:
                    </span>
                    <span className="text-[#344054]">
                      Mail transport agents will be able to initiate SMTP routing.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#D1FADF] text-[11px] text-[#475467]">
                <strong>Limitation:</strong> Individual mailbox user existence cannot be confirmed without sending live message traffic.
              </div>
            </div>

            {/* Category 2: Likely to Bounce */}
            <div className="p-6 rounded-2xl bg-[#FEF3F2]/40 border border-[#FECDCA] space-y-4 flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-[#B42318]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#B42318]">
                      Likely to Bounce
                    </h3>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#B42318]" />
                </div>

                <p className="text-xs text-[#344054] leading-relaxed">
                  Technical evidence confirms decisive failure: invalid RFC syntax, confirmed authoritative NXDOMAIN, or RFC 7505 Null MX published.
                </p>

                <div className="space-y-2 pt-2 border-t border-[#FEE4E2] text-xs">
                  <div>
                    <span className="font-semibold text-[#B42318] block text-[11px] uppercase tracking-wider">
                      Technical Finding:
                    </span>
                    <span className="text-[#344054]">
                      Malformed address boundaries, non-existent domain, or explicit refusal to accept email.
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-[#175CD3] block text-[11px] uppercase tracking-wider">
                      Deliverability Inference:
                    </span>
                    <span className="text-[#344054]">
                      Outgoing mail server will reject or immediately bounce the message.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#FEE4E2] text-[11px] text-[#475467]">
                <strong>Technical Reality:</strong> Mail systems cannot route to unresolvable domains or malformed address formats.
              </div>
            </div>

            {/* Category 3: Unknown / Fallback */}
            <div className="p-6 rounded-2xl bg-[#FFFAEB]/40 border border-[#FEDF89] space-y-4 flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#9A6700]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#B54708]">
                      Unknown / Fallback
                    </h3>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#9A6700]" />
                </div>

                <p className="text-xs text-[#344054] leading-relaxed">
                  Evidence is incomplete: DNS query timeout, temporary nameserver SERVFAIL, or fallback A/AAAA records apply without dedicated MX.
                </p>

                <div className="space-y-2 pt-2 border-t border-[#FEF0C7] text-xs">
                  <div>
                    <span className="font-semibold text-[#B54708] block text-[11px] uppercase tracking-wider">
                      Technical Finding:
                    </span>
                    <span className="text-[#344054]">
                      Authoritative nameserver timeout or legacy host address record routing.
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-[#175CD3] block text-[11px] uppercase tracking-wider">
                      Deliverability Inference:
                    </span>
                    <span className="text-[#344054]">
                      Transmission outcome is ambiguous; requires monitoring or re-analysis.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#FEF0C7] text-[11px] text-[#475467]">
                <strong>Technical Reality:</strong> Transient network timeouts must never be falsely flagged as hard bounces.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA BANNER */}
      <section className="py-16 md:py-20 bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-[#182230] to-[#1F2A37] text-white p-8 sm:p-12 overflow-hidden shadow-xl border border-[#344054]">
            {/* Background design elements */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(#315EFB_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-white/10 text-[#B2DDFF] border border-white/15">
                <ShieldCheck className="w-3.5 h-3.5 text-[#315EFB]" />
                Interactive Deliverability Inspector
              </span>

              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Ready to inspect your email lists with authoritative precision?
              </h2>

              <p className="text-sm sm:text-base text-[#98A2B3] leading-relaxed">
                Launch the MailScope diagnostics workspace to run instant, non-intrusive DNS and RFC analysis.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    className="bg-[#315EFB] hover:bg-[#2447C7] text-white shadow-md font-semibold"
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    Open Diagnostics Workspace
                  </Button>
                </Link>
                <span className="text-xs text-[#98A2B3] font-mono">
                  Up to 200 addresses per batch
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

