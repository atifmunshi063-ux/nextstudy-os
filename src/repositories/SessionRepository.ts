import { getDB } from '../db/indexedDb';
import { PomodoroSession, SyncRecord } from '../types';

export class SessionRepository {
  async getAllSessions(): Promise<PomodoroSession[]> {
    const db = await getDB();
    const sessions = await db.getAll('studySessions');
    // Most recent first
    return sessions.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }

  async getSessionsForDate(date: string): Promise<PomodoroSession[]> {
    const db = await getDB();
    return db.getAllFromIndex('studySessions', 'by-date', date);
  }

  async logSession(sessionData: Omit<PomodoroSession, 'id' | 'synced'>): Promise<PomodoroSession> {
    const db = await getDB();
    const newSession: PomodoroSession = {
      ...sessionData,
      id: `pomo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    await db.put('studySessions', newSession);

    // Queue sync record
    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'pomodoro',
      entityId: newSession.id,
      operation: 'create',
      payload: {
        action: 'logPomodoro',
        date: newSession.date,
        dayOfWeek: newSession.dayOfWeek,
        timeOfDay: newSession.timeOfDay,
        category: newSession.category,
        taskGoal: newSession.taskGoal,
        completedPomodoros: newSession.completedPomodoros,
        minutes: newSession.minutes,
        hours: newSession.hours,
        interruptions: newSession.interruptions,
        quality: newSession.quality,
        notes: newSession.notes,
        isPractice: newSession.isPractice,
      },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return newSession;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await getDB();
    await db.delete('studySessions', sessionId);
  }
}

export const sessionRepository = new SessionRepository();
