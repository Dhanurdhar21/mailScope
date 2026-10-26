import React from 'react';
import { Search, X } from 'lucide-react';
import type { FilterCategory } from '../types/analysis';

interface ResultsFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterCategory: FilterCategory;
  onFilterChange: (cat: FilterCategory) => void;
  totalCount: number;
  filteredCount: number;
}

export const ResultsFilters: React.FC<ResultsFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  totalCount,
  filteredCount
}) => {
  const tabs: { key: FilterCategory; label: string }[] = [
    { key: 'all', label: 'All Results' },
    { key: 'likely_to_be_delivered', label: 'Likely to Deliver' },
    { key: 'likely_to_bounce', label: 'Likely to Bounce' },
    { key: 'unknown', label: 'Unknown' }
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[#E4E7EC]">
      {/* Classification Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F2F4F7] rounded-xl self-start lg:self-auto">
        {tabs.map((tab) => {
          const isActive = filterCategory === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-white text-[#182230] shadow-xs'
                  : 'text-[#667085] hover:text-[#182230] hover:bg-white/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Input and Counter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 sm:w-72">
          <label htmlFor="search-results-input" className="sr-only">
            Search addresses, domains, or reasons
          </label>
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#98A2B3]" />
          <input
            id="search-results-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search email, domain, or reason..."
            className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-[#D0D5DD] focus:outline-none focus:border-[#315EFB] focus:ring-2 focus:ring-[#315EFB]/15"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-[#98A2B3] hover:text-[#182230]"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Counter */}
        <span className="text-xs text-[#667085] whitespace-nowrap hidden sm:inline-block">
          Showing <strong className="text-[#182230]">{filteredCount}</strong> of {totalCount}
        </span>
      </div>
    </div>
  );
};
