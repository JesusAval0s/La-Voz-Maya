export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface SyncState {
  pendingCount: number;
  isOnline: boolean;
  status: SyncStatus;
  lastSyncDate?: Date;
}