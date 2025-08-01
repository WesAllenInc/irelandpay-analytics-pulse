// Enhanced Sync System Types
// These types support the comprehensive sync monitoring and progress tracking system

export type SyncType = 'initial' | 'daily' | 'manual' | 'historical';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type SyncTrigger = 'schedule' | 'manual' | 'api' | 'setup';
export type ItemType = 'merchant' | 'transaction' | 'residual' | 'volume';

export interface SyncJob {
  id: string;
  sync_type: SyncType;
  status: SyncStatus;
  started_at: string;
  completed_at?: string;
  triggered_by: SyncTrigger;
  triggered_by_user_id?: string;
  progress: Record<string, any>;
  results: Record<string, any>;
  error_details?: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SyncProgress {
  sync_id: string;
  phase: string;
  progress: number;
  message?: string;
  details: Record<string, any>;
  last_update: string;
}

export interface SyncFailedItem {
  id: string;
  sync_id: string;
  item_type: ItemType;
  item_id: string;
  error_details: Record<string, any>;
  retry_count: number;
  last_retry_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ActiveSyncJob extends SyncJob {
  phase?: string;
  progress_percentage?: number;
  message?: string;
  progress_updated_at?: string;
  duration_seconds?: number;
}

export interface SyncJobHistory extends SyncJob {
  duration_seconds?: number;
  outcome: 'success' | 'error' | 'cancelled';
}

export interface SyncFailureSummary {
  item_type: ItemType;
  failure_count: number;
  unresolved_count: number;
  last_failure?: string;
  avg_retry_count: number;
}

// Progress tracking types
export interface SyncProgressUpdate {
  phase: string;
  progress: number;
  message?: string;
  details?: Record<string, any>;
}

export interface SyncProgressDetails {
  merchants?: number;
  transactions?: number;
  residuals?: number;
  volumes?: number;
  errors?: number;
  current_item?: string;
  total_items?: number;
  processed_items?: number;
}

// Error recovery types
export interface FailedSyncItem {
  item_type: ItemType;
  item_id: string;
  error: Error | string;
  context?: Record<string, any>;
}

export interface RecoveryResult {
  syncId: string;
  recoveredCount: number;
  failedCount: number;
  permanentFailures: FailedSyncItem[];
}

// Sync results types
export interface SyncStats {
  merchantsCount: number;
  transactionsCount: number;
  residualsCount: number;
  volumesCount: number;
  errors: string[];
  duration: number;
  startTime: Date;
  endTime?: Date;
}

export interface DailySyncResult {
  syncId: string;
  startTime: Date;
  endTime?: Date;
  merchants: {
    new: number;
    updated: number;
    errors: number;
  };
  transactions: {
    count: number;
    errors: number;
  };
  residuals: {
    count: number;
    errors: number;
  };
  success: boolean;
  errors: string[];
}

export interface HistoricalSyncResult {
  months: Array<{
    period: string;
    transactions: number;
    residuals: number;
    success: boolean;
    error?: string;
  }>;
  totalMerchants: number;
  totalTransactions: number;
  totalResiduals: number;
  errors: Array<{
    period?: string;
    phase?: string;
    error: string;
  }>;
  startTime: Date;
  endTime?: Date;
}

// Circuit breaker types
export interface CircuitBreakerState {
  failures: number;
  lastFailureTime?: Date;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// API client types
export interface IrelandPayCRMConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
}

export interface SyncManagerConfig {
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
  progressUpdateInterval?: number;
}

// Database function types
export interface CreateSyncJobParams {
  sync_type: SyncType;
  triggered_by: SyncTrigger;
  triggered_by_user_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateSyncProgressParams {
  sync_id: string;
  phase: string;
  progress: number;
  message?: string;
  details?: Record<string, any>;
}

export interface CompleteSyncJobParams {
  sync_id: string;
  status: SyncStatus;
  results?: Record<string, any>;
  error_details?: Record<string, any>;
}

export interface AddFailedItemParams {
  sync_id: string;
  item_type: ItemType;
  item_id: string;
  error_details: Record<string, any>;
} 