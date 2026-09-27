import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SyncState } from '../models/sync.model';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private _syncState$ = new BehaviorSubject<SyncState>({
    pendingCount: 2,
    isOnline: navigator.onLine,
    status: 'pending',
  });

  public syncState$: Observable<SyncState> = this._syncState$.asObservable();

  public async syncNow(): Promise<void> {
    const current = this._syncState$.value;
    this._syncState$.next({ ...current, status: 'syncing' });

    setTimeout(() => {
      this._syncState$.next({
        pendingCount: 0,
        isOnline: true,
        status: 'synced',
        lastSyncDate: new Date(),
      });
    }, 2000);
  }
}
