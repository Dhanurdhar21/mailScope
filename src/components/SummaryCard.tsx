import React from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Mail
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
      icon: <Mail className="w-5 h-5 text-[#315EFB]" />,
      bg: 'bg-white',
      border: 'border-[#E4E7EC]',
      badgeBg: 'bg-[#F2F4F7] text-[#344054]',
      filterKey: 'all' as const
    },
    {
      id: 'delivered',
      title: 'Likely to Deliver',
      count: likely_to_be_delivered,
      percentage: getPercentage(likely_to_be_delivered),
      icon: <CheckCircle2 className="w-5 h-5 text-[#18794E]" />,
      bg: 'bg-white',
      border: 'border-[#E4E7EC]',
      badgeBg: 'bg-[#ECFDF3] text-[#027A48]',
      filterKey: 'likely_to_be_delivered' as const
    },
    {
      id: 'bounced',
      title: 'Likely to Bounce',
      count: likely_to_bounce,
      percentage: getPercentage(likely_to_bounce),
      icon: <XCircle className="w-5 h-5 text-[#B42318]" />,
      bg: 'bg-white',
      border: 'border-[#E4E7EC]',
      badgeBg: 'bg-[#FEF3F2] text-[#B42318]',
      filterKey: 'likely_to_bounce' as const
    },
    {
      id: 'unknown',
      title: 'Unknown / Fallback',
      count: unknown,
      percentage: getPercentage(unknown),
      icon: <HelpCircle className="w-5 h-5 text-[#9A6700]" />,
      bg: 'bg-white',
      border: 'border-[#E4E7EC]',
      badgeBg: 'bg-[#FFFAEB] text-[#B54708]',
      filterKey: 'unknown' as const
    }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[#667085] px-1">
        <span>Analysis Summary Metrics</span>
        <span>DNS Batch Time: <strong className="font-mono text-[#182230]">{duration_ms}ms</strong></span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const isSelected = activeFilter === card.filterKey;

          return (
            <button
              key={card.id}
              onClick={() => onFilterSelect && onFilterSelect(card.filterKey)}
              className={`p-4 rounded-2xl border text-left transition-all ${card.bg} ${
                isSelected
                  ? 'border-[#315EFB] ring-2 ring-[#315EFB]/15 shadow-sm'
                  : `${card.border} hover:border-[#D0D5DD] hover:shadow-xs`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#667085]">{card.title}</span>
                <div className="p-1.5 rounded-lg bg-[#F8F9FC] border border-[#E4E7EC]">
                  {card.icon}
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold tracking-tight text-[#182230]">
                  {card.count}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${card.badgeBg}`}>
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
