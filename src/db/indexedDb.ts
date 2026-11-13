import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  HabitEntity,
  HabitLog,
  SyllabusSubject,
  SyllabusSubtopic,
  PomodoroSession,
  Task,
  RevisionItem,
  MockTest,
  ErrorLog,
  CodingProblem,
  SyncRecord,
  SyncSettings,
  EisenhowerItem,
} from '../types';

export interface NextStudyDB extends DBSchema {
  habits: {
    key: string;
    value: HabitEntity;
    indexes: { 'by-category': string; 'by-active': number };
  };
  habitLogs: {
    key: string;
    value: HabitLog;
    indexes: {
      'by-habit': string;
      'by-date': string;
      'by-habit-date': [string, string];
    };
  };
  subjects: {
    key: string; // subject code e.g. Sub_DBMS
    value: SyllabusSubject;
    indexes: { 'by-tier': string };
  };
  topics: {
    key: string;
    value: SyllabusSubtopic & { subjectCode: string };
    indexes: { 'by-subject': string; 'by-priority': string };
  };
  studySessions: {
    key: string;
    value: PomodoroSession;
    indexes: { 'by-date': string; 'by-category': string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-status': string; 'by-scheduled': string; 'by-due': string };
  };
  revisions: {
    key: string;
    value: RevisionItem;
    indexes: { 'by-status': string; 'by-nextRevision': string; 'by-subject': string };
  };
  mockTests: {
    key: string;
    value: MockTest;
    indexes: { 'by-exam': string; 'by-date': string };
  };
  errorLogs: {
    key: string;
    value: ErrorLog;
    indexes: { 'by-subject': string; 'by-type': string };
  };
  codingProblems: {
    key: string;
    value: CodingProblem;
    indexes: { 'by-topic': string; 'by-status': string };
  };
  syncQueue: {
    key: string;
    value: SyncRecord;
    indexes: { 'by-status': string; 'by-created': string };
  };
  settings: {
    key: string;
    value: { id: string } & Partial<SyncSettings>;
  };
  eisenhower: {
    key: string;
    value: EisenhowerItem;
    indexes: { 'by-quadrant': string };
  };
}

const DB_NAME = 'nextstudy-os-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NextStudyDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<NextStudyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NextStudyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Habits store
        if (!db.objectStoreNames.contains('habits')) {
          const habitStore = db.createObjectStore('habits', { keyPath: 'id' });
          habitStore.createIndex('by-category', 'category');
          habitStore.createIndex('by-active', 'active');
        }

        // Habit Logs store
        if (!db.objectStoreNames.contains('habitLogs')) {
          const logStore = db.createObjectStore('habitLogs', { keyPath: 'id' });
          logStore.createIndex('by-habit', 'habitId');
          logStore.createIndex('by-date', 'date');
          logStore.createIndex('by-habit-date', ['habitId', 'date']);
        }

        // Subjects store
        if (!db.objectStoreNames.contains('subjects')) {
          const subjectStore = db.createObjectStore('subjects', { keyPath: 'code' });
          subjectStore.createIndex('by-tier', 'tierId');
        }

        // Topics store
        if (!db.objectStoreNames.contains('topics')) {
          const topicStore = db.createObjectStore('topics', { keyPath: 'id' });
          topicStore.createIndex('by-subject', 'subjectCode');
          topicStore.createIndex('by-priority', 'priority');
        }

        // Study Sessions (Pomodoro)
        if (!db.objectStoreNames.contains('studySessions')) {
          const sessionStore = db.createObjectStore('studySessions', { keyPath: 'id' });
          sessionStore.createIndex('by-date', 'date');
          sessionStore.createIndex('by-category', 'category');
        }

        // Tasks
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-status', 'status');
          taskStore.createIndex('by-scheduled', 'scheduledDate');
          taskStore.createIndex('by-due', 'dueDate');
        }

        // Revisions
        if (!db.objectStoreNames.contains('revisions')) {
          const revStore = db.createObjectStore('revisions', { keyPath: 'id' });
          revStore.createIndex('by-status', 'status');
          revStore.createIndex('by-nextRevision', 'nextRevisionAt');
          revStore.createIndex('by-subject', 'subjectCode');
        }

        // Mock Tests
        if (!db.objectStoreNames.contains('mockTests')) {
          const mockStore = db.createObjectStore('mockTests', { keyPath: 'id' });
          mockStore.createIndex('by-exam', 'exam');
          mockStore.createIndex('by-date', 'date');
        }

        // Error Logs
        if (!db.objectStoreNames.contains('errorLogs')) {
          const errStore = db.createObjectStore('errorLogs', { keyPath: 'id' });
          errStore.createIndex('by-subject', 'subjectCode');
          errStore.createIndex('by-type', 'errorType');
        }

        // Coding Problems
        if (!db.objectStoreNames.contains('codingProblems')) {
          const codeStore = db.createObjectStore('codingProblems', { keyPath: 'id' });
          codeStore.createIndex('by-topic', 'topic');
          codeStore.createIndex('by-status', 'status');
        }

        // Sync Queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-created', 'createdAt');
        }

        // Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Eisenhower
        if (!db.objectStoreNames.contains('eisenhower')) {
          const eisenStore = db.createObjectStore('eisenhower', { keyPath: 'id' });
          eisenStore.createIndex('by-quadrant', 'quadrant');
        }
      },
    });
  }
  return dbPromise;
}
