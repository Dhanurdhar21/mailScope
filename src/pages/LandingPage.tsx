import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  Layers,
  Server,
  Lock,
  Eye,
  FileCheck2
} from 'lucide-react';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section id="overview" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#E4E7EC_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline and Call-to-actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E4E7EC] text-xs font-medium text-[#344054] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#18794E]" />
                <span>Deterministic DNS &amp; RFC 5322 Deliverability Inspection</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#182230] leading-[1.12]">
                Know what your email addresses reveal.
              </h1>

              <p className="text-base sm:text-lg text-[#667085] leading-relaxed max-w-2xl">
                Analyze email syntax, domain configuration, and available mail-routing evidence to understand whether an address is likely deliverable, likely to bounce, or still unknown.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                    className="shadow-sm hover:shadow-md"
                  >
                    Start Analyzing
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg">
                    Explore How It Works
                  </Button>
                </a>
              </div>

              {/* Truthful Trust Statements */}
              <div className="pt-6 border-t border-[#E4E7EC]/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#475467]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#ECFDF3] flex items-center justify-center text-[#18794E]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">No test emails sent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#EFF8FF] flex items-center justify-center text-[#315EFB]">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">Transparent results</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#F4F3FF] flex items-center justify-center text-[#5925DC]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">Privacy-conscious analysis</span>
                </div>
              </div>
            </div>

            {/* Right Column: Genuine Product Preview */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-lg p-5 transition-all">
                {/* Preview Window Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F2F4F7]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FDA29B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEDF89]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A6F4C5]" />
                    <span className="text-xs font-mono text-[#667085] ml-2">
                      mailscope-inspector.sh
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                    Illustrative Preview
                  </span>
                </div>

                {/* Preview Sample List */}
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-[#182230] truncate">
                        analyst@example.com
                      </p>
                      <p className="text-[11px] text-[#667085] mt-0.5">
                        IANA reserved domain &bull; RFC 2606
                      </p>
                    </div>
                    <StatusBadge type="classification" value="unknown" size="sm" />
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-[#182230] truncate">
                        invalid-address
                      </p>
                      <p className="text-[11px] text-[#B42318] mt-0.5">
                        Missing @ and domain structure
                      </p>
                    </div>
                    <StatusBadge type="classification" value="likely_to_bounce" size="sm" />
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-[#182230] truncate">
                        user@nonexistent-domain.invalid
                      </p>
                      <p className="text-[11px] text-[#667085] mt-0.5">
                        Authoritative DNS: NXDOMAIN
                      </p>
                    </div>
                    <StatusBadge type="classification" value="likely_to_bounce" size="sm" />
                  </div>
                </div>

                {/* Preview Footer Notice */}
                <div className="mt-4 pt-3 border-t border-[#F2F4F7] flex items-center justify-between text-[11px] text-[#667085]">
                  <span>Examples for demonstration only</span>
                  <Link to="/dashboard" className="text-[#315EFB] font-medium hover:underline inline-flex items-center gap-1">
                    Try with real data &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#315EFB] mb-2">
              Process Architecture
            </h2>
            <h3 className="text-3xl font-bold text-[#182230] tracking-tight">
              How MailScope inspects addresses
            </h3>
            <p className="text-sm text-[#667085] mt-2">
              A transparent, three-step technical evaluation grounded in authoritative network standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative p-6 rounded-2xl bg-[#F8F9FC] border border-[#E4E7EC] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E4E7EC] flex items-center justify-center font-bold text-[#315EFB] shadow-xs">
                1
              </div>
              <h4 className="text-base font-semibold text-[#182230]">
                Enter email addresses
              </h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Paste single or bulk addresses separated by newlines, commas, semicolons, or spaces. The parser normalizes whitespace and isolates unique targets.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-2xl bg-[#F8F9FC] border border-[#E4E7EC] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E4E7EC] flex items-center justify-center font-bold text-[#315EFB] shadow-xs">
                2
              </div>
              <h4 className="text-base font-semibold text-[#182230]">
                Analyze syntax &amp; DNS routing
              </h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                The backend performs RFC 5322 syntax validation, queries authoritative nameservers for MX records, and checks RFC 5321 fallback A/AAAA address records.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-2xl bg-[#F8F9FC] border border-[#E4E7EC] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E4E7EC] flex items-center justify-center font-bold text-[#315EFB] shadow-xs">
                3
              </div>
              <h4 className="text-base font-semibold text-[#182230]">
                Review evidence &amp; export
              </h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Review transparent classifications with full technical reasons. Search, filter by status, inspect server priority records, and export injection-safe CSVs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="py-20 bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#315EFB] mb-2">
              Platform Features
            </h2>
            <h3 className="text-3xl font-bold text-[#182230] tracking-tight">
              Engineered for precision and clarity
            </h3>
            <p className="text-sm text-[#667085] mt-2">
              Capabilities designed to give developers and analysts reliable insight into email routing viability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs hover:border-[#D0D5DD] transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF8FF] text-[#315EFB] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#182230]">
                Bulk Email Input
              </h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Accepts multi-format inputs up to 200 addresses per batch with automatic deduplication, delimiter handling, and live address counts.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs hover:border-[#D0D5DD] transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF3] text-[#18794E] flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#182230]">
                Domain &amp; DNS Analysis
              </h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Executes live queries for MX records, identifies NXDOMAIN responses, and evaluates RFC 5321 fallback A/AAAA routing behaviors.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs hover:border-[#D0D5DD] transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] text-[#5925DC] flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#182230]">
                Transparent Classification
              </h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Categorizes into three distinct states with clear technical explanations rather than deceptive binary &quot;valid/invalid&quot; assumptions.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs hover:border-[#D0D5DD] transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFAEB] text-[#9A6700] flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-[#182230]">
                Processing Timeline
              </h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Visualizes execution through a six-stage pipeline, providing real diagnostic timing and truthful status updates for every inspection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Classification Explanation Section */}
      <section id="classifications" className="py-20 bg-white border-t border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#315EFB] mb-2">
              Deliverability Taxonomy
            </h2>
            <h3 className="text-3xl font-bold text-[#182230] tracking-tight">
              Understand the three outcome categories
            </h3>
            <p className="text-sm text-[#667085] mt-2">
              MailScope avoids misleading &quot;100% verified&quot; claims by communicating technical confidence accurately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category 1 */}
            <div className="p-6 rounded-2xl bg-[#F0FDF4]/50 border border-[#A6F4C5] space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#18794E]" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#027A48]">
                  Likely to be Delivered
                </h4>
              </div>
              <p className="text-xs text-[#344054] leading-relaxed">
                Available evidence supports the possibility of delivery: the syntax is valid and active MX servers are responding for the domain.
              </p>
              <div className="p-3 rounded-xl bg-white border border-[#D1FADF] text-[11px] text-[#475467]">
                <strong>Technical Reality:</strong> Actual mailbox existence and delivery success cannot be guaranteed without sending message traffic.
              </div>
            </div>

            {/* Category 2 */}
            <div className="p-6 rounded-2xl bg-[#FEF3F2]/50 border border-[#FECDCA] space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-[#B42318]" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#B42318]">
                  Likely to Bounce
                </h4>
              </div>
              <p className="text-xs text-[#344054] leading-relaxed">
                Evidence indicates a decisive delivery failure: either the syntax violates RFC 5322 or authoritative DNS servers confirmed NXDOMAIN.
              </p>
              <div className="p-3 rounded-xl bg-white border border-[#FEE4E2] text-[11px] text-[#475467]">
                <strong>Technical Reality:</strong> Mail systems cannot route messages to nonexistent domains or structurally malformed addresses.
              </div>
            </div>

            {/* Category 3 */}
            <div className="p-6 rounded-2xl bg-[#FFFAEB]/50 border border-[#FEDF89] space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#9A6700]" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#B54708]">
                  Unknown / Fallback
                </h4>
              </div>
              <p className="text-xs text-[#344054] leading-relaxed">
                Available evidence is insufficient to make a reliable determination. DNS timeouts, temporary server errors, or fallback A/AAAA records apply.
              </p>
              <div className="p-3 rounded-xl bg-white border border-[#FEF0C7] text-[11px] text-[#475467]">
                <strong>Technical Reality:</strong> Ambiguous outcomes and temporary network timeouts must never be falsely flagged as hard bounces.
              </div>
            </div>
          </div>

          {/* Bottom Action CTA banner */}
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-[#182230] to-[#1D2939] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div>
              <h4 className="text-xl font-bold tracking-tight">
                Ready to inspect your email addresses?
              </h4>
              <p className="text-xs text-[#98A2B3] mt-1">
                Open the interactive analyzer dashboard to run instant DNS deliverability checks.
              </p>
            </div>
            <Link to="/dashboard">
              <Button size="lg" className="bg-[#315EFB] hover:bg-[#2447C7] text-white shrink-0">
                Launch MailScope Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
