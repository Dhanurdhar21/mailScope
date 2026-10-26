/**
 * Types and interfaces for the MailScope Email Deliverability Analyzer
 */

export type ClassificationType = 'likely_to_be_delivered' | 'likely_to_bounce' | 'unknown';

export type DomainStatusType =
  | 'resolved'
  | 'nonexistent'
  | 'timeout'
  | 'no_mail_records'
  | 'not_checked'
  | 'unknown';

export type MxStatusType =
  | 'present'
  | 'none'
  | 'fallback_a_record'
  | 'timeout'
  | 'not_checked'
  | 'unknown';

export interface EmailDiagnostics {
  has_mx: boolean;
  has_fallback_a: boolean;
  mx_records: string[];
  is_disposable: boolean;
  syntax_error?: string | null;
  response_time_ms: number;
}

export interface EmailAnalysisResult {
  email: string;
  normalized_email: string;
  syntax_valid: boolean;
  domain: string;
  domain_status: DomainStatusType | string;
  mx_status: MxStatusType | string;
  classification: ClassificationType;
  reason: string;
  diagnostics?: EmailDiagnostics;
}

export interface SummaryMetrics {
  total: number;
  likely_to_be_delivered: number;
  likely_to_bounce: number;
  unknown: number;
  duration_ms: number;
}

export interface AnalyzeResponse {
  results: EmailAnalysisResult[];
  summary: SummaryMetrics;
}

export type TimelineStageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface TimelineStage {
  id: number;
  title: string;
  description: string;
  status: TimelineStageStatus;
  note?: string;
}

export type BackendConnectionStatus = 'connected' | 'unavailable' | 'checking' | 'unconfigured';

export interface BackendHealthResponse {
  status: string;
  service?: string;
  version?: string;
  timestamp?: number;
  dns_resolver?: string;
}

export type FilterCategory = 'all' | 'likely_to_be_delivered' | 'likely_to_bounce' | 'unknown';
