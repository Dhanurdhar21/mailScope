import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  ArrowLeft,
  Search,
  Calendar,
  ArrowUpDown,
  Download,
  Trash2,
  Edit2,
  Eye,
  GitCompare,
  AlertCircle,
  Database,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { historyStorage } from '../services/historyStorage';
import type { StoredAnalysisBatch } from '../types/history';
import { downloadCsvFile } from '../services/csvExport';
import { Button } from '../components/Button';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';

type SortOption = 'date-desc' | 'date-asc' | 'emails-desc' | 'deliverable-desc';
type DateFilter = 'all' | 'today' | '7days' | '30days';
type ClassificationFilter = 'all' | 'likely_to_be_delivered' | 'likely_to_bounce' | 'unknown';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<StoredAnalysisBatch[]>([]);
  const [storageInfo, setStorageInfo] = useState({ count: 0, maxBatches: 50 });
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [classificationFilter, setClassificationFilter] = useState<ClassificationFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  // Compare selection state (max 2 selected batch IDs)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Dialog states
  const [batchToRename, setBatchToRename] = useState<StoredAnalysisBatch | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [batchToDelete, setBatchToDelete] = useState<StoredAnalysisBatch | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load history from storage
  const loadBatches = useCallback(() => {
    setLoading(true);
    setStorageError(null);
    try {
      const data = historyStorage.getHistory();
      setBatches(data);
      setStorageInfo(historyStorage.getStorageInfo());
    } catch (err: any) {
      setStorageError(err.message || 'Failed to retrieve analysis history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Aggregate Metrics calculated from actual stored records
  const metrics = useMemo(() => {
    const totalBatches = batches.length;
    let totalAddresses = 0;
    let totalDeliverable = 0;
    let totalBounce = 0;
    let totalUnknown = 0;

    batches.forEach((b) => {
      totalAddresses += b.summary.total_emails ?? b.summary.total ?? b.results.length;
      totalDeliverable += b.summary.likely_to_be_delivered;
      totalBounce += b.summary.likely_to_bounce;
      totalUnknown += b.summary.unknown;
    });

    const deliverablePct =
      totalAddresses > 0 ? ((totalDeliverable / totalAddresses) * 100).toFixed(1) : '0.0';

    return {
      totalBatches,
      totalAddresses,
      totalDeliverable,
      totalBounce,
      totalUnknown,
      deliverablePct
    };
  }, [batches]);

  // Filter and sort stored batches
  const filteredBatches = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const q = searchQuery.toLowerCase().trim();

    return batches
      .filter((batch) => {
        // Search by batch name or search by email address inside results
        if (q) {
          const nameMatches = batch.name.toLowerCase().includes(q);
          const emailMatches = batch.results.some((r) =>
            r.email.toLowerCase().includes(q) || r.domain.toLowerCase().includes(q)
          );
          if (!nameMatches && !emailMatches) return false;
        }

        // Date range filter
        if (dateFilter === 'today') {
          if (now - batch.timestamp > oneDayMs) return false;
        } else if (dateFilter === '7days') {
          if (now - batch.timestamp > 7 * oneDayMs) return false;
        } else if (dateFilter === '30days') {
          if (now - batch.timestamp > 30 * oneDayMs) return false;
        }

        // Classification filter (batch must have at least 1 record of that category)
        if (classificationFilter === 'likely_to_be_delivered') {
          if (batch.summary.likely_to_be_delivered === 0) return false;
        } else if (classificationFilter === 'likely_to_bounce') {
          if (batch.summary.likely_to_bounce === 0) return false;
        } else if (classificationFilter === 'unknown') {
          if (batch.summary.unknown === 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.timestamp - a.timestamp;
        if (sortBy === 'date-asc') return a.timestamp - b.timestamp;
        if (sortBy === 'emails-desc') {
          const countA = a.summary.total_emails ?? a.summary.total ?? a.results.length;
          const countB = b.summary.total_emails ?? b.summary.total ?? b.results.length;
          return countB - countA;
        }
        if (sortBy === 'deliverable-desc') {
          const pctA = a.summary.deliverability_percentage ?? 0;
          const pctB = b.summary.deliverability_percentage ?? 0;
          return pctB - pctA;
        }
        return 0;
      });
  }, [batches, searchQuery, dateFilter, classificationFilter, sortBy]);

  // Actions
  const handleViewBatch = (batch: StoredAnalysisBatch) => {
    // Navigate to dashboard with state so results table and drawer load without new DNS lookups
    navigate('/dashboard', { state: { historicalBatch: batch } });
  };

  const handleExportCsv = (batch: StoredAnalysisBatch) => {
    const success = downloadCsvFile(batch.results, `mailscope-${batch.name.replace(/[^a-z0-9_-]/gi, '_')}`);
    if (success) {
      addToast('success', `Exported "${batch.name}" to CSV.`);
    } else {
      addToast('error', 'Failed to generate CSV export.');
    }
  };

  const handleOpenRename = (batch: StoredAnalysisBatch) => {
    setBatchToRename(batch);
    setRenameInputValue(batch.name);
  };

  const handleConfirmRename = () => {
    if (!batchToRename || !renameInputValue.trim()) return;
    try {
      historyStorage.renameBatch(batchToRename.id, renameInputValue.trim());
      addToast('success', 'Batch renamed successfully.');
      setBatchToRename(null);
      loadBatches();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to rename batch.');
    }
  };

  const handleConfirmDelete = () => {
    if (!batchToDelete) return;
    try {
      historyStorage.deleteBatch(batchToDelete.id);
      addToast('info', `Deleted batch "${batchToDelete.name}".`);
      setBatchToDelete(null);
      // Remove from compare selection if present
      setSelectedForCompare((prev) => prev.filter((id) => id !== batchToDelete.id));
      loadBatches();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete batch.');
    }
  };

  const handleClearAllHistory = () => {
    try {
      historyStorage.clearAllHistory();
      addToast('info', 'All analysis history cleared.');
      setShowClearConfirm(false);
      setSelectedForCompare([]);
      loadBatches();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to clear history.');
    }
  };

  // Compare toggle
  const toggleCompareSelection = (batchId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(batchId)) {
        return prev.filter((id) => id !== batchId);
      }
      if (prev.length >= 2) {
        addToast('info', 'Maximum 2 batches can be compared. Deselect one first.');
        return prev;
      }
      return [...prev, batchId];
    });
  };

  const handleLaunchCompare = () => {
    if (selectedForCompare.length !== 2) {
      addToast('info', 'Please select exactly 2 batches to compare.');
      return;
    }
    navigate(`/compare?batchA=${selectedForCompare[0]}&batchB=${selectedForCompare[1]}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Header Bar */}
      <section className="bg-white border-b border-[#E4E7EC] sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#667085] mb-0.5">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1 font-medium hover:text-[#182230] transition-colors focus:outline-none focus:ring-1 focus:ring-[#315EFB] rounded p-0.5"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Analyzer Workspace</span>
                </Link>
                <span>/</span>
                <span className="font-mono text-[#344054]">Analysis History</span>
              </div>

              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#182230]">
                  Saved Batch Archives
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#475467] border border-[#E4E7EC]">
                  Local Storage ({storageInfo.count}/{storageInfo.maxBatches})
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {selectedForCompare.length === 2 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleLaunchCompare}
                  icon={<GitCompare className="w-3.5 h-3.5" />}
                  className="animate-in fade-in"
                >
                  Compare 2 Selected Batches
                </Button>
              )}

              {batches.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                  icon={<Trash2 className="w-3.5 h-3.5 text-[#F04438]" />}
                  className="hover:border-[#FDA29B] hover:text-[#B42318]"
                >
                  Clear History
                </Button>
              )}

              <Link to="/dashboard">
                <Button size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                  New Analysis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full">
        {/* Storage Error Alert */}
        {storageError && (
          <div className="p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{storageError}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadBatches}>
              Retry
            </Button>
          </div>
        )}

        {/* Top Cumulative Metrics Strip */}
        {batches.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
                <span>Total Batches</span>
                <Layers className="w-4 h-4 text-[#315EFB]" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-[#182230]">
                {metrics.totalBatches}
              </p>
              <span className="text-[11px] text-[#667085]">Saved in browser storage</span>
            </div>

            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
                <span>Addresses Analyzed</span>
                <Database className="w-4 h-4 text-[#667085]" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-[#182230]">
                {metrics.totalAddresses}
              </p>
              <span className="text-[11px] text-[#667085]">Cumulative email records</span>
            </div>

            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
                <span>Avg Deliverability</span>
                <ShieldCheck className="w-4 h-4 text-[#18794E]" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-[#027A48]">
                {metrics.deliverablePct}%
              </p>
              <span className="text-[11px] text-[#027A48]">
                {metrics.totalDeliverable} deliverable targets
              </span>
            </div>

            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
                <span>Problem Targets</span>
                <XCircle className="w-4 h-4 text-[#B42318]" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-[#B42318]">
                {metrics.totalBounce + metrics.totalUnknown}
              </p>
              <span className="text-[11px] text-[#667085]">
                {metrics.totalBounce} bounce &bull; {metrics.totalUnknown} unknown
              </span>
            </div>
          </div>
        )}

        {/* Toolbar: Search, Filter Tabs, Sort, Date */}
        {batches.length > 0 && (
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Field */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3]" />
                <input
                  type="text"
                  placeholder="Search by batch name or email address inside results..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#F8F9FC] border border-[#D0D5DD] rounded-xl text-[#182230] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#315EFB]/15 focus:border-[#315EFB]"
                />
              </div>

              {/* Controls: Date, Classification, Sort */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#667085]" />
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                    className="bg-[#F8F9FC] border border-[#D0D5DD] rounded-lg px-2.5 py-1 text-xs text-[#344054] focus:ring-1 focus:ring-[#315EFB] outline-none"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Past 24 Hours</option>
                    <option value="7days">Past 7 Days</option>
                    <option value="30days">Past 30 Days</option>
                  </select>
                </div>

                {/* Sort Option */}
                <div className="flex items-center gap-1.5 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#667085]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-[#F8F9FC] border border-[#D0D5DD] rounded-lg px-2.5 py-1 text-xs text-[#344054] focus:ring-1 focus:ring-[#315EFB] outline-none"
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="emails-desc">Most Addresses</option>
                    <option value="deliverable-desc">Highest Deliverability</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Classification Quick Filter Tabs */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#F2F4F7] overflow-x-auto text-xs">
              <span className="text-[#667085] text-[11px] font-medium mr-1">Filter Batches:</span>
              <button
                type="button"
                onClick={() => setClassificationFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  classificationFilter === 'all'
                    ? 'bg-[#182230] text-white'
                    : 'text-[#475467] hover:bg-[#F2F4F7]'
                }`}
              >
                All Batches ({batches.length})
              </button>
              <button
                type="button"
                onClick={() => setClassificationFilter('likely_to_be_delivered')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  classificationFilter === 'likely_to_be_delivered'
                    ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                    : 'text-[#475467] hover:bg-[#F2F4F7]'
                }`}
              >
                Has Deliverable
              </button>
              <button
                type="button"
                onClick={() => setClassificationFilter('likely_to_bounce')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  classificationFilter === 'likely_to_bounce'
                    ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                    : 'text-[#475467] hover:bg-[#F2F4F7]'
                }`}
              >
                Has Bounces
              </button>
              <button
                type="button"
                onClick={() => setClassificationFilter('unknown')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  classificationFilter === 'unknown'
                    ? 'bg-[#FFFAEB] text-[#9A6700] border border-[#FEDF89]'
                    : 'text-[#475467] hover:bg-[#F2F4F7]'
                }`}
              >
                Has Unknowns
              </button>
            </div>
          </div>
        )}

        {/* Batches List / Cards */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E4E7EC]">
            <div className="inline-block w-8 h-8 border-2 border-[#315EFB] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#667085]">Loading analysis history...</p>
          </div>
        ) : batches.length === 0 ? (
          /* Empty State: No history yet */
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#E4E7EC] shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F2F4F7] text-[#667085] flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#182230]">No Saved Analysis History</h3>
            <p className="text-xs text-[#667085] max-w-md mx-auto mt-1 mb-5">
              Deliverability analysis batches are automatically preserved in your browser localStorage
              once an analysis completes successfully.
            </p>
            <Link to="/dashboard">
              <Button size="md" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                Run Your First Analysis
              </Button>
            </Link>
          </div>
        ) : filteredBatches.length === 0 ? (
          /* Empty Filter State */
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-[#E4E7EC]">
            <p className="text-sm font-semibold text-[#182230]">No saved batches match your filters</p>
            <p className="text-xs text-[#667085] mt-1 mb-4">
              Try adjusting your search terms, date range, or classification filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setDateFilter('all');
                setClassificationFilter('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          /* Batch Cards Grid / Table */
          <div className="space-y-3">
            {filteredBatches.map((batch) => {
              const isSelectedForCompare = selectedForCompare.includes(batch.id);
              const formattedDate = new Date(batch.timestamp).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={batch.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:border-[#315EFB]/40 ${
                    isSelectedForCompare
                      ? 'border-[#315EFB] ring-2 ring-[#315EFB]/15 bg-[#F9FBFF]'
                      : 'border-[#E4E7EC]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Checkbox + Batch Title + Metadata */}
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelectedForCompare}
                        onChange={() => toggleCompareSelection(batch.id)}
                        title="Select for batch comparison"
                        className="mt-1 w-4 h-4 rounded border-[#D0D5DD] text-[#315EFB] focus:ring-[#315EFB] cursor-pointer"
                      />

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-[#182230] truncate font-mono">
                            {batch.name}
                          </h3>

                          {batch.source?.filename && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                              CSV: {batch.source.filename}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenRename(batch)}
                            className="p-1 text-[#98A2B3] hover:text-[#182230] rounded transition-colors"
                            title="Rename this batch"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085]">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-[#98A2B3]" />
                            {formattedDate}
                          </span>
                          {batch.duration_ms !== undefined && (
                            <span className="text-[11px] text-[#98A2B3]">
                              &bull; Duration: {batch.duration_ms}ms
                            </span>
                          )}
                          <span className="text-[11px] text-[#98A2B3]">
                            &bull; ID: {batch.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Classification Counts Badges */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F2F4F7] text-[#344054] border border-[#E4E7EC]">
                        <strong>{batch.summary.total_emails ?? batch.summary.total}</strong> addresses
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]">
                        <CheckCircle2 className="w-3 h-3 text-[#12B76A]" />
                        {batch.summary.likely_to_be_delivered} deliverable (
                        {batch.summary.deliverability_percentage ??
                          (((batch.summary.likely_to_be_delivered / ((batch.summary.total_emails ?? batch.summary.total) || 1)) * 100).toFixed(1))}%)
                      </span>

                      {batch.summary.likely_to_bounce > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
                          <XCircle className="w-3 h-3 text-[#F04438]" />
                          {batch.summary.likely_to_bounce} bounce
                        </span>
                      )}

                      {batch.summary.unknown > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFFAEB] text-[#9A6700] border border-[#FEDF89]">
                          <HelpCircle className="w-3 h-3 text-[#F79009]" />
                          {batch.summary.unknown} unknown
                        </span>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#F2F4F7]">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewBatch(batch)}
                        icon={<Eye className="w-3.5 h-3.5" />}
                        title="View original saved results in workspace without performing DNS lookups"
                      >
                        View Details
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportCsv(batch)}
                        icon={<Download className="w-3.5 h-3.5 text-[#475467]" />}
                        title="Download CSV report of this batch"
                      >
                        CSV
                      </Button>

                      <button
                        type="button"
                        onClick={() => setBatchToDelete(batch)}
                        className="p-2 text-[#98A2B3] hover:text-[#F04438] hover:bg-[#FEF3F2] rounded-lg transition-colors"
                        title="Delete this saved batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Rename Batch Modal */}
      {batchToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-[#182230]">Rename Analysis Batch</h3>
            <div>
              <label className="block text-xs font-medium text-[#475467] mb-1">Batch Name</label>
              <input
                type="text"
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                autoFocus
                className="w-full text-xs p-2.5 rounded-xl border border-[#D0D5DD] focus:border-[#315EFB] focus:ring-2 focus:ring-[#315EFB]/15 outline-none font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setBatchToRename(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmRename}>
                Save Name
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Batch Confirmation Modal */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-[#B42318]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold">Delete Saved Batch?</h3>
            </div>
            <p className="text-xs text-[#667085] leading-relaxed">
              Are you sure you want to delete batch &quot;<strong className="text-[#182230]">{batchToDelete.name}</strong>&quot; ({batchToDelete.summary.total_emails ?? batchToDelete.summary.total} records)? This action removes it from browser storage and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setBatchToDelete(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmDelete}
                className="bg-[#D92D20] hover:bg-[#B42318]"
              >
                Delete Batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-[#B42318]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold">Clear All Saved History?</h3>
            </div>
            <p className="text-xs text-[#667085] leading-relaxed">
              Are you sure you want to delete all {batches.length} saved batches ({metrics.totalAddresses} total email analysis records)? This will completely clear your local analysis history.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleClearAllHistory}
                className="bg-[#D92D20] hover:bg-[#B42318]"
              >
                Clear All History
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
