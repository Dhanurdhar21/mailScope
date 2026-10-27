import React from 'react';
import { Search, X, Download, RotateCcw } from 'lucide-react';
import type { FilterCategory } from '../types/analysis';
import { Button } from './Button';

interface ResultsFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterCategory: FilterCategory;
  onFilterChange: (cat: FilterCategory) => void;
  totalCount: number;
  filteredCount: number;
  onExportCsv?: () => void;
  onNewAnalysis?: () => void;
}

export const ResultsFilters: React.FC<ResultsFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  totalCount,
  filteredCount,
  onExportCsv,
  onNewAnalysis
}) => {
  const tabs: { key: FilterCategory; label: string }[] = [
    { key: 'all', label: 'All Results' },
    { key: 'likely_to_be_delivered', label: 'Likely to Deliver' },
    { key: 'likely_to_bounce', label: 'Likely to Bounce' },
    { key: 'unknown', label: 'Unknown' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7EC] p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* Upper Toolbar: Heading, Total Count & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2F4F7]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm sm:text-base font-bold text-[#182230] tracking-tight">
            Analysis Results
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#F2F4F7] text-[#344054] border border-[#E4E7EC]">
            {totalCount} total
          </span>
          {searchQuery && (
            <span className="text-xs text-[#667085]">
              (Filtered to <strong className="text-[#182230]">{filteredCount}</strong>)
            </span>
          )}
        </div>

        {/* Action Controls: Export CSV & New Analysis */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              icon={<Download className="w-3.5 h-3.5 text-[#315EFB]" />}
              title="Export results table to an RFC-compliant CSV file"
            >
              Export CSV
            </Button>
          )}

          {onNewAnalysis && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onNewAnalysis}
              icon={<RotateCcw className="w-3.5 h-3.5 text-[#667085]" />}
              title="Reset analysis workspace for a new batch"
            >
              New Analysis
            </Button>
          )}
        </div>
      </div>

      {/* Lower Toolbar: Filter Tabs & Search Box */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Classification Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F2F4F7] rounded-xl self-start lg:self-auto">
          {tabs.map((tab) => {
            const isActive = filterCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-white text-[#182230] shadow-xs font-semibold'
                    : 'text-[#667085] hover:text-[#182230] hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <label htmlFor="search-results-input" className="sr-only">
            Search addresses, domains, or reasons
          </label>
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#98A2B3]" />
          <input
            id="search-results-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search email, domain, or reason..."
            className="w-full text-xs pl-8 pr-8 py-2 rounded-xl border border-[#D0D5DD] focus:outline-none focus:border-[#315EFB] focus:ring-2 focus:ring-[#315EFB]/15 bg-[#F8F9FC] focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-[#98A2B3] hover:text-[#182230] p-0.5"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

