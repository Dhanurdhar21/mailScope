import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  RotateCcw,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAnalysis } from '../hooks/useAnalysis';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { downloadCsvFile } from '../services/csvExport';
import { Button } from '../components/Button';
import { EmailInput } from '../components/EmailInput';
import { ProcessingTimeline } from '../components/ProcessingTimeline';
import { SummaryCard } from '../components/SummaryCard';
import { ResultsFilters } from '../components/ResultsFilters';
import { ResultsTable } from '../components/ResultsTable';
import { ResultDetails } from '../components/ResultDetails';
import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';

export const DashboardPage: React.FC = () => {
  const {
    inputText,
    setInputText,
    parsedInput,
    isAnalyzing,
    stages,
    analysisResponse,
    analysisError,
    elapsedTimeMs,
    selectedResult,
    setSelectedResult,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filteredResults,
    loadSampleData,
    clearInput,
    resetAnalysis,
    runAnalysis
  } = useAnalysis();

  const {
    status: healthStatus,
    healthData,
    errorMessage: healthError,
    retry: retryHealth,
    apiBaseUrl
  } = useBackendHealth();

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

  // CSV Export Handler
  const handleExportCsv = () => {
    if (!analysisResponse?.results || analysisResponse.results.length === 0) {
      addToast('error', 'Cannot export CSV: No analysis results available.');
      return;
    }
    const success = downloadCsvFile(analysisResponse.results, 'mailscope-report');
    if (success) {
      addToast(
        'success',
        `Successfully exported ${analysisResponse.results.length} record(s) to CSV.`
      );
    } else {
      addToast('error', 'Failed to generate CSV export file.');
    }
  };

  const hasResults = Boolean(analysisResponse && analysisResponse.results.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      {/* Toast notifications container */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Detail Inspection Modal */}
      <ResultDetails
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />

      {/* Dashboard Top Header */}
      <section className="bg-white border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title & Navigation */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#667085] hover:text-[#182230] transition-colors p-1 -ml-1 rounded focus:outline-none focus:ring-2 focus:ring-[#315EFB]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Home</span>
                </Link>
                <span className="text-[#D0D5DD]">&bull;</span>
                <span className="text-xs text-[#667085]">Analysis Workspace</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-[#182230]">
                Email Analysis
              </h1>
              <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
                Inspect syntax adherence, domain nameservers, and mail routing without sending test emails.
              </p>
            </div>

            {/* Real Backend Status Indicator */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                  healthStatus === 'connected'
                    ? 'bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]'
                    : healthStatus === 'checking'
                    ? 'bg-[#F8F9FC] border-[#E4E7EC] text-[#475467]'
                    : 'bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]'
                }`}
                title={
                  healthData
                    ? `Service: ${healthData.service} v${healthData.version} (DNS Resolver: ${healthData.dns_resolver})`
                    : undefined
                }
              >
                <div className="relative flex items-center justify-center">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      healthStatus === 'connected'
                        ? 'bg-[#12B76A]'
                        : healthStatus === 'checking'
                        ? 'bg-[#315EFB] animate-ping'
                        : 'bg-[#F04438]'
                    }`}
                  />
                  {healthStatus === 'connected' && (
                    <span className="absolute w-2 h-2 rounded-full bg-[#12B76A] animate-ping opacity-75" />
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="font-semibold capitalize leading-none">
                    {healthStatus === 'connected'
                      ? 'Backend Connected'
                      : healthStatus === 'checking'
                      ? 'Checking Backend...'
                      : 'Backend Unavailable'}
                  </span>
                  <span className="text-[10px] opacity-80 font-mono mt-0.5">
                    {apiBaseUrl} {healthData?.version ? `(v${healthData.version})` : ''}
                  </span>
                </div>

                {healthStatus === 'unavailable' && (
                  <button
                    onClick={retryHealth}
                    className="p-1 hover:bg-[#FECDCA] rounded transition-colors text-[#B42318]"
                    title="Retry connecting to backend"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Backend Unavailable Banner Alert */}
          {healthStatus === 'unavailable' && (
            <div className="mt-4 p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Backend service unreachable:</span>{' '}
                  {healthError || `Could not connect to ${apiBaseUrl}/health.`}{' '}
                  Please verify that the FastAPI backend is running.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={retryHealth}
                icon={<RefreshCw className="w-3 h-3" />}
                className="shrink-0 self-end sm:self-auto"
              >
                Retry Health Check
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        {/* Section 1: Input Panel */}
        <EmailInput
          inputText={inputText}
          onChange={setInputText}
          parsed={parsedInput}
          isAnalyzing={isAnalyzing}
          onAnalyze={runAnalysis}
          onLoadSample={loadSampleData}
          onClear={clearInput}
          hasResults={hasResults}
        />

        {/* Section 2: Processing Timeline (Shown during or after analysis) */}
        {(isAnalyzing || hasResults || analysisError) && (
          <ProcessingTimeline
            stages={stages}
            isAnalyzing={isAnalyzing}
            elapsedTimeMs={elapsedTimeMs}
            totalEmails={parsedInput.uniqueEmails.length}
            error={analysisError}
            onRetry={runAnalysis}
          />
        )}

        {/* Section 3: Results Area */}
        {hasResults && analysisResponse && (
          <div className="space-y-6 pt-4 border-t border-[#E4E7EC]/60 animate-in fade-in duration-300">
            {/* Results Header with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#182230]">
                  Analysis Results
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Real evidence retrieved from authoritative nameservers for {analysisResponse.results.length} address(es).
                </p>
              </div>

              {/* Action Buttons: Export CSV & New Analysis */}
              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  icon={<Download className="w-4 h-4 text-[#315EFB]" />}
                  title="Export results table to an RFC-compliant CSV file"
                >
                  Export CSV
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetAnalysis}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  title="Reset analysis workspace for a new batch"
                >
                  New Analysis
                </Button>
              </div>
            </div>

            {/* A. Summary Metrics Cards */}
            <SummaryCard
              summary={analysisResponse.summary}
              onFilterSelect={(cat) => setFilterCategory(cat)}
              activeFilter={filterCategory}
            />

            {/* B. Filter & Search Controls */}
            <ResultsFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterCategory={filterCategory}
              onFilterChange={setFilterCategory}
              totalCount={analysisResponse.results.length}
              filteredCount={filteredResults.length}
            />

            {/* C. Results Table or Filter Empty State */}
            {filteredResults.length > 0 ? (
              <ResultsTable
                results={filteredResults}
                onSelectResult={(item) => setSelectedResult(item)}
              />
            ) : (
              <EmptyState
                type="no_filter_match"
                title="No addresses match current filters"
                description={`No results found matching filter "${filterCategory}" and search query "${searchQuery}".`}
                actionText="Reset Filters"
                onAction={() => {
                  setFilterCategory('all');
                  setSearchQuery('');
                }}
              />
            )}
          </div>
        )}

        {/* Empty State before any analysis has been submitted */}
        {!hasResults && !isAnalyzing && !analysisError && (
          <div className="py-6">
            <EmptyState
              type="no_results"
              title="Awaiting email addresses"
              description="Enter one or more email addresses in the panel above and click 'Analyze Emails' to view syntax verification, domain lookup, and MX record evidence."
              actionText="Load Sample Email Dataset"
              onAction={loadSampleData}
            />
          </div>
        )}
      </main>
    </div>
  );
};
