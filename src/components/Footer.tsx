import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#E4E7EC] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#F2F4F7]">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#315EFB] flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg text-[#182230]">MailScope</span>
            </div>
            <p className="text-sm text-[#667085] leading-relaxed max-w-md">
              A developer-focused email deliverability analyzer engineered to inspect RFC syntax, domain DNS status, and mail routing configurations transparently.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#344054] mb-3">
              Application
            </h4>
            <ul className="space-y-2 text-sm text-[#667085]">
              <li>
                <Link to="/dashboard" className="hover:text-[#315EFB] transition-colors">
                  Email Analyzer Dashboard
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#315EFB] transition-colors">
                  How Analysis Works
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-[#315EFB] transition-colors">
                  Inspection Capabilities
                </a>
              </li>
              <li>
                <a href="#classifications" className="hover:text-[#315EFB] transition-colors">
                  Classification Criteria
                </a>
              </li>
            </ul>
          </div>

          {/* Technical Scope */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#344054] mb-3">
              Technical Standards
            </h4>
            <ul className="space-y-2 text-sm text-[#667085]">
              <li>RFC 5322 Syntax Rules</li>
              <li>RFC 5321 Mail Routing & MX</li>
              <li>DNS A/AAAA Fallback Checks</li>
              <li>FastAPI Async Inspection</li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Transparency Note */}
        <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#667085]">
          <div className="flex items-start gap-2 max-w-2xl">
            <Info className="w-4 h-4 text-[#98A2B3] shrink-0 mt-0.5" />
            <p>
              <strong>Technical Disclaimer:</strong> Deliverability classifications are probabilistic estimates derived from publicly available DNS records and RFC syntax rules. Actual individual mailbox existence cannot be confirmed without sending live messages. No test emails are ever sent by this tool.
            </p>
          </div>
          <div className="text-xs text-[#98A2B3] shrink-0">
            MailScope Analyzer &bull; Internship Software Assignment
          </div>
        </div>
      </div>
    </footer>
  );
};
