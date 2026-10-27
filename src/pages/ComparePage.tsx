import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  GitCompare,
  ArrowLeft,
  ArrowRight,
  Download,
  Search,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Minus
} from 'lucide-react';
import { historyStorage } from '../services/historyStorage';
import type { StoredAnalysisBatch, ComparisonReport, ComparisonRecordDiff, ChangeType } from '../types/history';
import { compareBatches, downloadComparisonCsvFile } from '../services/comparison';
import { StatusBadge } from '../components/StatusBadge';
import { ResultDetails } from '../components/ResultDetails';
import { Button } from '../components/Button';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import type { EmailAnalysisResult } from '../types/analysis';

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState<StoredAnalysisBatch[]>([]);
  const [selectedBatchAId, setSelectedBatchAId] = useState<string>('');
  const [selectedBatchBId, setSelectedBatchBId] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | ChangeType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<EmailAnalysisResult | null>(null);
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

  // Load available batches from storage
  useEffect(() => {
    const list = historyStorage.getHistory();
    setBatches(list);

    // Initial query params parsing
    const paramA = searchParams.get('batchA');
    const paramB = searchParams.get('batchB');

    if (list.length >= 2) {
      if (paramA && list.some((b) => b.id === paramA)) {
        setSelectedBatchAId(paramA);
      } else {
        setSelectedBatchAId(list[1]?.id || list[0].id);
      }

      if (paramB && list.some((b) => b.id === paramB)) {
        setSelectedBatchBId(paramB);
      } else {
        setSelectedBatchBId(list[0].id);
      }
    } else if (list.length === 1) {
      setSelectedBatchAId(list[0].id);
    }
  }, [searchParams]);

  // Retrieve batch objects
  const batchA = useMemo(
    () => batches.find((b) => b.id === selectedBatchAId) || null,
    [batches, selectedBatchAId]
  );
  const batchB = useMemo(
    () => batches.find((b) => b.id === selectedBatchBId) || null,
    [batches, selectedBatchBId]
  );

  // Compute differential report
  const comparisonReport: ComparisonReport | null = useMemo(() => {
    if (!batchA || !batchB) return null;
    if (batchA.id === batchB.id) return null;
    return compareBatches(batchA, batchB);
  }, [batchA, batchB]);

  // Filter diff records
  const filteredRecords = useMemo(() => {
    if (!comparisonReport) return [];

    let list = comparisonReport.records;

    if (activeFilter !== 'all') {
      list = list.filter((r) => r.changeType === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          r.notes.some((note) => note.toLowerCase().includes(q))
      );
    }

    return list;
  }, [comparisonReport, activeFilter, searchQuery]);

  // Handle batch selection changes
  const handleSelectBatchA = (id: string) => {
    setSelectedBatchAId(id);
    setSearchParams((prev) => {
      prev.set('batchA', id);
      return prev;
    });
  };

  const handleSelectBatchB = (id: string) => {
    setSelectedBatchBId(id);
    setSearchParams((prev) => {
      prev.set('batchB', id);
      return prev;
    });
  };

  // Export comparison CSV
  const handleExportComparisonCsv = () => {
    if (!comparisonReport) return;
    const success = downloadComparisonCsvFile(comparisonReport);
    if (success) {
      addToast(
        'success',
        `Successfully exported comparison report (${comparisonReport.records.length} records) to CSV.`
      );
    } else {
      addToast('error', 'Failed to generate comparison CSV.');
    }
  };

  // Inspect email result in drawer
  const handleInspect = (record: ComparisonRecordDiff) => {
    // Prefer record B result, or fallback to record A result
    const targetResult = record.resultB || record.resultA;
    if (targetResult) {
      setSelectedResult(targetResult);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Right Drawer for Inspection */}
      <ResultDetails
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
        isHistorical={true}
        savedAt={batchB?.timestamp || batchA?.timestamp}
      />

      {/* Header Bar */}
      <section className="bg-white border-b border-[#E4E7EC] sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#667085] mb-0.5">
                <Link
                  to="/history"
                  className="inline-flex items-center gap-1 font-medium hover:text-[#182230] transition-colors focus:outline-none focus:ring-1 focus:ring-[#315EFB] rounded p-0.5"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>History</span>
                </Link>
                <span>/</span>
                <span className="font-mono text-[#344054]">Batch Differential Comparison</span>
              </div>

              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#182230]">
                  Deliverability Comparison Engine
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#475467] border border-[#E4E7EC]">
                  Differential Audit
                </span>
              </div>
            </div>

            {/* Export & Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {comparisonReport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportComparisonCsv}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Export Comparison CSV
                </Button>
              )}

              <Link to="/history">
                <Button variant="ghost" size="sm">
                  Back to Archives
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full">
        {/* If fewer than 2 batches exist in storage */}
        {batches.length < 2 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#E4E7EC] shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#EFF8FF] text-[#315EFB] flex items-center justify-center mx-auto mb-3">
              <GitCompare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#182230]">
              At Least Two Saved Batches Required
            </h3>
            <p className="text-xs text-[#667085] max-w-md mx-auto mt-1 mb-5">
              Comparison evaluates differential changes (classification shifts, MX record updates,
              fallback changes) between two distinct analysis snapshots. You currently have{' '}
              {batches.length} batch in storage.
            </p>
            <Link to="/dashboard">
              <Button size="md" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                Analyze New Batch
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Batch Selectors Surface */}
            <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 sm:p-5 shadow-xs">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#344054] mb-3">
                Select Analysis Snapshots to Compare
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Batch A (Baseline / Older) */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC]">
                  <label className="block text-xs font-semibold text-[#475467]">
                    Baseline Snapshot (Batch A)
                  </label>
                  <select
                    value={selectedBatchAId}
                    onChange={(e) => handleSelectBatchA(e.target.value)}
                    className="w-full bg-white border border-[#D0D5DD] rounded-lg px-3 py-2 text-xs font-mono text-[#182230] focus:ring-2 focus:ring-[#315EFB]/20 focus:border-[#315EFB] outline-none"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.id === selectedBatchBId}>
                        {b.name} ({b.summary.total_emails} emails &bull;{' '}
                        {new Date(b.timestamp).toLocaleDateString()})
                        {b.id === selectedBatchBId ? ' — [Selected as Batch B]' : ''}
                      </option>
                    ))}
                  </select>
                  {batchA && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[#667085]">
                      <Clock className="w-3 h-3 text-[#98A2B3]" />
                      <span>{new Date(batchA.timestamp).toLocaleString()}</span>
                      <span>&bull;</span>
                      <span>{batchA.summary.likely_to_be_delivered} deliverable</span>
                    </div>
                  )}
                </div>

                {/* Batch B (Comparison / Newer) */}
                <div className="space-y-1.5 p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E4E7EC]">
                  <label className="block text-xs font-semibold text-[#475467]">
                    Comparison Snapshot (Batch B)
                  </label>
                  <select
                    value={selectedBatchBId}
                    onChange={(e) => handleSelectBatchB(e.target.value)}
                    className="w-full bg-white border border-[#D0D5DD] rounded-lg px-3 py-2 text-xs font-mono text-[#182230] focus:ring-2 focus:ring-[#315EFB]/20 focus:border-[#315EFB] outline-none"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.id === selectedBatchAId}>
                        {b.name} ({b.summary.total_emails} emails &bull;{' '}
                        {new Date(b.timestamp).toLocaleDateString()})
                        {b.id === selectedBatchAId ? ' — [Selected as Batch A]' : ''}
                      </option>
                    ))}
                  </select>
                  {batchB && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[#667085]">
                      <Clock className="w-3 h-3 text-[#98A2B3]" />
                      <span>{new Date(batchB.timestamp).toLocaleString()}</span>
                      <span>&bull;</span>
                      <span>{batchB.summary.likely_to_be_delivered} deliverable</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Same batch warning */}
              {selectedBatchAId === selectedBatchBId && (
                <div className="mt-3 p-3 rounded-xl bg-[#FFFAEB] border border-[#FEDF89] text-xs text-[#9A6700] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Cannot compare a batch to itself. Please select two different analysis snapshots.
                  </span>
                </div>
              )}
            </div>

            {/* Comparison Metrics & Deltas */}
            {comparisonReport && (
              <>
                {/* Side-by-Side Summary & Delta Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {/* Total Emails Delta */}
                  <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs">
                    <span className="text-[11px] text-[#667085] block">Total Targets</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-[#182230]">
                        {comparisonReport.batchB.summary.total_emails ?? comparisonReport.batchB.summary.total}
                      </span>
                      <span
                        className={`text-xs font-semibold flex items-center ${
                          comparisonReport.deltas.total_emails > 0
                            ? 'text-[#027A48]'
                            : comparisonReport.deltas.total_emails < 0
                            ? 'text-[#B42318]'
                            : 'text-[#667085]'
                        }`}
                      >
                        {comparisonReport.deltas.total_emails > 0 ? '+' : ''}
                        {comparisonReport.deltas.total_emails}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#667085] mt-1 block">
                      vs {comparisonReport.batchA.summary.total_emails ?? comparisonReport.batchA.summary.total} in Batch A
                    </span>
                  </div>

                  {/* Deliverability Rate Delta */}
                  <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs">
                    <span className="text-[11px] text-[#667085] block">Deliverability Rate</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-[#027A48]">
                        {comparisonReport.batchB.summary.deliverability_percentage ??
                          (comparisonReport.batchB.summary.total > 0
                            ? ((comparisonReport.batchB.summary.likely_to_be_delivered / comparisonReport.batchB.summary.total) * 100).toFixed(1)
                            : '0.0')}
                        %
                      </span>
                      <span
                        className={`text-xs font-semibold flex items-center ${
                          comparisonReport.deltas.deliverability_percentage > 0
                            ? 'text-[#027A48]'
                            : comparisonReport.deltas.deliverability_percentage < 0
                            ? 'text-[#B42318]'
                            : 'text-[#667085]'
                        }`}
                      >
                        {comparisonReport.deltas.deliverability_percentage > 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : comparisonReport.deltas.deliverability_percentage < 0 ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                        {comparisonReport.deltas.deliverability_percentage > 0 ? '+' : ''}
                        {comparisonReport.deltas.deliverability_percentage}%
                      </span>
                    </div>
                    <span className="text-[11px] text-[#027A48] mt-1 block">
                      {comparisonReport.deltas.likely_to_be_delivered > 0 ? '+' : ''}
                      {comparisonReport.deltas.likely_to_be_delivered} deliverable targets
                    </span>
                  </div>

                  {/* Bounce Delta */}
                  <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs">
                    <span className="text-[11px] text-[#667085] block">Likely Bounces</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-[#B42318]">
                        {comparisonReport.batchB.summary.likely_to_bounce}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          comparisonReport.deltas.likely_to_bounce > 0
                            ? 'text-[#B42318]'
                            : comparisonReport.deltas.likely_to_bounce < 0
                            ? 'text-[#027A48]'
                            : 'text-[#667085]'
                        }`}
                      >
                        {comparisonReport.deltas.likely_to_bounce > 0 ? '+' : ''}
                        {comparisonReport.deltas.likely_to_bounce}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#667085] mt-1 block">
                      vs {comparisonReport.batchA.summary.likely_to_bounce} in Batch A
                    </span>
                  </div>

                  {/* Changed / Modified Records */}
                  <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs">
                    <span className="text-[11px] text-[#667085] block">Detected Changes</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-[#175CD3]">
                        {comparisonReport.metrics.changedCount}
                      </span>
                      <span className="text-xs text-[#667085]">records</span>
                    </div>
                    <span className="text-[11px] text-[#667085] mt-1 block">
                      {comparisonReport.metrics.addedCount} added &bull;{' '}
                      {comparisonReport.metrics.removedCount} removed
                    </span>
                  </div>
                </div>

                {/* Toolbar: Filter Tabs & Search */}
                <div className="bg-white border border-[#E4E7EC] rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('all')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          activeFilter === 'all'
                            ? 'bg-[#182230] text-white shadow-xs'
                            : 'text-[#475467] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        All Records ({comparisonReport.records.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('changed')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          activeFilter === 'changed'
                            ? 'bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]'
                            : 'text-[#475467] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        Changed ({comparisonReport.metrics.changedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('unchanged')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          activeFilter === 'unchanged'
                            ? 'bg-[#F2F4F7] text-[#182230]'
                            : 'text-[#475467] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        Unchanged ({comparisonReport.metrics.unchangedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('added')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          activeFilter === 'added'
                            ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
                            : 'text-[#475467] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        Added in B ({comparisonReport.metrics.addedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('removed')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          activeFilter === 'removed'
                            ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                            : 'text-[#475467] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        Removed in B ({comparisonReport.metrics.removedCount})
                      </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3]" />
                      <input
                        type="text"
                        placeholder="Search addresses or notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F9FC] border border-[#D0D5DD] rounded-xl text-[#182230] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#315EFB]/15 focus:border-[#315EFB]"
                      />
                    </div>
                  </div>
                </div>

                {/* Diff Records Table */}
                <div className="bg-white border border-[#E4E7EC] rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#F8F9FC] border-b border-[#E4E7EC] text-[#475467]">
                        <tr>
                          <th className="py-3 px-4">Email Address</th>
                          <th className="py-3 px-4">Classification Shift</th>
                          <th className="py-3 px-4">Domain &amp; MX State</th>
                          <th className="py-3 px-4">Technical Findings</th>
                          <th className="py-3 px-4 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2F4F7]">
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-[#667085] font-sans">
                              No records match current filter &quot;{activeFilter}&quot;
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map((rec) => {
                            const isChanged = rec.changeType === 'changed';
                            const isAdded = rec.changeType === 'added';
                            const isRemoved = rec.changeType === 'removed';

                            return (
                              <tr
                                key={rec.email}
                                className={`transition-colors ${
                                  isChanged
                                    ? 'bg-[#FEF6EE]/30 hover:bg-[#FEF6EE]/60'
                                    : isAdded
                                    ? 'bg-[#ECFDF3]/20 hover:bg-[#ECFDF3]/40'
                                    : isRemoved
                                    ? 'bg-[#FEF3F2]/20 hover:bg-[#FEF3F2]/40'
                                    : 'hover:bg-[#F8F9FC]'
                                }`}
                              >
                                {/* Email */}
                                <td className="py-3 px-4 font-medium text-[#182230]">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        isChanged
                                          ? 'bg-[#F79009]'
                                          : isAdded
                                          ? 'bg-[#12B76A]'
                                          : isRemoved
                                          ? 'bg-[#F04438]'
                                          : 'bg-[#98A2B3]'
                                      }`}
                                    />
                                    <span className="truncate max-w-xs">{rec.email}</span>
                                  </div>
                                </td>

                                {/* Classification Shift */}
                                <td className="py-3 px-4 font-sans">
                                  {isAdded ? (
                                    <div className="flex items-center gap-1.5 text-xs text-[#027A48]">
                                      <span className="text-[11px] text-[#667085] italic">
                                        (new in B)
                                      </span>
                                      <StatusBadge
                                        type="classification"
                                        value={rec.resultB?.classification || 'unknown'}
                                        size="sm"
                                      />
                                    </div>
                                  ) : isRemoved ? (
                                    <div className="flex items-center gap-1.5 text-xs text-[#B42318]">
                                      <StatusBadge
                                        type="classification"
                                        value={rec.resultA?.classification || 'unknown'}
                                        size="sm"
                                      />
                                      <span className="text-[11px] text-[#667085] italic">
                                        (removed in B)
                                      </span>
                                    </div>
                                  ) : rec.classificationChanged ? (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <StatusBadge
                                        type="classification"
                                        value={rec.resultA?.classification || 'unknown'}
                                        size="sm"
                                      />
                                      <ArrowRight className="w-3.5 h-3.5 text-[#667085] shrink-0" />
                                      <StatusBadge
                                        type="classification"
                                        value={rec.resultB?.classification || 'unknown'}
                                        size="sm"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-[#667085]">
                                      <StatusBadge
                                        type="classification"
                                        value={rec.resultB?.classification || 'unknown'}
                                        size="sm"
                                      />
                                      <span className="text-[10px] text-[#98A2B3]">(unchanged)</span>
                                    </div>
                                  )}
                                </td>

                                {/* Domain & MX State Shift */}
                                <td className="py-3 px-4 font-sans text-xs">
                                  {rec.domainStatusChanged ? (
                                    <div className="text-[11px] text-[#B42318] font-medium">
                                      Domain: {rec.resultA?.domain_status} &rarr;{' '}
                                      {rec.resultB?.domain_status}
                                    </div>
                                  ) : (
                                    <span className="text-[#667085] text-[11px]">
                                      {rec.resultB?.domain_status || rec.resultA?.domain_status}
                                    </span>
                                  )}
                                  {rec.mxStatusChanged && (
                                    <div className="text-[11px] text-[#B42318] font-medium">
                                      MX: {rec.resultA?.mx_status} &rarr; {rec.resultB?.mx_status}
                                    </div>
                                  )}
                                </td>

                                {/* Technical Notes / MX Shifts */}
                                <td className="py-3 px-4 font-sans text-xs text-[#475467] max-w-sm">
                                  {rec.notes.length > 0 ? (
                                    <ul className="space-y-1">
                                      {rec.notes.map((note, idx) => (
                                        <li
                                          key={idx}
                                          className={`text-[11px] leading-tight ${
                                            note.includes('DNS Timeout')
                                              ? 'text-[#B54708] font-medium'
                                              : note.includes('changed')
                                              ? 'text-[#B42318] font-medium'
                                              : 'text-[#475467]'
                                          }`}
                                        >
                                          &bull; {note}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-[#98A2B3] text-[11px]">
                                      Identical DNS routing and syntax results
                                    </span>
                                  )}
                                </td>

                                {/* Inspect Button */}
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleInspect(rec)}
                                    className="p-1.5 text-[#315EFB] hover:bg-[#EFF8FF] rounded-lg transition-colors text-xs font-sans font-semibold inline-flex items-center gap-1"
                                    title="View Domain Intelligence Dossier"
                                  >
                                    Inspect
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};
