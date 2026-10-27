import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  AnalyzeResponse,
  EmailAnalysisResult,
  FilterCategory,
  TimelineStage
} from '../types/analysis';
import type { StoredAnalysisBatch } from '../types/history';
import { parseEmailInput, SAMPLE_EMAILS } from '../services/emailParser';
import type { ParsedEmailResult } from '../services/emailParser';
import { analyzeEmailsApi } from '../services/api';
import { historyStorage } from '../services/historyStorage';

const INITIAL_STAGES: TimelineStage[] = [
  {
    id: 1,
    title: 'Input Received',
    description: 'The application accepts and normalizes the supplied addresses.',
    status: 'pending'
  },
  {
    id: 2,
    title: 'Syntax Analysis',
    description: 'The backend checks whether each address follows the accepted email syntax rules.',
    status: 'pending'
  },
  {
    id: 3,
    title: 'Domain Lookup',
    description: 'The backend checks the relevant domain and its DNS information.',
    status: 'pending'
  },
  {
    id: 4,
    title: 'Mail Routing Analysis',
    description: 'The backend examines MX records and applicable fallback-routing evidence where appropriate.',
    status: 'pending'
  },
  {
    id: 5,
    title: 'Classification',
    description: 'The backend combines the available evidence and returns a result with an explanation.',
    status: 'pending'
  },
  {
    id: 6,
    title: 'Results Ready',
    description: 'The interface displays the completed analysis.',
    status: 'pending'
  }
];

export function useAnalysis() {
  const [inputText, setInputText] = useState<string>('');
  const [batchName, setBatchName] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [lastSavedBatchId, setLastSavedBatchId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [stages, setStages] = useState<TimelineStage[]>(INITIAL_STAGES);
  const [analysisResponse, setAnalysisResponse] = useState<AnalyzeResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [selectedResult, setSelectedResult] = useState<EmailAnalysisResult | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Real-time input parsing
  const parsedInput: ParsedEmailResult = useMemo(() => {
    return parseEmailInput(inputText);
  }, [inputText]);

  // Load Sample Data
  const loadSampleData = useCallback(() => {
    setInputText(SAMPLE_EMAILS);
    setBatchName('Sample Deliverability Test');
    setCsvFileName(null);
    setAnalysisError(null);
  }, []);

  // Clear Input
  const clearInput = useCallback(() => {
    setInputText('');
    setBatchName('');
    setCsvFileName(null);
    setAnalysisError(null);
  }, []);

  // Handle CSV loaded from uploader
  const handleCsvLoaded = useCallback((emails: string[], filename: string) => {
    setInputText(emails.join('\n'));
    setCsvFileName(filename);
    const defaultName = filename.replace(/\.(csv|txt)$/i, '');
    setBatchName(`CSV: ${defaultName}`);
    setAnalysisError(null);
  }, []);

  // Reset for new analysis
  const resetAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsAnalyzing(false);
    setStages(INITIAL_STAGES);
    setAnalysisResponse(null);
    setAnalysisError(null);
    setSelectedResult(null);
    setSearchQuery('');
    setFilterCategory('all');
    setElapsedTimeMs(0);
    setLastSavedBatchId(null);
  }, []);

  // Load a historical batch into workspace (NO new DNS queries)
  const loadHistoricalBatch = useCallback((batch: StoredAnalysisBatch) => {
    resetAnalysis();
    setAnalysisResponse({
      results: batch.results,
      summary: batch.summary
    });
    setBatchName(batch.name);
    setLastSavedBatchId(batch.id);
    setElapsedTimeMs(batch.duration_ms || 0);
    setStages(
      INITIAL_STAGES.map((s) => ({
        ...s,
        status: 'completed',
        note: `Snapshot "${batch.name}" (${new Date(batch.timestamp).toLocaleDateString()})`
      }))
    );
  }, [resetAnalysis]);

  // Run analysis (with automatic sequential chunking for batches > 200)
  const runAnalysis = useCallback(async () => {
    const emails = parsedInput.uniqueEmails;
    if (emails.length === 0 || isAnalyzing) {
      return;
    }

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResponse(null);
    setSelectedResult(null);
    setElapsedTimeMs(0);
    setLastSavedBatchId(null);

    const startTime = Date.now();
    timerIntervalRef.current = window.setInterval(() => {
      setElapsedTimeMs(Date.now() - startTime);
    }, 80);

    const CHUNK_SIZE = 200;
    const chunkCount = Math.ceil(emails.length / CHUNK_SIZE);

    // Initial stage update: Stage 1 completed
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === 1) {
          return {
            ...stage,
            status: 'completed',
            note: `Accepted ${emails.length} unique address(es)${chunkCount > 1 ? ` across ${chunkCount} chunks` : ''}`
          };
        }
        if (stage.id >= 2 && stage.id <= 5) {
          return {
            ...stage,
            status: 'in_progress',
            note: chunkCount > 1 ? `Processing chunk 1 of ${chunkCount}...` : 'Analysis pipeline in progress...'
          };
        }
        return { ...stage, status: 'pending', note: undefined };
      })
    );

    const aggregatedResults: EmailAnalysisResult[] = [];
    let totalApiDurationMs = 0;

    try {
      for (let c = 0; c < chunkCount; c++) {
        const chunkEmails = emails.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);

        if (chunkCount > 1) {
          setStages((prev) =>
            prev.map((stage) => {
              if (stage.id >= 2 && stage.id <= 5) {
                return {
                  ...stage,
                  status: 'in_progress',
                  note: `Analyzing chunk ${c + 1} of ${chunkCount} (${aggregatedResults.length}/${emails.length} addresses processed)...`
                };
              }
              return stage;
            })
          );
        }

        const chunkResponse = await analyzeEmailsApi(chunkEmails, abortController.signal);
        aggregatedResults.push(...chunkResponse.results);
        totalApiDurationMs += chunkResponse.summary.duration_ms || 0;
      }

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      const totalDuration = totalApiDurationMs || (Date.now() - startTime);
      setElapsedTimeMs(totalDuration);

      // Compute combined summary
      const delivered = aggregatedResults.filter((r) => r.classification === 'likely_to_be_delivered').length;
      const bounce = aggregatedResults.filter((r) => r.classification === 'likely_to_bounce').length;
      const unknown = aggregatedResults.filter((r) => r.classification === 'unknown').length;
      const deliverabilityPct =
        aggregatedResults.length > 0
          ? Number(((delivered / aggregatedResults.length) * 100).toFixed(1))
          : 0;

      const finalResponse: AnalyzeResponse = {
        results: aggregatedResults,
        summary: {
          total: aggregatedResults.length,
          total_emails: aggregatedResults.length,
          likely_to_be_delivered: delivered,
          likely_to_bounce: bounce,
          unknown: unknown,
          deliverability_percentage: deliverabilityPct,
          duration_ms: totalDuration
        }
      };

      setAnalysisResponse(finalResponse);

      // Save to localStorage history
      try {
        const saved = historyStorage.saveBatch(
          finalResponse,
          batchName.trim() || undefined,
          csvFileName ? { filename: csvFileName, rowCount: emails.length } : undefined
        );
        setLastSavedBatchId(saved.id);
      } catch (storageErr) {
        console.warn('Storage persistence warning:', storageErr);
      }

      // Mark all stages completed
      setStages((prev) =>
        prev.map((stage) => {
          if (stage.id === 1) {
            return {
              ...stage,
              status: 'completed',
              note: `Accepted ${emails.length} unique address(es)`
            };
          }
          if (stage.id === 2) {
            return {
              ...stage,
              status: 'completed',
              note: `Validated ${aggregatedResults.length} addresses against RFC 5321/5322 syntax`
            };
          }
          if (stage.id === 3) {
            return {
              ...stage,
              status: 'completed',
              note: `Authoritative DNS inspected with concurrency control`
            };
          }
          if (stage.id === 4) {
            return {
              ...stage,
              status: 'completed',
              note: `Evaluated MX routing and fallback records`
            };
          }
          if (stage.id === 5) {
            return {
              ...stage,
              status: 'completed',
              note: `${delivered} deliverable, ${bounce} bounce, ${unknown} unknown`
            };
          }
          if (stage.id === 6) {
            return {
              ...stage,
              status: 'completed',
              note: `Completed in ${totalDuration}ms`
            };
          }
          return { ...stage, status: 'completed' };
        })
      );
    } catch (err: any) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      const message = err.message || 'An error occurred during deliverability analysis.';
      
      // If we got partial results from completed chunks, keep them
      if (aggregatedResults.length > 0) {
        const delivered = aggregatedResults.filter((r) => r.classification === 'likely_to_be_delivered').length;
        const bounce = aggregatedResults.filter((r) => r.classification === 'likely_to_bounce').length;
        const unknown = aggregatedResults.filter((r) => r.classification === 'unknown').length;
        const partialResponse: AnalyzeResponse = {
          results: aggregatedResults,
          summary: {
            total: aggregatedResults.length,
            total_emails: aggregatedResults.length,
            likely_to_be_delivered: delivered,
            likely_to_bounce: bounce,
            unknown: unknown,
            deliverability_percentage: Number(((delivered / aggregatedResults.length) * 100).toFixed(1)),
            duration_ms: totalApiDurationMs || (Date.now() - startTime)
          }
        };
        setAnalysisResponse(partialResponse);
        setAnalysisError(
          `Analysis partially completed: ${aggregatedResults.length} of ${emails.length} addresses processed. Network error: ${message}`
        );
      } else {
        setAnalysisError(message);
      }

      // Mark in-progress stages as failed
      setStages((prev) =>
        prev.map((stage) => {
          if (stage.status === 'in_progress') {
            return { ...stage, status: 'failed', note: message };
          }
          return stage;
        })
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [parsedInput.uniqueEmails, isAnalyzing, batchName, csvFileName]);

  // Filtered and searched results
  const filteredResults = useMemo(() => {
    if (!analysisResponse?.results) return [];

    let list = analysisResponse.results;

    // Filter by classification
    if (filterCategory !== 'all') {
      list = list.filter((r) => r.classification === filterCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          r.domain.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }

    return list;
  }, [analysisResponse, filterCategory, searchQuery]);

  return {
    inputText,
    setInputText,
    batchName,
    setBatchName,
    csvFileName,
    handleCsvLoaded,
    lastSavedBatchId,
    loadHistoricalBatch,
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
  };
}
