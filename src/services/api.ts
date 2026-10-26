/**
 * API Client Service for MailScope
 * Integrates with FastAPI backend using VITE_API_BASE_URL.
 */

import type {
  AnalyzeResponse,
  BackendHealthResponse,
  EmailAnalysisResult,
  SummaryMetrics
} from '../types/analysis';

// Retrieve base URL from environment variable, default to http://localhost:8000
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export class ApiError extends Error {
  public status?: number;
  public details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Checks the real backend /health endpoint.
 */
export async function checkBackendHealth(signal?: AbortSignal): Promise<BackendHealthResponse> {
  const endpoint = `${API_BASE_URL}/health`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal
    });

    if (!res.ok) {
      throw new ApiError(`Health check returned status HTTP ${res.status}`, res.status);
    }

    const data = await res.json();
    return data as BackendHealthResponse;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      `Cannot connect to MailScope API at ${API_BASE_URL}. Ensure the backend service is running and CORS is configured.`,
      0,
      err
    );
  }
}

/**
 * Submits email batch to /api/analyze and normalizes the response.
 */
export async function analyzeEmailsApi(
  emails: string[],
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  const endpoint = `${API_BASE_URL}/api/analyze`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ emails }),
      signal
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status} error`;
      try {
        const errorJson = await res.json();
        if (errorJson?.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fallback to text status
        errorDetail = res.statusText || errorDetail;
      }
      throw new ApiError(errorDetail, res.status);
    }

    const json = await res.json();
    return normalizeAnalyzeResponse(json, emails);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      `Network or server connection failed while reaching ${endpoint}. Please verify backend status.`,
      0,
      err
    );
  }
}

/**
 * Adapter to safely normalize any unexpected payload variation from the backend.
 */
function normalizeAnalyzeResponse(raw: any, submittedEmails: string[]): AnalyzeResponse {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('Received invalid or non-object response from the analysis backend.');
  }

  const rawResults: any[] = Array.isArray(raw.results) ? raw.results : [];
  
  const normalizedResults: EmailAnalysisResult[] = rawResults.map((item, index) => {
    const email = String(item.email || submittedEmails[index] || 'unknown');
    const classification = ['likely_to_be_delivered', 'likely_to_bounce', 'unknown'].includes(item.classification)
      ? item.classification
      : 'unknown';

    return {
      email,
      normalized_email: String(item.normalized_email || email.toLowerCase()),
      syntax_valid: Boolean(item.syntax_valid),
      domain: String(item.domain || ''),
      domain_status: String(item.domain_status || 'unknown'),
      mx_status: String(item.mx_status || 'unknown'),
      classification,
      reason: String(item.reason || 'No diagnostic reason supplied.'),
      diagnostics: item.diagnostics
        ? {
            has_mx: Boolean(item.diagnostics.has_mx),
            has_fallback_a: Boolean(item.diagnostics.has_fallback_a),
            mx_records: Array.isArray(item.diagnostics.mx_records) ? item.diagnostics.mx_records : [],
            is_disposable: Boolean(item.diagnostics.is_disposable),
            syntax_error: item.diagnostics.syntax_error || null,
            response_time_ms: Number(item.diagnostics.response_time_ms || 0)
          }
        : undefined
    };
  });

  // Calculate actual summary if not fully provided
  const delivered = normalizedResults.filter((r) => r.classification === 'likely_to_be_delivered').length;
  const bounced = normalizedResults.filter((r) => r.classification === 'likely_to_bounce').length;
  const unknown = normalizedResults.filter((r) => r.classification === 'unknown').length;

  const summary: SummaryMetrics = {
    total: raw.summary?.total ?? normalizedResults.length,
    likely_to_be_delivered: raw.summary?.likely_to_be_delivered ?? delivered,
    likely_to_bounce: raw.summary?.likely_to_bounce ?? bounced,
    unknown: raw.summary?.unknown ?? unknown,
    duration_ms: Number(raw.summary?.duration_ms ?? 0)
  };

  return {
    results: normalizedResults,
    summary
  };
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
