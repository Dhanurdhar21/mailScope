import React from 'react';
import { ExternalLink, Info } from 'lucide-react';
import type { EmailAnalysisResult } from '../types/analysis';
import { StatusBadge } from './StatusBadge';

interface ResultsTableProps {
  results: EmailAnalysisResult[];
  onSelectResult: (item: EmailAnalysisResult) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  onSelectResult
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E4E7EC] overflow-hidden shadow-xs">
      {/* Desktop Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-[#F8F9FC] border-b border-[#E4E7EC] text-[11px] font-semibold text-[#475467] uppercase tracking-wider">
              <th scope="col" className="py-3 px-4 w-[28%]">
                Email Address
              </th>
              <th scope="col" className="py-3 px-3.5 w-[15%]">
                Classification
              </th>
              <th scope="col" className="py-3 px-3 w-[12%]">
                Syntax
              </th>
              <th scope="col" className="py-3 px-3 w-[12%]">
                Domain Status
              </th>
              <th scope="col" className="py-3 px-3 w-[13%]">
                Mail Routing (MX)
              </th>
              <th scope="col" className="py-3 px-4 w-[20%]">
                Technical Reason
              </th>
              <th scope="col" className="py-3 px-4 text-right w-[10%]">
                Dossier
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F7] text-xs">
            {results.map((item, index) => (
              <tr
                key={`${item.email}-${index}`}
                onClick={() => onSelectResult(item)}
                className="hover:bg-[#F8F9FC] transition-colors cursor-pointer group focus-visible:bg-[#F8F9FC] focus-visible:outline-none"
                tabIndex={0}
                role="button"
                aria-label={`Inspect evidence for ${item.email}: classified as ${item.classification}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectResult(item);
                  }
                }}
              >
                {/* Email Address & Domain */}
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-semibold text-[#182230] group-hover:text-[#315EFB] transition-colors break-all">
                      {item.email}
                    </span>
                    {item.domain && (
                      <span className="text-[11px] font-mono text-[#667085] mt-0.5">
                        @{item.domain}
                      </span>
                    )}
                  </div>
                </td>

                {/* Classification Badge */}
                <td className="py-3.5 px-3.5 whitespace-nowrap">
                  <StatusBadge type="classification" value={item.classification} size="sm" />
                </td>

                {/* Syntax */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <StatusBadge type="syntax" value={item.syntax_valid} size="sm" />
                </td>

                {/* Domain Status */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <StatusBadge type="domain" value={item.domain_status} size="sm" />
                </td>

                {/* Mail Routing */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <StatusBadge type="mx" value={item.mx_status} size="sm" />
                </td>

                {/* Reason */}
                <td className="py-3.5 px-4 text-xs text-[#475467] leading-relaxed max-w-xs">
                  <span className="line-clamp-2" title={item.reason}>
                    {item.reason}
                  </span>
                </td>

                {/* Action button */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectResult(item);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#315EFB] group-hover:text-[#2447C7] px-2.5 py-1 rounded-lg bg-[#EFF8FF]/70 group-hover:bg-[#EFF8FF] border border-[#B2DDFF]/50 transition-colors"
                    aria-label={`Open diagnostic dossier for ${item.email}`}
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer Note */}
      <div className="px-4 py-3 bg-[#F8F9FC] border-t border-[#E4E7EC] text-xs text-[#667085] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
          <span>Click any row or &quot;Inspect&quot; to review authoritative DNS records, MX priority servers, and RFC evidence.</span>
        </div>
        <span className="text-[11px] font-mono text-[#98A2B3] shrink-0">
          Showing {results.length} record(s)
        </span>
      </div>
    </div>
  );
};

