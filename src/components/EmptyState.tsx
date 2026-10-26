import React from 'react';
import { SearchX, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  type: 'no_results' | 'no_filter_match';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction
}) => {
  const isFilter = type === 'no_filter_match';

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7EC] p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-[#F8F9FC] border border-[#E4E7EC] flex items-center justify-center text-[#667085] mb-4">
        {isFilter ? <SearchX className="w-6 h-6" /> : <Inbox className="w-6 h-6" />}
      </div>

      <h3 className="text-base font-semibold text-[#182230] mb-1">
        {title || (isFilter ? 'No matching records found' : 'No email addresses analyzed yet')}
      </h3>

      <p className="text-xs text-[#667085] max-w-sm mb-6 leading-relaxed">
        {description ||
          (isFilter
            ? 'None of the analyzed addresses match your current search query or classification filter.'
            : 'Paste email addresses into the analyzer input above and run the inspection to view deliverability evidence.')}
      </p>

      {actionText && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
