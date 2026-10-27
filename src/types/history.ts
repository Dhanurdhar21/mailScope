/**
 * Type definitions for MailScope Analysis History & Comparison
 */

import type { EmailAnalysisResult, SummaryMetrics } from './analysis';

export interface StoredAnalysisBatch {
  id: string;
  name: string;
  timestamp: number;
  duration_ms: number;
  results: EmailAnalysisResult[];
  summary: SummaryMetrics & {
    total_emails?: number;
    deliverability_percentage?: number;
  };
  metadata?: {
    source?: 'manual' | 'csv';
    filename?: string;
    totalImported?: number;
  };
  source?: {
    filename?: string;
    rowCount?: number;
  };
}

export type ChangeType =
  | 'unchanged'
  | 'changed'
  | 'classification_changed'
  | 'domain_status_changed'
  | 'mx_status_changed'
  | 'mx_records_changed'
  | 'added'
  | 'removed';

export interface ComparisonRecordDiff {
  email: string;
  domain: string;
  status: 'changed' | 'unchanged' | 'added' | 'removed';
  changeType: 'changed' | 'unchanged' | 'added' | 'removed';
  changeTypes: ChangeType[];
  isDnsTimeoutChange: boolean;
  baseline?: EmailAnalysisResult;
  current?: EmailAnalysisResult;
  resultA?: EmailAnalysisResult;
  resultB?: EmailAnalysisResult;
  classificationChanged: boolean;
  domainStatusChanged: boolean;
  mxStatusChanged: boolean;
  mxRecordsChanged: boolean;
  notes: string[];
}

export interface ComparisonReport {
  batchA: {
    id: string;
    name: string;
    timestamp: number;
    summary: SummaryMetrics;
  };
  batchB: {
    id: string;
    name: string;
    timestamp: number;
    summary: SummaryMetrics;
  };
  comparedAt: number;
  totalUniqueEmails: number;
  counts: {
    changed: number;
    unchanged: number;
    added: number;
    removed: number;
  };
  metrics: {
    changedCount: number;
    unchangedCount: number;
    addedCount: number;
    removedCount: number;
  };
  classificationDeltas: {
    likely_to_be_delivered: number;
    likely_to_bounce: number;
    unknown: number;
  };
  deltas: {
    total_emails: number;
    deliverability_percentage: number;
    likely_to_be_delivered: number;
    likely_to_bounce: number;
    unknown: number;
  };
  diffs: ComparisonRecordDiff[];
  records: ComparisonRecordDiff[];
}
