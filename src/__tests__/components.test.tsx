import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';
import { SummaryCard } from '../components/SummaryCard';
import type { SummaryMetrics } from '../types/analysis';

describe('UI Components', () => {
  describe('StatusBadge', () => {
    it('renders likely_to_be_delivered with correct text and styling', () => {
      const { container } = render(
        <StatusBadge type="classification" value="likely_to_be_delivered" />
      );
      expect(screen.getByText('Likely to Deliver')).toBeDefined();
      const badge = container.querySelector('span');
      expect(badge?.className).toContain('text-[#027A48]');
    });

    it('renders likely_to_bounce with correct text and styling', () => {
      const { container } = render(
        <StatusBadge type="classification" value="likely_to_bounce" />
      );
      expect(screen.getByText('Likely to Bounce')).toBeDefined();
      const badge = container.querySelector('span');
      expect(badge?.className).toContain('text-[#B42318]');
    });

    it('renders unknown with correct text and styling', () => {
      const { container } = render(
        <StatusBadge type="classification" value="unknown" />
      );
      expect(screen.getByText('Unknown')).toBeDefined();
      const badge = container.querySelector('span');
      expect(badge?.className).toContain('text-[#B54708]');
    });

    it('renders syntax status properly', () => {
      const { rerender } = render(<StatusBadge type="syntax" value={true} />);
      expect(screen.getByText('Valid RFC 5322')).toBeDefined();

      rerender(<StatusBadge type="syntax" value={false} />);
      expect(screen.getByText('Malformed')).toBeDefined();
    });

    it('renders domain and mx status properly', () => {
      const { rerender } = render(<StatusBadge type="domain" value="resolved" />);
      expect(screen.getByText('Resolved')).toBeDefined();

      rerender(<StatusBadge type="mx" value="present" />);
      expect(screen.getByText('MX Present')).toBeDefined();
    });
  });

  describe('SummaryCard', () => {
    const mockSummary: SummaryMetrics = {
      total: 100,
      likely_to_be_delivered: 75,
      likely_to_bounce: 20,
      unknown: 5,
      duration_ms: 120
    };

    it('renders title, counts, and calculated percentages properly', () => {
      render(
        <SummaryCard
          summary={mockSummary}
          activeFilter="all"
          onFilterSelect={() => {}}
        />
      );

      expect(screen.getByText('Total Analyzed')).toBeDefined();
      expect(screen.getByText('100')).toBeDefined();
      expect(screen.getByText('75')).toBeDefined();
      expect(screen.getByText('20')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();
      expect(screen.getByText('75%')).toBeDefined();
      expect(screen.getByText('20%')).toBeDefined();
      expect(screen.getByText('5%')).toBeDefined();
      expect(screen.getByText('120ms')).toBeDefined();
    });

    it('calls onFilterSelect with appropriate filter category when clicked', () => {
      const handleFilter = vi.fn();
      render(
        <SummaryCard
          summary={mockSummary}
          activeFilter="all"
          onFilterSelect={handleFilter}
        />
      );

      fireEvent.click(screen.getByText('Likely to Deliver'));
      expect(handleFilter).toHaveBeenCalledWith('likely_to_be_delivered');

      fireEvent.click(screen.getByText('Likely to Bounce'));
      expect(handleFilter).toHaveBeenCalledWith('likely_to_bounce');
    });
  });
});
