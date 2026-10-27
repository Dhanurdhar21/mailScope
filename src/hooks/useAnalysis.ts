import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  AnalyzeResponse,
  EmailAnalysisResult,
  FilterCategory,
  TimelineStage
} from '../types/analysis';
import { parseEmailInput, SAMPLE_EMAILS } from '../services/emailParser';
import type { ParsedEmailResult } from '../services/emailParser';
import { analyzeEmailsApi } from '../services/api';

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
    setAnalysisError(null);
  }, []);

  // Clear Input
  const clearInput = useCallback(() => {
    setInputText('');
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
  }, []);

  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (parsedInput.uniqueEmails.length === 0 || isAnalyzing) {
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

    const startTime = Date.now();
    timerIntervalRef.current = window.setInterval(() => {
      setElapsedTimeMs(Date.now() - startTime);
    }, 80);

    // Initial stage update: Stage 1 completed (input accepted and normalized)
    // Stages 2-5 are marked in_progress as the unified backend pipeline runs
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === 1) {
          return {
            ...stage,
            status: 'completed',
            note: `Accepted ${parsedInput.uniqueEmails.length} unique address(es)`
          };
        }
        if (stage.id >= 2 && stage.id <= 5) {
          return { ...stage, status: 'in_progress', note: 'Analysis pipeline in progress...' };
        }
        return { ...stage, status: 'pending', note: undefined };
      })
    );

    try {
      const response = await analyzeEmailsApi(parsedInput.uniqueEmails, abortController.signal);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      setElapsedTimeMs(response.summary.duration_ms || (Date.now() - startTime));
      setAnalysisResponse(response);

      // Mark all stages completed with verified details from the actual response
      setStages((prev) =>
        prev.map((stage) => {
          if (stage.id === 1) {
            return { ...stage, status: 'completed', note: `Accepted ${parsedInput.uniqueEmails.length} unique address(es)` };
          }
          if (stage.id === 2) {
            return { ...stage, status: 'completed', note: `Validated ${response.results.length} addresses against RFC 5321/5322 syntax` };
          }
          if (stage.id === 3) {
            return { ...stage, status: 'completed', note: `Authoritative DNS inspected with concurrency control` };
          }
          if (stage.id === 4) {
            return { ...stage, status: 'completed', note: `Evaluated MX routing and fallback records` };
          }
          if (stage.id === 5) {
            return {
              ...stage,
              status: 'completed',
              note: `${response.summary.likely_to_be_delivered} deliverable, ${response.summary.likely_to_bounce} bounce, ${response.summary.unknown} unknown`
            };
          }
          if (stage.id === 6) {
            return { ...stage, status: 'completed', note: `Completed in ${response.summary.duration_ms}ms` };
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
      setAnalysisError(message);

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
  }, [parsedInput.uniqueEmails, isAnalyzing]);

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
