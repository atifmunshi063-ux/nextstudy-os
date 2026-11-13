import { getDB } from './indexedDb';
import {
  generateInitialHabits,
  generateInitialSubjects,
  generateInitialPomodoroSessions,
  INITIAL_EISENHOWER_ITEMS,
} from '../data/seedData';
import { Habit, HabitEntity, HabitLog, PomodoroSession, SyllabusSubject, EisenhowerItem } from '../types';
import { appConfig } from '../config';

const MIGRATION_FLAG_KEY = 'nextstudy_idb_migrated_v1';

export async function runDatabaseMigrations(): Promise<void> {
  const db = await getDB();

  // Check if habits are already populated
  const existingHabitsCount = await db.count('habits');
  if (existingHabitsCount > 0) {
    return; // Already initialized
  }

  // 1. Migrate or Seed Habits & HabitLogs
  try {
    const rawHabits = localStorage.getItem('nextstudy_habits_v2');
    const legacyHabits: Habit[] = rawHabits ? JSON.parse(rawHabits) : [];

    const tx = db.transaction(['habits', 'habitLogs'], 'readwrite');
    const habitStore = tx.objectStore('habits');
    const logStore = tx.objectStore('habitLogs');

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    for (const h of legacyHabits) {
      const habitId = `habit-${h.id}`;
      const entity: HabitEntity = {
        id: habitId,
        numId: h.id,
        name: h.description,
        category: h.category,
        targetPerWeek: Math.round(h.targetDays / 4.4),
        targetDays: h.targetDays,
        active: true,
        createdAt: new Date().toISOString(),
        order: h.id,
      };
      await habitStore.put(entity);

      // Migrate existing 31-day checkmarks into HabitLog records for the current active month
      if (Array.isArray(h.checks)) {
        for (let dayIndex = 0; dayIndex < h.checks.length; dayIndex++) {
          if (h.checks[dayIndex]) {
            const dayStr = String(dayIndex + 1).padStart(2, '0');
            const dateStr = `${year}-${month}-${dayStr}`;
            const logId = `log-${habitId}-${dateStr}`;
            const log: HabitLog = {
              id: logId,
              habitId: habitId,
              date: dateStr,
              completed: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await logStore.put(log);
          }
        }
      }
    }
    await tx.done;
  } catch (err) {
    console.error('Migration error for habits:', err);
  }

  // 2. Migrate or Seed Subjects and Topics
  try {
    const rawSubjects = localStorage.getItem('nextstudy_subjects_v2');
    const legacySubjects: SyllabusSubject[] = rawSubjects
      ? JSON.parse(rawSubjects)
      : generateInitialSubjects();

    const tx = db.transaction(['subjects', 'topics'], 'readwrite');
    const subjectStore = tx.objectStore('subjects');
    const topicStore = tx.objectStore('topics');

    for (const sub of legacySubjects) {
      await subjectStore.put(sub);
      if (Array.isArray(sub.topics)) {
        for (const top of sub.topics) {
          await topicStore.put({
            ...top,
            subjectCode: sub.code,
          });
        }
      }
    }
    await tx.done;
  } catch (err) {
    console.error('Migration error for subjects:', err);
  }

  // 3. Migrate or Seed Pomodoro Study Sessions
  try {
    const rawPomo = localStorage.getItem('nextstudy_pomodoro_v2');
    const legacySessions: PomodoroSession[] = rawPomo
      ? JSON.parse(rawPomo)
      : generateInitialPomodoroSessions();

    const tx = db.transaction('studySessions', 'readwrite');
    const store = tx.objectStore('studySessions');
    for (const sess of legacySessions) {
      await store.put(sess);
    }
    await tx.done;
  } catch (err) {
    console.error('Migration error for studySessions:', err);
  }

  // 4. Migrate or Seed Eisenhower Items
  try {
    const rawEisen = localStorage.getItem('nextstudy_eisenhower_v2');
    const legacyEisen: EisenhowerItem[] = rawEisen
      ? JSON.parse(rawEisen)
      : INITIAL_EISENHOWER_ITEMS;

    const tx = db.transaction('eisenhower', 'readwrite');
    const store = tx.objectStore('eisenhower');
    for (const item of legacyEisen) {
      await store.put(item);
    }
    await tx.done;
  } catch (err) {
    console.error('Migration error for eisenhower:', err);
  }

  // 5. Seed Tasks (Initial high-impact tasks)
  try {
    const existingTasks = await db.count('tasks');
    if (existingTasks === 0) {
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      const sampleTasks = [
        {
          id: 'task-1',
          title: 'DBMS Unit 2: Practice B-Tree & Indexing PYQs',
          type: 'study' as const,
          subjectId: 'Sub_DBMS',
          priority: 'high' as const,
          estimatedMinutes: 50,
          status: 'todo' as const,
          scheduledDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-2',
          title: 'DSA: Solve 3 LeetCode Medium Sliding Window Problems',
          type: 'coding' as const,
          subjectId: 'Sub_DSA',
          priority: 'high' as const,
          estimatedMinutes: 60,
          status: 'todo' as const,
          scheduledDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'task-3',
          title: 'Operating Systems: Revise CPU Scheduling Algorithms',
          type: 'revision' as const,
          subjectId: 'Sub_OS',
          priority: 'medium' as const,
          estimatedMinutes: 30,
          status: 'todo' as const,
          scheduledDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      for (const t of sampleTasks) {
        await store.put(t);
      }
      await tx.done;
    }
  } catch (err) {
    console.error('Migration error for tasks:', err);
  }

  // 6. Seed initial Settings
  try {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const existing = await store.get('main');
    if (!existing) {
      await store.put({
        id: 'main',
        webAppUrl: appConfig.apiBaseUrl,
        spreadsheetId: appConfig.spreadsheetId,
        autoSync: true,
        lastSyncedAt: Date.now(),
      });
    }
    await tx.done;
  } catch (err) {
    console.error('Migration error for settings:', err);
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}
