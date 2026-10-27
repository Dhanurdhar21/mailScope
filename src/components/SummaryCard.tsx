import React from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Mail,
  Clock
} from 'lucide-react';
import type { SummaryMetrics } from '../types/analysis';

interface SummaryCardProps {
  summary: SummaryMetrics;
  onFilterSelect?: (category: 'all' | 'likely_to_be_delivered' | 'likely_to_bounce' | 'unknown') => void;
  activeFilter?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  onFilterSelect,
  activeFilter = 'all'
}) => {
  const { total, likely_to_be_delivered, likely_to_bounce, unknown, duration_ms } = summary;

  const getPercentage = (count: number) => {
    if (!total || total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  const cards = [
    {
      id: 'all',
      title: 'Total Analyzed',
      count: total,
      percentage: '100%',
      icon: <Mail className="w-4 h-4 text-[#315EFB]" />,
      badgeBg: 'bg-[#F2F4F7] text-[#344054]',
      filterKey: 'all' as const
    },
    {
      id: 'delivered',
      title: 'Likely to Deliver',
      count: likely_to_be_delivered,
      percentage: getPercentage(likely_to_be_delivered),
      icon: <CheckCircle2 className="w-4 h-4 text-[#18794E]" />,
      badgeBg: 'bg-[#ECFDF3] text-[#027A48]',
      filterKey: 'likely_to_be_delivered' as const
    },
    {
      id: 'bounced',
      title: 'Likely to Bounce',
      count: likely_to_bounce,
      percentage: getPercentage(likely_to_bounce),
      icon: <XCircle className="w-4 h-4 text-[#B42318]" />,
      badgeBg: 'bg-[#FEF3F2] text-[#B42318]',
      filterKey: 'likely_to_bounce' as const
    },
    {
      id: 'unknown',
      title: 'Unknown / Fallback',
      count: unknown,
      percentage: getPercentage(unknown),
      icon: <HelpCircle className="w-4 h-4 text-[#9A6700]" />,
      badgeBg: 'bg-[#FFFAEB] text-[#B54708]',
      filterKey: 'unknown' as const
    }
  ];

  return (
    <div className="space-y-2">
      {/* Metrics Header Strip */}
      <div className="flex items-center justify-between text-xs text-[#667085] px-1">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-[#475467]">
          Batch Deliverability Telemetry
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[11px]">
          <Clock className="w-3 h-3 text-[#98A2B3]" />
          DNS Batch Time: <strong className="text-[#182230]">{duration_ms}ms</strong>
        </span>
      </div>

      {/* Compact Horizontal Strip of 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const isSelected = activeFilter === card.filterKey;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onFilterSelect && onFilterSelect(card.filterKey)}
              className={`p-3.5 rounded-xl border text-left transition-all bg-white flex flex-col justify-between ${
                isSelected
                  ? 'border-[#315EFB] ring-2 ring-[#315EFB]/15 shadow-xs'
                  : 'border-[#E4E7EC] hover:border-[#D0D5DD] hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-[#667085] truncate">
                  {card.title}
                </span>
                <div className="p-1 rounded-md bg-[#F8F9FC] border border-[#E4E7EC] shrink-0">
                  {card.icon}
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#182230]">
                  {card.count}
                </span>
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${card.badgeBg}`}>
                  {card.percentage}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

