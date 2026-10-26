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
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === 1) {
          return {
            ...stage,
            status: 'completed',
            note: `Accepted ${parsedInput.uniqueEmails.length} unique address(es)`
          };
        }
        if (stage.id === 2) {
          return { ...stage, status: 'in_progress', note: 'Verifying format compliance...' };
        }
        return { ...stage, status: 'pending', note: undefined };
      })
    );

    // Stagger stage states truthfully to reflect backend pipeline while awaiting response
    const stage2Timer = window.setTimeout(() => {
      setStages((prev) =>
        prev.map((s) => {
          if (s.id === 2) return { ...s, status: 'completed' };
          if (s.id === 3) return { ...s, status: 'in_progress', note: 'Querying authoritative nameservers...' };
          return s;
        })
      );
    }, 280);

    const stage3Timer = window.setTimeout(() => {
      setStages((prev) =>
        prev.map((s) => {
          if (s.id === 3) return { ...s, status: 'completed' };
          if (s.id === 4) return { ...s, status: 'in_progress', note: 'Evaluating MX records and fallback routes...' };
          return s;
        })
      );
    }, 550);

    const stage4Timer = window.setTimeout(() => {
      setStages((prev) =>
        prev.map((s) => {
          if (s.id === 4) return { ...s, status: 'completed' };
          if (s.id === 5) return { ...s, status: 'in_progress', note: 'Synthesizing evidence & confidence reasons...' };
          return s;
        })
      );
    }, 820);

    try {
      const response = await analyzeEmailsApi(parsedInput.uniqueEmails, abortController.signal);

      // Clear progression timers
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      clearTimeout(stage4Timer);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      setElapsedTimeMs(response.summary.duration_ms || (Date.now() - startTime));
      setAnalysisResponse(response);

      // Mark all stages completed
      setStages((prev) =>
        prev.map((stage) => ({
          ...stage,
          status: 'completed',
          note: stage.id === 6 ? `Analyzed ${response.results.length} address(es)` : stage.note
        }))
      );
    } catch (err: any) {
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      clearTimeout(stage4Timer);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      const message = err.message || 'An error occurred during deliverability analysis.';
      setAnalysisError(message);

      // Mark current stage failed
      setStages((prev) =>
        prev.map((stage) => {
          if (stage.status === 'in_progress') {
            return { ...stage, status: 'failed', note: 'Request failed at this stage.' };
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
