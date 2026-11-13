import { getDB } from '../db/indexedDb';
import { Habit, HabitEntity, HabitLog, HabitCategory, SyncRecord } from '../types';
import { getLocalDateString } from '../utils/date';

export class HabitRepository {
  /**
   * Get all canonical habit definitions
   */
  async getHabitEntities(): Promise<HabitEntity[]> {
    const db = await getDB();
    const habits = await db.getAll('habits');
    return habits.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get habit logs for a specific habit
   */
  async getLogsForHabit(habitId: string): Promise<HabitLog[]> {
    const db = await getDB();
    return db.getAllFromIndex('habitLogs', 'by-habit', habitId);
  }

  /**
   * Get habit logs for a specific date
   */
  async getLogsForDate(date: string): Promise<HabitLog[]> {
    const db = await getDB();
    return db.getAllFromIndex('habitLogs', 'by-date', date);
  }

  /**
   * High-speed UI Projection: Converts canonical HabitEntity + HabitLog into
   * the 31-day Habit model used by TodayScreen & Analytics
   */
  async getHabitProjections(targetDate: Date = new Date()): Promise<Habit[]> {
    const db = await getDB();
    const entities = await this.getHabitEntities();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');

    // Fetch all logs for this month
    const startStr = `${year}-${month}-01`;
    const endStr = `${year}-${month}-31`;
    const range = IDBKeyRange.bound(startStr, endStr);
    const monthLogs = await db.getAllFromIndex('habitLogs', 'by-date', range);

    // Build map: habitId -> set of checked day numbers (1..31)
    const checksMap = new Map<string, Set<number>>();
    for (const log of monthLogs) {
      if (log.completed) {
        const day = parseInt(log.date.split('-')[2], 10);
        if (!checksMap.has(log.habitId)) {
          checksMap.set(log.habitId, new Set<number>());
        }
        checksMap.get(log.habitId)!.add(day);
      }
    }

    return entities.map((entity, idx) => {
      const numId = entity.numId || idx + 1;
      const checkedDays = checksMap.get(entity.id) || new Set<number>();
      const checks = new Array(31).fill(false);
      checkedDays.forEach((d) => {
        if (d >= 1 && d <= 31) {
          checks[d - 1] = true;
        }
      });

      const totalDone = checks.filter(Boolean).length;
      const targetDays = entity.targetDays || 22;
      const completionPct = Math.round((totalDone / targetDays) * 100);

      let status: Habit['status'] = '⚪ Not Started';
      if (totalDone >= targetDays) status = '🏆 Target Achieved';
      else if (totalDone >= 15) status = '⚡ Strong Streak';
      else if (totalDone > 0) status = '✅ Active';

      return {
        id: numId,
        uuid: entity.id,
        category: entity.category,
        description: entity.name,
        targetDays,
        checks,
        totalDone,
        completionPct,
        status,
      };
    });
  }

  /**
   * Toggle habit for a given day (1..31) or explicit date
   */
  async toggleHabit(
    numIdOrUuid: number | string,
    day: number,
    value: boolean,
    targetDate: Date = new Date()
  ): Promise<{ habitLog: HabitLog; habitEntity: HabitEntity } | null> {
    const db = await getDB();
    const entities = await this.getHabitEntities();

    const entity =
      typeof numIdOrUuid === 'string'
        ? entities.find((e) => e.id === numIdOrUuid)
        : entities.find((e) => e.numId === numIdOrUuid || e.order === numIdOrUuid);

    if (!entity) return null;

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    const logId = `log-${entity.id}-${dateStr}`;

    const habitLog: HabitLog = {
      id: logId,
      habitId: entity.id,
      date: dateStr,
      completed: value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save log to IndexedDB
    await db.put('habitLogs', habitLog);

    // Queue sync record
    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'habitLog',
      entityId: habitLog.id,
      operation: 'toggleHabit',
      payload: {
        row: (entity.numId || 1) + 4,
        day,
        value,
        habitId: entity.id,
        date: dateStr,
      },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return { habitLog, habitEntity: entity };
  }

  /**
   * Add a new canonical habit
   */
  async addHabit(category: HabitCategory, name: string, targetDays = 22): Promise<HabitEntity> {
    const db = await getDB();
    const entities = await this.getHabitEntities();
    const nextOrder = entities.length > 0 ? Math.max(...entities.map((e) => e.order || 0)) + 1 : 1;
    const newId = `habit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const entity: HabitEntity = {
      id: newId,
      numId: nextOrder,
      name,
      category,
      targetPerWeek: Math.round(targetDays / 4.4),
      targetDays,
      active: true,
      createdAt: new Date().toISOString(),
      order: nextOrder,
    };

    await db.put('habits', entity);

    // Queue sync record
    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'habit',
      entityId: entity.id,
      operation: 'create',
      payload: {
        category,
        description: name,
        targetDays,
      },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return entity;
  }

  async deleteHabit(habitId: number | string): Promise<void> {
    const db = await getDB();
    const strId = String(habitId);
    await db.delete('habits', strId);
    try {
      const logs = await db.getAllFromIndex('habitLogs', 'by-habit', strId);
      for (const log of logs) {
        await db.delete('habitLogs', log.id);
      }
    } catch (e) {
      console.warn('IDB delete habit logs note:', e);
    }
  }

  async clearAllHabits(): Promise<void> {
    const db = await getDB();
    await db.clear('habits');
    await db.clear('habitLogs');
  }
}

export const habitRepository = new HabitRepository();
