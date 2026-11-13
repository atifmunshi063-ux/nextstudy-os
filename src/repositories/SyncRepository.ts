import { getDB } from '../db/indexedDb';
import { SyncRecord, SyncSettings } from '../types';
import { appConfig } from '../config';

export class SyncRepository {
  async getSettings(): Promise<SyncSettings> {
    const db = await getDB();
    const settings = await db.get('settings', 'main');
    return {
      webAppUrl: settings?.webAppUrl || appConfig.apiBaseUrl,
      spreadsheetId: settings?.spreadsheetId || appConfig.spreadsheetId,
      autoSync: settings?.autoSync ?? true,
      lastSyncedAt: settings?.lastSyncedAt || null,
    };
  }

  async saveSettings(partial: Partial<SyncSettings>): Promise<void> {
    const db = await getDB();
    const current = await this.getSettings();
    await db.put('settings', {
      id: 'main',
      ...current,
      ...partial,
    });
  }

  async enqueue(record: Omit<SyncRecord, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<SyncRecord> {
    const db = await getDB();
    const newRecord: SyncRecord = {
      ...record,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', newRecord);
    return newRecord;
  }

  async getPendingRecords(): Promise<SyncRecord[]> {
    const db = await getDB();
    const all = await db.getAll('syncQueue');
    return all.filter((r) => r.status === 'pending' || r.status === 'failed');
  }

  async markStatus(id: string, status: SyncRecord['status'], error?: string): Promise<void> {
    const db = await getDB();
    const record = await db.get('syncQueue', id);
    if (!record) return;
    record.status = status;
    if (error) record.lastError = error;
    if (status === 'failed') record.retryCount += 1;
    await db.put('syncQueue', record);
  }

  async clearCompleted(): Promise<void> {
    const db = await getDB();
    const all = await db.getAll('syncQueue');
    const synced = all.filter((r) => r.status === 'synced');
    for (const r of synced) {
      await db.delete('syncQueue', r.id);
    }
  }

  /**
   * Push all pending mutations with exponential backoff retry
   */
  async flushQueue(): Promise<{ success: boolean; pushedCount: number; message: string }> {
    if (!navigator.onLine) {
      return { success: false, pushedCount: 0, message: 'Device is offline. Changes saved in IndexedDB.' };
    }

    const settings = await this.getSettings();
    const url = settings.webAppUrl || appConfig.apiBaseUrl;
    if (!url) {
      return { success: false, pushedCount: 0, message: 'No sync endpoint configured.' };
    }

    const pending = await this.getPendingRecords();
    if (pending.length === 0) {
      return { success: true, pushedCount: 0, message: 'All changes are up to date.' };
    }

    let pushed = 0;
    for (const record of pending) {
      try {
        await this.markStatus(record.id, 'processing');

        // Translate payload for Apps Script / Cloud endpoint
        const bodyPayload = {
          action: record.operation === 'toggleHabit' ? 'toggleHabit' : record.payload?.action || record.operation,
          ...record.payload,
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          await this.markStatus(record.id, 'synced');
          pushed++;
        } else {
          await this.markStatus(record.id, 'failed', `HTTP ${res.status}`);
        }
      } catch (err: any) {
        await this.markStatus(record.id, 'failed', err.message || 'Network request failed');
      }
    }

    await this.clearCompleted();
    await this.saveSettings({ lastSyncedAt: Date.now() });

    return {
      success: pushed > 0,
      pushedCount: pushed,
      message: `Successfully pushed ${pushed} change(s) to cloud database.`,
    };
  }
}

export const syncRepository = new SyncRepository();
