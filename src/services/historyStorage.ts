/**
 * Analysis History Storage Service
 * Manages persistent storage of completed analysis batches in browser localStorage.
 * Versioned, validated, and quota-safe.
 */

import type { AnalyzeResponse } from '../types/analysis';
import type { StoredAnalysisBatch } from '../types/history';

export const HISTORY_STORAGE_KEY = 'mailscope_history_v1';
export const MAX_STORED_BATCHES = 50; // Cap to prevent exceeding localStorage 5MB browser quota

export class StorageError extends Error {
  public code: 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'VALIDATION_FAILED' | 'UNKNOWN';

  constructor(message: string, code: 'QUOTA_EXCEEDED' | 'UNAVAILABLE' | 'VALIDATION_FAILED' | 'UNKNOWN' = 'UNKNOWN') {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

/**
 * Checks if browser localStorage is supported in the environment.
 */
export function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'localStorage' in window && window.localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Validates whether an unknown object adheres to the StoredAnalysisBatch contract.
 */
export function isValidStoredBatch(item: unknown): item is StoredAnalysisBatch {
  if (!item || typeof item !== 'object') return false;
  const b = item as Record<string, unknown>;

  const summary = b.summary as Record<string, unknown> | undefined;
  const hasTotal =
    typeof summary?.total === 'number' ||
    typeof summary?.total_emails === 'number';

  return (
    typeof b.id === 'string' &&
    b.id.length > 0 &&
    typeof b.name === 'string' &&
    typeof b.timestamp === 'number' &&
    !isNaN(b.timestamp) &&
    Array.isArray(b.results) &&
    typeof b.summary === 'object' &&
    b.summary !== null &&
    hasTotal &&
    typeof summary?.likely_to_be_delivered === 'number'
  );
}

/**
 * Formats a user-friendly default batch name.
 */
export function generateDefaultBatchName(count: number, date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());

  return `Batch ${yyyy}-${mm}-${dd} ${hh}:${min} (${count} email${count === 1 ? '' : 's'})`;
}

/**
 * Retrieves all stored analysis batches from localStorage.
 * Gracefully ignores corrupted items, invalid JSON, or inaccessible storage.
 */
export function getHistory(): StoredAnalysisBatch[] {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('MailScope history storage corrupted (not an array). Reinitializing.');
      return [];
    }

    // Filter valid batches and normalize summary
    const validBatches: StoredAnalysisBatch[] = [];
    for (const item of parsed) {
      if (isValidStoredBatch(item)) {
        // Ensure summary properties align
        const s = item.summary as any;
        if (s.total === undefined && typeof s.total_emails === 'number') {
          s.total = s.total_emails;
        }
        if (s.total_emails === undefined && typeof s.total === 'number') {
          s.total_emails = s.total;
        }
        validBatches.push(item);
      }
    }

    return validBatches;
  } catch (err) {
    console.warn('Failed to read analysis history from localStorage:', err);
    return [];
  }
}

/**
 * Retrieves a single batch by ID.
 */
export function getBatchById(id: string): StoredAnalysisBatch | null {
  const history = getHistory();
  return history.find((b) => b.id === id) || null;
}

/**
 * Returns storage usage information.
 */
export function getStorageInfo(): { count: number; maxBatches: number } {
  const history = getHistory();
  return {
    count: history.length,
    maxBatches: MAX_STORED_BATCHES
  };
}

/**
 * Persists a newly completed analysis batch to localStorage.
 * Saves ONLY after successful API execution with usable results.
 */
export function saveBatch(
  response: AnalyzeResponse,
  name?: string,
  metadata?: { filename?: string; rowCount?: number }
): StoredAnalysisBatch {
  if (!isStorageAvailable()) {
    throw new StorageError('Browser local storage is not available or disabled.', 'UNAVAILABLE');
  }

  if (!response || !Array.isArray(response.results) || response.results.length === 0) {
    throw new StorageError('Cannot save empty or invalid analysis response to history.', 'VALIDATION_FAILED');
  }

  const timestamp = Date.now();
  const id = `batch_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;
  const defaultName = generateDefaultBatchName(response.results.length, new Date(timestamp));
  const batchName = name && name.trim().length > 0 ? name.trim() : defaultName;

  const durationMs = response.summary?.duration_ms ?? 0;

  const newBatch: StoredAnalysisBatch = {
    id,
    name: batchName,
    timestamp,
    duration_ms: durationMs,
    results: response.results,
    summary: {
      total: response.summary.total ?? response.results.length,
      likely_to_be_delivered: response.summary.likely_to_be_delivered ?? 0,
      likely_to_bounce: response.summary.likely_to_bounce ?? 0,
      unknown: response.summary.unknown ?? 0,
      duration_ms: durationMs,
      // Also provide total_emails for compatibility
      ...((response.summary as any).total_emails !== undefined
        ? { total_emails: (response.summary as any).total_emails }
        : { total_emails: response.results.length }),
      ...((response.summary as any).deliverability_percentage !== undefined
        ? { deliverability_percentage: (response.summary as any).deliverability_percentage }
        : {
            deliverability_percentage:
              response.results.length > 0
                ? Number(((response.summary.likely_to_be_delivered / response.results.length) * 100).toFixed(1))
                : 0
          })
    } as any,
    metadata: metadata
      ? {
          source: metadata.filename ? 'csv' : 'manual',
          filename: metadata.filename,
          totalImported: metadata.rowCount
        }
      : undefined
  };

  const existingHistory = getHistory();

  // Prepend new batch, cap to MAX_STORED_BATCHES to avoid filling quota
  const updatedHistory = [newBatch, ...existingHistory.filter((b) => b.id !== id)].slice(0, MAX_STORED_BATCHES);

  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    return newBatch;
  } catch (err: unknown) {
    if (err instanceof DOMException && (err.name === 'QuotaExceededError' || (err as any).code === 22)) {
      throw new StorageError(
        'Storage quota exceeded. Please delete older analysis batches in History to save new results.',
        'QUOTA_EXCEEDED'
      );
    }
    throw new StorageError(
      `Failed to save analysis batch to local storage: ${err instanceof Error ? err.message : String(err)}`,
      'UNKNOWN'
    );
  }
}

/**
 * Renames an existing batch.
 */
export function renameBatch(id: string, newName: string): StoredAnalysisBatch {
  if (!newName || newName.trim().length === 0) {
    throw new StorageError('Batch name cannot be empty.', 'VALIDATION_FAILED');
  }

  const history = getHistory();
  const index = history.findIndex((b) => b.id === id);
  if (index === -1) {
    throw new StorageError(`Batch with ID "${id}" not found.`, 'VALIDATION_FAILED');
  }

  history[index].name = newName.trim();

  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    return history[index];
  } catch (err: unknown) {
    throw new StorageError(`Failed to save renamed batch: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Deletes an individual batch from storage.
 */
export function deleteBatch(id: string): boolean {
  const history = getHistory();
  const updated = history.filter((b) => b.id !== id);

  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to delete batch:', err);
    return false;
  }
}

/**
 * Clears all analysis history after explicit confirmation.
 */
export function clearAllHistory(): boolean {
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    return true;
  } catch (err) {
    console.error('Failed to clear history:', err);
    return false;
  }
}

export const historyStorage = {
  saveBatch,
  getHistory,
  getBatchById,
  renameBatch,
  deleteBatch,
  clearAllHistory,
  getStorageInfo,
  isStorageAvailable
};

export default historyStorage;
