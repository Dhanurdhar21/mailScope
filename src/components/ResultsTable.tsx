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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F9FC] border-b border-[#E4E7EC] text-[11px] font-semibold text-[#475467] uppercase tracking-wider">
              <th scope="col" className="py-3 px-4">
                Email Address
              </th>
              <th scope="col" className="py-3 px-4">
                Classification
              </th>
              <th scope="col" className="py-3 px-4">
                Syntax
              </th>
              <th scope="col" className="py-3 px-4">
                Domain Status
              </th>
              <th scope="col" className="py-3 px-4">
                Mail Routing (MX)
              </th>
              <th scope="col" className="py-3 px-4 max-w-xs">
                Technical Reason
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Evidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F7] text-sm">
            {results.map((item, index) => (
              <tr
                key={`${item.email}-${index}`}
                onClick={() => onSelectResult(item)}
                className="hover:bg-[#F8F9FC]/75 transition-colors cursor-pointer group"
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectResult(item);
                  }
                }}
              >
                {/* Email Address */}
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-semibold text-[#182230] group-hover:text-[#315EFB] transition-colors break-all">
                      {item.email}
                    </span>
                    {item.domain && (
                      <span className="text-[11px] text-[#98A2B3]">
                        @{item.domain}
                      </span>
                    )}
                  </div>
                </td>

                {/* Classification Badge */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge type="classification" value={item.classification} />
                </td>

                {/* Syntax */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge type="syntax" value={item.syntax_valid} />
                </td>

                {/* Domain Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge type="domain" value={item.domain_status} />
                </td>

                {/* Mail Routing */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge type="mx" value={item.mx_status} />
                </td>

                {/* Reason */}
                <td className="py-3.5 px-4 text-xs text-[#475467] max-w-xs truncate" title={item.reason}>
                  {item.reason}
                </td>

                {/* Action button */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectResult(item);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#315EFB] hover:text-[#2447C7] p-1.5 rounded-lg hover:bg-[#EFF8FF] transition-colors"
                    aria-label={`View full technical evidence for ${item.email}`}
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer Note */}
      <div className="px-4 py-3 bg-[#F8F9FC] border-t border-[#E4E7EC] text-xs text-[#667085] flex items-center gap-2">
        <Info className="w-4 h-4 text-[#98A2B3] shrink-0" />
        <span>Click any row or &quot;Inspect&quot; to review DNS diagnostics, MX priorities, and technical limitations.</span>
      </div>
    </div>
  );
};
