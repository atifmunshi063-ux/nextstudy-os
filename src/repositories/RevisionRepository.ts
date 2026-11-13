import { getDB } from '../db/indexedDb';
import { RevisionItem, SyncRecord } from '../types';
import { getLocalDateString } from '../utils/date';

const INTERVAL_LADDER = [1, 3, 7, 14, 30];

export class RevisionRepository {
  async getAllRevisions(): Promise<RevisionItem[]> {
    const db = await getDB();
    return db.getAll('revisions');
  }

  async getDueRevisions(todayStr: string = getLocalDateString()): Promise<RevisionItem[]> {
    const all = await this.getAllRevisions();
    return all.filter(
      (r) => r.status !== 'mastered' && r.nextRevisionAt <= todayStr
    );
  }

  async createRevision(itemData: {
    topicId: string;
    subjectCode: string;
    topicTitle: string;
    notes?: string;
  }): Promise<RevisionItem> {
    const db = await getDB();
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + 1); // 1-day interval for first revision

    const item: RevisionItem = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      topicId: itemData.topicId,
      subjectCode: itemData.subjectCode,
      topicTitle: itemData.topicTitle,
      lastStudiedAt: getLocalDateString(today),
      nextRevisionAt: getLocalDateString(nextDate),
      intervalDays: 1,
      repetition: 1,
      difficulty: 'medium',
      status: 'scheduled',
      notes: itemData.notes,
    };

    await db.put('revisions', item);

    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'revision',
      entityId: item.id,
      operation: 'create',
      payload: item,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return item;
  }

  async recordRecall(
    revisionId: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<RevisionItem | null> {
    const db = await getDB();
    const item = await db.get('revisions', revisionId);
    if (!item) return null;

    const today = new Date();
    item.lastStudiedAt = getLocalDateString(today);
    item.difficulty = difficulty;

    if (difficulty === 'hard') {
      // Regress interval ladder: 30 -> 14, 14 -> 7, 7 -> 3, 3 -> 1
      const currentIndex = INTERVAL_LADDER.indexOf(item.intervalDays);
      const newIndex = Math.max(0, currentIndex - 1);
      item.intervalDays = INTERVAL_LADDER[newIndex];
      item.repetition = Math.max(1, item.repetition);
    } else {
      // Advance interval ladder
      const currentIndex = INTERVAL_LADDER.indexOf(item.intervalDays);
      if (currentIndex === -1 || currentIndex >= INTERVAL_LADDER.length - 1) {
        item.status = 'mastered';
        item.intervalDays = 60;
      } else {
        item.intervalDays = INTERVAL_LADDER[currentIndex + 1];
        item.repetition += 1;
      }
    }

    if (item.status !== 'mastered') {
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + item.intervalDays);
      item.nextRevisionAt = getLocalDateString(nextDate);
      item.status = 'scheduled';
    }

    await db.put('revisions', item);

    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'revision',
      entityId: item.id,
      operation: 'update',
      payload: { difficulty, intervalDays: item.intervalDays, nextRevisionAt: item.nextRevisionAt, status: item.status },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return item;
  }
}

export const revisionRepository = new RevisionRepository();
