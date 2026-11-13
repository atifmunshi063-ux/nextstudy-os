import { Habit, SyllabusSubject, SyllabusSubtopic, PomodoroSession, SyncMutation, SyncSettings, HabitCategory, EisenhowerItem, MistakeEntry } from '../types';
import { generateInitialHabits, generateInitialSubjects, generateInitialPomodoroSessions, INITIAL_EISENHOWER_ITEMS } from '../data/seedData';
import { appConfig } from '../config';
import { runDatabaseMigrations } from '../db/migration';
import { habitRepository } from '../repositories/HabitRepository';
import { subjectRepository } from '../repositories/SubjectRepository';
import { sessionRepository } from '../repositories/SessionRepository';
import { syncRepository } from '../repositories/SyncRepository';
import { getLocalDateString } from '../utils/date';
import { examTierService } from './examTierService';

const STORAGE_KEYS = {
  HABITS: 'nextstudy_habits_v2',
  SUBJECTS: 'nextstudy_subjects_v2',
  POMODORO: 'nextstudy_pomodoro_v2',
  MUTATIONS: 'nextstudy_sync_mutations_v2',
  SETTINGS: 'nextstudy_settings_v2',
  EISENHOWER: 'nextstudy_eisenhower_v2',
  MISTAKES: 'nextstudy_mistakes_v1',
};

const DEFAULT_SETTINGS: SyncSettings = {
  webAppUrl: appConfig.apiBaseUrl,
  spreadsheetId: appConfig.spreadsheetId,
  autoSync: true,
  lastSyncedAt: Date.now(),
};

type StorageListener = () => void;

class StorageService {
  private listeners: Set<StorageListener> = new Set();
  public isSyncing = false;
  private initialized = false;

  constructor() {
    this.initIndexedDB();
  }

  private async initIndexedDB() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;
    try {
      await runDatabaseMigrations();
      // Hydrate local cache from IndexedDB only if local cache has not been initialized
      const cachedHabits = localStorage.getItem(STORAGE_KEYS.HABITS);
      if (cachedHabits === null) {
        const idbHabits = await habitRepository.getHabitProjections();
        this.saveHabits(idbHabits);
      }
    } catch (e) {
      console.warn('IndexedDB initialization notice:', e);
    }
  }

  public subscribe(listener: StorageListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Storage listener error:', e);
      }
    });
  }

  // --- HABITS ---

  public getHabits(): Habit[] {
    try {
      // One-time cleanup to wipe auto-generated seed habits
      const HABITS_CLEARED_FLAG = 'nextstudy_habits_cleared_v1';
      if (typeof window !== 'undefined' && !localStorage.getItem(HABITS_CLEARED_FLAG)) {
        localStorage.setItem(HABITS_CLEARED_FLAG, 'true');
        localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify([]));
        habitRepository.clearAllHabits().catch(() => {});
        return [];
      }

      const data = localStorage.getItem(STORAGE_KEYS.HABITS);
      if (!data) {
        return [];
      }
      const parsed: Habit[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveHabits(habits: Habit[]) {
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    this.notify();
  }

  public toggleHabit(habitId: number, day: number, value: boolean): Habit | null {
    const habits = this.getHabits();
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return null;

    habit.checks[day - 1] = value;
    habit.totalDone = habit.checks.filter(Boolean).length;
    habit.completionPct = Math.round((habit.totalDone / habit.targetDays) * 100);

    if (habit.totalDone >= habit.targetDays) {
      habit.status = '🏆 Target Achieved';
    } else if (habit.totalDone >= 15) {
      habit.status = '⚡ Strong Streak';
    } else if (habit.totalDone > 0) {
      habit.status = '✅ Active';
    } else {
      habit.status = '⚪ Not Started';
    }

    this.saveHabits(habits);

    // Persist to IndexedDB repository (M2 / M3)
    habitRepository.toggleHabit(habitId, day, value).catch((e) => console.warn('IDB habit toggle note:', e));

    // Queue mutation for Google Sheets
    // In sheet, row index = habitId + 4 (Row 5 is Habit 1)
    this.queueMutation({
      action: 'toggleHabit',
      payload: {
        row: habitId + 4,
        day,
        value,
      },
    });

    return habit;
  }

  public addHabit(category: HabitCategory, description: string, targetDays: number = 22): Habit {
    const habits = this.getHabits();
    const nextId = habits.length > 0 ? Math.max(...habits.map((h) => h.id)) + 1 : 1;

    const newHabit: Habit = {
      id: nextId,
      category,
      description,
      targetDays,
      checks: new Array(31).fill(false),
      totalDone: 0,
      completionPct: 0,
      status: '⚪ Not Started',
    };

    habits.push(newHabit);
    this.saveHabits(habits);

    // Persist to IndexedDB repository
    habitRepository.addHabit(category, description, targetDays).catch((e) => console.warn('IDB habit add note:', e));

    this.queueMutation({
      action: 'addHabit',
      payload: {
        category,
        description,
        targetDays,
      },
    });

    return newHabit;
  }

  public deleteHabit(habitId: number): boolean {
    const habits = this.getHabits();
    const updated = habits.filter((h) => h.id !== habitId);
    if (updated.length === habits.length) return false;
    this.saveHabits(updated);

    // Persist to IndexedDB
    habitRepository.deleteHabit(habitId).catch((e) => console.warn('IDB habit delete note:', e));

    // Queue mutation for Google Sheets
    this.queueMutation({
      action: 'deleteHabit',
      payload: {
        id: habitId,
        row: habitId + 4,
      },
    });

    return true;
  }

  public deleteAllHabits(): number {
    const habits = this.getHabits();
    const count = habits.length;
    this.saveHabits([]);

    // Persist to IndexedDB
    habitRepository.clearAllHabits().catch((e) => console.warn('IDB clear habits note:', e));

    // Queue mutation for Google Sheets
    habits.forEach((h) => {
      this.queueMutation({
        action: 'deleteHabit',
        payload: {
          id: h.id,
          row: h.id + 4,
        },
      });
    });

    return count;
  }

  // --- SYLLABUS ---

  public getSubjects(): SyllabusSubject[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      const initial = generateInitialSubjects();
      if (!data) {
        this.saveSubjects(initial);
        return initial;
      }
      const parsed: SyllabusSubject[] = JSON.parse(data);
      const existingCodes = new Set(parsed.map((s) => s.code));
      let hasNew = false;
      initial.forEach((initSub) => {
        if (!existingCodes.has(initSub.code)) {
          parsed.push(initSub);
          hasNew = true;
        }
      });
      if (hasNew) {
        this.saveSubjects(parsed);
      }
      return parsed;
    } catch {
      return generateInitialSubjects();
    }
  }

  public saveSubjects(subjects: SyllabusSubject[]) {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    this.notify();
  }

  public createSubject(
    code: string,
    name: string,
    tierId: string = 'custom_exam',
    semesterOrDomain: string = 'Custom Exam Syllabus'
  ): SyllabusSubject {
    const subjects = this.getSubjects();
    const formattedCode = code.trim().startsWith('Sub_') ? code.trim() : `Sub_${code.trim().replace(/\s+/g, '_')}`;
    const existing = subjects.find((s) => s.code.toLowerCase() === formattedCode.toLowerCase());
    if (existing) return existing;

    const newSubject: SyllabusSubject = {
      code: formattedCode,
      name: name.trim(),
      tierId: tierId as any,
      semesterOrDomain: semesterOrDomain.trim(),
      totalSubtopics: 1,
      completedSubtopics: 0,
      topics: [
        {
          id: `${formattedCode.toLowerCase()}-1`,
          rowIndex: 6,
          unit: 'Unit 1: Core Fundamentals',
          topic: 'Foundational Syllabus',
          subtopic: `Core concepts and foundational principles for ${name.trim()}`,
          priority: 'High',
          theory: false,
          practice: false,
          pyq: false,
          revisionCount: 0,
        },
      ],
    };

    subjects.push(newSubject);
    this.saveSubjects(subjects);

    // Queue mutation for automatic subject sheet creation on Google Sheets
    this.queueMutation({
      action: 'createSubjectSheet',
      payload: {
        subjectCode: newSubject.code,
        subjectName: newSubject.name,
        category: semesterOrDomain,
      },
    });

    // Queue mutation for Google Sheets
    this.queueMutation({
      action: 'addSubtopic',
      payload: {
        subject: newSubject.code,
        unit: 'Unit 1: Core Fundamentals',
        topic: 'Foundational Syllabus',
        subtopic: `Core concepts and foundational principles for ${name.trim()}`,
        priority: 'High',
      },
    });

    return newSubject;
  }

  public createExam(examName: string, icon: string = '🎯', description: string = '', targetDate?: string) {
    this.queueMutation({
      action: 'createExamSheet',
      payload: { examName, icon, description, targetDate: targetDate || '' },
    });
  }

  public deleteSubject(code: string, deleteSheetFromCloud: boolean = true): boolean {
    const subjects = this.getSubjects();
    const updated = subjects.filter((s) => s.code !== code);
    if (updated.length === subjects.length) return false;
    this.saveSubjects(updated);

    // Unlink the subject from all tiers in examTierService
    try {
      const tiers = examTierService.getTiers();
      let changed = false;
      tiers.forEach((t) => {
        if (t.subjects.includes(code)) {
          t.subjects = t.subjects.filter((c) => c !== code);
          changed = true;
        }
      });
      if (changed) {
        examTierService.saveTiers(tiers);
      }
    } catch (e) {
      console.warn('Failed to unlink subject from tiers in deleteSubject:', e);
    }

    if (deleteSheetFromCloud) {
      this.queueMutation({
        action: 'deleteSubjectSheet',
        payload: { subjectCode: code },
      });
    }

    return true;
  }

  public deleteMultipleSubjects(codes: string[], deleteSheetFromCloud: boolean = true): number {
    let count = 0;
    codes.forEach((code) => {
      if (this.deleteSubject(code, deleteSheetFromCloud)) {
        count++;
      }
    });
    return count;
  }

  public updateSyllabusTopic(
    subjectCode: string,
    subtopicId: string,
    field: 'theory' | 'practice' | 'pyq' | 'revisionCount' | 'notes',
    value: any
  ) {
    const subjects = this.getSubjects();
    const subject = subjects.find((s) => s.code === subjectCode);
    if (!subject) return;

    const topic = subject.topics.find((t) => t.id === subtopicId);
    if (!topic) return;

    (topic as any)[field] = value;

    // Recalculate completed subtopics for subject
    // A subtopic is completed if all 3 checkboxes (theory, practice, pyq) are true
    subject.completedSubtopics = subject.topics.filter(
      (t) => t.theory && t.practice && t.pyq
    ).length;

    this.saveSubjects(subjects);

    // Persist to IndexedDB SubjectRepository
    subjectRepository
      .updateTopicField(subjectCode, subtopicId, field, value)
      .catch((e) => console.warn('IDB subject update note:', e));

    // Queue mutation
    this.queueMutation({
      action: 'updateSyllabus',
      payload: {
        subject: subjectCode,
        row: topic.rowIndex,
        theory: topic.theory,
        practice: topic.practice,
        pyq: topic.pyq,
        notes: topic.notes,
      },
    });
  }

  public updateSubtopic(
    subjectCode: string,
    subtopicId: string,
    updates: Partial<SyllabusSubtopic>
  ) {
    Object.entries(updates).forEach(([field, val]) => {
      this.updateSyllabusTopic(subjectCode, subtopicId, field as any, val);
    });
  }

  public addSubtopic(
    subjectCode: string,
    unit: string,
    topicName: string,
    subtopicTitle: string,
    priority: 'High' | 'Medium' | 'Low'
  ): SyllabusSubtopic | null {
    const subjects = this.getSubjects();
    const subject = subjects.find((s) => s.code === subjectCode);
    if (!subject) return null;

    const nextRowIndex =
      subject.topics.length > 0
        ? Math.max(...subject.topics.map((t) => t.rowIndex)) + 1
        : 6;

    const newTopic: SyllabusSubtopic = {
      id: `${subjectCode.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      rowIndex: nextRowIndex,
      unit: unit.trim() || 'General Unit',
      topic: topicName.trim() || 'Core Topic',
      subtopic: subtopicTitle.trim(),
      priority,
      theory: false,
      practice: false,
      pyq: false,
      revisionCount: 0,
    };

    subject.topics.push(newTopic);
    subject.totalSubtopics = subject.topics.length;
    subject.completedSubtopics = subject.topics.filter(
      (t) => t.theory && t.practice && t.pyq
    ).length;

    this.saveSubjects(subjects);

    // Persist to IndexedDB SubjectRepository
    subjectRepository
      .addSubtopic(subjectCode, unit, topicName, subtopicTitle, priority)
      .catch((e) => console.warn('IDB addSubtopic note:', e));

    // Queue mutation for Google Sheets
    this.queueMutation({
      action: 'addSubtopic',
      payload: {
        subject: subjectCode,
        unit: newTopic.unit,
        topic: newTopic.topic,
        subtopic: newTopic.subtopic,
        priority: newTopic.priority,
      },
    });

    return newTopic;
  }

  public deleteSubtopic(subjectCode: string, subtopicId: string): boolean {
    const subjects = this.getSubjects();
    const subject = subjects.find((s) => s.code === subjectCode);
    if (!subject) return false;

    const targetTopic = subject.topics.find((t) => t.id === subtopicId);
    const initialLen = subject.topics.length;
    subject.topics = subject.topics.filter((t) => t.id !== subtopicId);
    if (subject.topics.length === initialLen) return false;

    // Prevent Row Drift: Re-index remaining topics starting at row 6
    subject.topics.forEach((t, idx) => {
      t.rowIndex = 6 + idx;
    });

    subject.totalSubtopics = subject.topics.length;
    subject.completedSubtopics = subject.topics.filter(
      (t) => t.theory && t.practice && t.pyq
    ).length;

    this.saveSubjects(subjects);

    subjectRepository
      .deleteSubtopic(subjectCode, subtopicId)
      .catch((e) => console.warn('IDB deleteSubtopic note:', e));

    this.queueMutation({
      action: 'deleteSubtopic',
      payload: {
        subject: subjectCode,
        id: subtopicId,
        subtopic: targetTopic?.subtopic || '',
      },
    });

    return true;
  }

  public deleteMultipleSubtopics(subjectCode: string, subtopicIds: string[]): number {
    const subjects = this.getSubjects();
    const subject = subjects.find((s) => s.code === subjectCode);
    if (!subject) return 0;

    const idSet = new Set(subtopicIds);
    const toDelete = subject.topics.filter((t) => idSet.has(t.id));
    if (toDelete.length === 0) return 0;

    subject.topics = subject.topics.filter((t) => !idSet.has(t.id));

    // Re-index remaining topics starting at row 6
    subject.topics.forEach((t, idx) => {
      t.rowIndex = 6 + idx;
    });

    subject.totalSubtopics = subject.topics.length;
    subject.completedSubtopics = subject.topics.filter(
      (t) => t.theory && t.practice && t.pyq
    ).length;

    this.saveSubjects(subjects);

    // Queue mutation for each deleted subtopic
    toDelete.forEach((targetTopic) => {
      subjectRepository
        .deleteSubtopic(subjectCode, targetTopic.id)
        .catch((e) => console.warn('IDB deleteMultipleSubtopics note:', e));

      this.queueMutation({
        action: 'deleteSubtopic',
        payload: {
          subject: subjectCode,
          id: targetTopic.id,
          subtopic: targetTopic.subtopic,
        },
      });
    });

    return toDelete.length;
  }

  public markMultipleSubtopics(
    subjectCode: string,
    subtopicIds: string[],
    values: { theory?: boolean; practice?: boolean; pyq?: boolean }
  ): number {
    const subjects = this.getSubjects();
    const subject = subjects.find((s) => s.code === subjectCode);
    if (!subject) return 0;

    const idSet = new Set(subtopicIds);
    let count = 0;
    subject.topics.forEach((t) => {
      if (idSet.has(t.id)) {
        if (values.theory !== undefined) t.theory = values.theory;
        if (values.practice !== undefined) t.practice = values.practice;
        if (values.pyq !== undefined) t.pyq = values.pyq;
        count++;

        this.queueMutation({
          action: 'updateSyllabus',
          payload: {
            subject: subjectCode,
            row: t.rowIndex,
            theory: t.theory,
            practice: t.practice,
            pyq: t.pyq,
          },
        });
      }
    });

    subject.completedSubtopics = subject.topics.filter(
      (t) => t.theory && t.practice && t.pyq
    ).length;

    this.saveSubjects(subjects);
    return count;
  }

  // --- POMODORO SESSIONS ---

  public getPomodoroSessions(): PomodoroSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.POMODORO);
      if (!data) {
        // If deleted keys has ALL_CLEARED, user cleared sessions deliberately
        const deletedKeys: string[] = JSON.parse(localStorage.getItem('nextstudy_deleted_pomodoro_keys') || '[]');
        if (deletedKeys.includes('ALL_CLEARED')) {
          return [];
        }
        const initial = generateInitialPomodoroSessions();
        this.savePomodoroSessions(initial);
        return initial;
      }
      const parsed: PomodoroSession[] = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];

      // Ensure all IDs are strictly unique and deterministic
      const seenIds = new Set<string>();
      let hasMutated = false;
      const deduplicated = parsed.map((s, idx) => {
        if (!s.id || seenIds.has(s.id)) {
          hasMutated = true;
          const cleanGoal = (s.taskGoal || 'pomo').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
          const safeId = s.id ? `${s.id}-idx-${idx}` : `pomo-${s.date || 'd'}-${cleanGoal}-${idx}`;
          seenIds.add(safeId);
          return { ...s, id: safeId };
        }
        seenIds.add(s.id);
        return s;
      });

      if (hasMutated) {
        localStorage.setItem(STORAGE_KEYS.POMODORO, JSON.stringify(deduplicated));
      }
      return deduplicated;
    } catch {
      return [];
    }
  }

  public savePomodoroSessions(sessions: PomodoroSession[]) {
    localStorage.setItem(STORAGE_KEYS.POMODORO, JSON.stringify(sessions));
    this.notify();
  }

  public logPomodoro(sessionData: Omit<PomodoroSession, 'id' | 'synced'>): PomodoroSession {
    const sessions = this.getPomodoroSessions();
    const newSession: PomodoroSession = {
      ...sessionData,
      id: `pomo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      synced: false,
    };

    sessions.unshift(newSession);
    this.savePomodoroSessions(sessions);

    // Persist to IndexedDB SessionRepository
    sessionRepository
      .logSession({
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
      })
      .catch((e) => console.warn('IDB log session note:', e));

    this.queueMutation({
      action: 'logPomodoro',
      payload: {
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
      },
    });

    return newSession;
  }

  public deletePomodoroSession(
    sessionId: string,
    matchCriteria?: { date?: string; taskGoal?: string; minutes?: number }
  ): boolean {
    const sessions = this.getPomodoroSessions();
    let targetIndex = sessions.findIndex((s) => s.id === sessionId);

    // If ID didn't match directly, try fallback criteria (taskGoal + date + minutes)
    if (targetIndex === -1 && matchCriteria) {
      targetIndex = sessions.findIndex((s) => {
        const dateMatch = !matchCriteria.date || s.date === matchCriteria.date;
        const goalMatch =
          !matchCriteria.taskGoal ||
          s.taskGoal.trim().toLowerCase() === matchCriteria.taskGoal.trim().toLowerCase();
        const minsMatch = !matchCriteria.minutes || s.minutes === matchCriteria.minutes;
        return dateMatch && goalMatch && minsMatch;
      });
    }

    if (targetIndex === -1) {
      console.warn('Pomodoro session not found for deletion:', sessionId, matchCriteria);
      return false;
    }

    const removedSession = sessions[targetIndex];
    const updated = sessions.filter((_, idx) => idx !== targetIndex);
    this.savePomodoroSessions(updated);

    // Blacklist key to prevent Google Sheets pull from re-importing deleted session
    try {
      const deletedKey = `${removedSession.date}_${removedSession.taskGoal}_${removedSession.minutes}`;
      const deletedList: string[] = JSON.parse(
        localStorage.getItem('nextstudy_deleted_pomodoro_keys') || '[]'
      );
      if (!deletedList.includes(deletedKey)) deletedList.push(deletedKey);
      if (!deletedList.includes(removedSession.id)) deletedList.push(removedSession.id);
      localStorage.setItem('nextstudy_deleted_pomodoro_keys', JSON.stringify(deletedList));
    } catch {}

    sessionRepository
      .deleteSession(removedSession.id)
      .catch((e) => console.warn('IDB deleteSession note:', e));

    this.queueMutation({
      action: 'deletePomodoro',
      payload: {
        id: removedSession.id,
        date: removedSession.date,
        taskGoal: removedSession.taskGoal,
        title: removedSession.taskGoal || removedSession.category,
        minutes: removedSession.minutes,
      },
    });

    return true;
  }

  public clearAllPomodoroSessions(): void {
    this.savePomodoroSessions([]);
    try {
      localStorage.setItem('nextstudy_deleted_pomodoro_keys', JSON.stringify(['ALL_CLEARED']));
    } catch {}
    this.notify();
  }

  // --- SETTINGS & SYNC ---

  public getSettings(): SyncSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      if (!parsed.webAppUrl || parsed.webAppUrl.includes('AKfycbyGZkOCCvU8ITcT21')) {
        parsed.webAppUrl = appConfig.apiBaseUrl;
      }
      if (!parsed.spreadsheetId) {
        parsed.spreadsheetId = appConfig.spreadsheetId;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public saveSettings(settings: Partial<SyncSettings>) {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    this.notify();
  }

  // --- MISTAKES (DIGITAL MISTAKE BOOK) ---

  public getMistakes(): MistakeEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MISTAKES);
      if (!data) return [];
      const parsed: MistakeEntry[] = JSON.parse(data);
      const seenIds = new Set<string>();
      let hasDuplicates = false;
      const deduplicated = parsed.map((m, idx) => {
        if (!m.id || seenIds.has(m.id)) {
          hasDuplicates = true;
          const safeId = m.id
            ? `${m.id}-dup-${idx}-${Math.random().toString(36).substr(2, 4)}`
            : `mistake-${idx}-${Date.now()}`;
          seenIds.add(safeId);
          return { ...m, id: safeId };
        }
        seenIds.add(m.id);
        return m;
      });
      if (hasDuplicates) {
        localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(deduplicated));
      }
      return deduplicated;
    } catch {
      return [];
    }
  }

  public saveMistakes(mistakes: MistakeEntry[]) {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));
    this.notify();
  }

  public logMistake(entry: {
    subject: string;
    topic: string;
    source: string;
    severity: 'High' | 'Medium' | 'Low';
    trap: string;
    rootCause: string;
    goldenRule: string;
  }): MistakeEntry {
    const mistakes = this.getMistakes();
    const newMistake: MistakeEntry = {
      ...entry,
      id: `mistake-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: getLocalDateString(),
      createdAt: new Date().toISOString(),
    };

    mistakes.unshift(newMistake);
    this.saveMistakes(mistakes);

    // Queue mutation for Google Sheets ERROR_LOG
    this.queueMutation({
      action: 'logMistake',
      payload: {
        subject: newMistake.subject,
        topic: newMistake.topic,
        source: newMistake.source,
        severity: newMistake.severity,
        trap: newMistake.trap,
        rootCause: newMistake.rootCause,
        goldenRule: newMistake.goldenRule,
        date: newMistake.date,
      },
    });

    return newMistake;
  }

  public deleteMistake(mistakeId: string): boolean {
    const mistakes = this.getMistakes();
    const target = mistakes.find((m) => m.id === mistakeId);
    const updated = mistakes.filter((m) => m.id !== mistakeId);
    if (updated.length === mistakes.length) return false;
    this.saveMistakes(updated);

    this.queueMutation({
      action: 'deleteMistake',
      payload: {
        id: mistakeId,
        subject: target?.subject,
        topic: target?.topic,
        trap: target?.trap,
        date: target?.date,
      },
    });

    return true;
  }

  public deleteMultipleMistakes(ids: string[]): number {
    let count = 0;
    ids.forEach((id) => {
      if (this.deleteMistake(id)) {
        count++;
      }
    });
    return count;
  }

  public getMutations(): SyncMutation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MUTATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveMutations(mutations: SyncMutation[]) {
    localStorage.setItem(STORAGE_KEYS.MUTATIONS, JSON.stringify(mutations));
    this.notify();
  }

  private queueMutation(mutationData: { action: SyncMutation['action']; payload: any }) {
    const mutations = this.getMutations();
    const mutation: SyncMutation = {
      id: `mut-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      action: mutationData.action,
      payload: mutationData.payload,
      status: 'pending',
    };

    mutations.push(mutation);
    this.saveMutations(mutations);

    const settings = this.getSettings();
    if (settings.autoSync && settings.webAppUrl && navigator.onLine) {
      this.syncPendingMutations();
    }
  }

  public async syncPendingMutations(): Promise<{ success: boolean; syncedCount: number; message?: string }> {
    if (this.isSyncing) return { success: false, syncedCount: 0, message: 'Sync already in progress' };

    const settings = this.getSettings();
    if (!settings.webAppUrl) {
      return { success: false, syncedCount: 0, message: 'No Apps Script Web App URL configured. Changes cached locally.' };
    }

    if (!navigator.onLine) {
      return { success: false, syncedCount: 0, message: 'You are currently offline. Changes are saved locally and will sync when reconnected.' };
    }

    this.isSyncing = true;
    this.notify();
    const mutations = this.getMutations();
    const pending = mutations.filter((m) => m.status === 'pending');

    if (pending.length === 0) {
      this.isSyncing = false;
      this.notify();
      return { success: true, syncedCount: 0, message: 'All changes are already in sync.' };
    }

    let successCount = 0;

    for (const item of pending) {
      try {
        item.status = 'syncing';
        const res = await fetch(settings.webAppUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: item.action,
            ...item.payload,
          }),
        });

        if (res.ok) {
          let data: any = null;
          try {
            data = await res.json();
          } catch {}

          if (data && data.status === 'error') {
            item.status = 'failed';
            item.error = data.message || 'Google Sheets returned error';
          } else {
            item.status = 'synced';
            successCount++;
          }
        } else {
          item.status = 'failed';
          item.error = `HTTP ${res.status}`;
        }
      } catch (err: any) {
        item.status = 'failed';
        item.error = err.message || 'Network request failed';
      }
    }

    // Keep only failed or recent mutations
    const remaining = mutations.filter((m) => m.status !== 'synced');
    this.saveMutations(remaining);

    this.saveSettings({ lastSyncedAt: Date.now() });
    this.isSyncing = false;
    this.notify();

    return {
      success: successCount > 0,
      syncedCount: successCount,
      message: `Successfully pushed ${successCount} change(s) to Google Sheets.`,
    };
  }

  public async pullFromGoogleSheets(): Promise<{
    success: boolean;
    message: string;
    habitsCount?: number;
    pomodoroCount?: number;
  }> {
    const settings = this.getSettings();
    const url = settings.webAppUrl || appConfig.apiBaseUrl;

    if (!url) {
      return { success: false, message: 'No Apps Script Web App URL configured.' };
    }

    if (!navigator.onLine) {
      return { success: false, message: 'Device is offline. Local cached data is active.' };
    }

    try {
      let pulledHabitsCount = 0;
      let pulledPomodoroCount = 0;

      // 1. Pull habits from Monthly_Habit_Tracker
      const habitsUrl = url.includes('?') ? `${url}&action=getHabits` : `${url}?action=getHabits`;
      const habitsRes = await fetch(habitsUrl, { method: 'GET' });
      if (habitsRes.ok) {
        const habitsData = await habitsRes.json();
        if (habitsData.status === 'success' && Array.isArray(habitsData.habits)) {
          const localHabits = this.getHabits();
          habitsData.habits.forEach((remote: any) => {
            const found = localHabits.find(
              (h) =>
                Number(h.id) === Number(remote.id) ||
                h.description.trim().toLowerCase() === String(remote.description || '').trim().toLowerCase()
            );
            if (found) {
              found.checks = (remote.checks || []).slice(0, 31).map((c: any) => c === true || c === 'TRUE' || c === 1);
              found.totalDone = found.checks.filter(Boolean).length;
              found.completionPct = Math.round((found.totalDone / found.targetDays) * 100);
              if (found.totalDone >= found.targetDays) found.status = '🏆 Target Achieved';
              else if (found.totalDone >= 15) found.status = '⚡ Strong Streak';
              else if (found.totalDone > 0) found.status = '✅ Active';
              else found.status = '⚪ Not Started';
              pulledHabitsCount++;
            } else if (remote.description && String(remote.description).trim() !== '') {
              const newChecks = (remote.checks || []).slice(0, 31).map((c: any) => c === true || c === 'TRUE' || c === 1);
              localHabits.push({
                id: Number(remote.id) || (localHabits.length + 1),
                category: remote.category || 'Health, Fitness & Sleep',
                description: remote.description,
                targetDays: Number(remote.targetDays) || 22,
                checks: newChecks.length === 31 ? newChecks : new Array(31).fill(false),
                totalDone: Number(remote.totalDone) || newChecks.filter(Boolean).length,
                completionPct: Number(remote.completionPct) || 0,
                status: remote.status || '⚪ Not Started',
              });
              pulledHabitsCount++;
            }
          });
          this.saveHabits(localHabits);
        }
      }

      // 2. Pull Pomodoro sessions from Pomodoro_Tracker if supported by endpoint
      try {
        const deletedKeys: string[] = JSON.parse(
          localStorage.getItem('nextstudy_deleted_pomodoro_keys') || '[]'
        );
        const pomoUrl = url.includes('?') ? `${url}&action=getPomodoro` : `${url}?action=getPomodoro`;
        const pomoRes = await fetch(pomoUrl, { method: 'GET' });
        if (pomoRes.ok && !deletedKeys.includes('ALL_CLEARED')) {
          const pomoData = await pomoRes.json();
          if (pomoData.status === 'success' && Array.isArray(pomoData.sessions)) {
            const localSessions = this.getPomodoroSessions();
            const existingKeys = new Set(
              localSessions.map((s) => `${s.date}_${s.taskGoal}_${s.minutes}`)
            );
            const existingIds = new Set(localSessions.map((s) => s.id));
            let added = 0;
            pomoData.sessions.forEach((s: any, idx: number) => {
              const key = `${s.date}_${s.taskGoal}_${s.minutes}`;
              const targetId = s.id ? String(s.id).trim() : '';

              if (deletedKeys.includes(key) || (targetId && deletedKeys.includes(targetId))) {
                return; // User explicitly deleted this session, do not re-import
              }

              if (!existingKeys.has(key)) {
                const finalId = targetId && !existingIds.has(targetId)
                  ? targetId
                  : `pomo-sheet-${s.date || 'd'}-${idx}`;
                existingIds.add(finalId);
                existingKeys.add(key);

                localSessions.unshift({
                  id: finalId,
                  date: s.date || new Date().toISOString().split('T')[0],
                  dayOfWeek: s.dayOfWeek || 'Unknown',
                  timeOfDay: s.timeOfDay || 'Morning 🌅',
                  category: s.category || 'DSA & LeetCode',
                  taskGoal: s.taskGoal || '',
                  completedPomodoros: Number(s.completedPomodoros || 1),
                  minutes: Number(s.minutes || 25),
                  hours: Number(s.hours || 0.42),
                  interruptions: Number(s.interruptions || 0),
                  quality: s.quality || 'High Flow',
                  notes: s.notes || '',
                  isPractice: s.isPractice ?? true,
                  synced: true,
                });
                added++;
              }
            });
            pulledPomodoroCount = added;
            this.savePomodoroSessions(localSessions);
          }
        }
      } catch {
        // Pomodoro get is optional/non-blocking
      }

      // 3. Pull Mistakes from ERROR_LOG if supported by endpoint
      let pulledMistakesCount = 0;
      try {
        const mistakesUrl = url.includes('?') ? `${url}&action=getMistakes` : `${url}?action=getMistakes`;
        const mistakesRes = await fetch(mistakesUrl, { method: 'GET' });
        if (mistakesRes.ok) {
          const mistakesData = await mistakesRes.json();
          if (mistakesData.status === 'success' && Array.isArray(mistakesData.mistakes)) {
            const localMistakes = this.getMistakes();
            const existingKeys = new Set(localMistakes.map((m) => `${m.subject}_${m.trap}`));
            mistakesData.mistakes.forEach((rem: any) => {
              const key = `${rem.subject}_${rem.trap}`;
              if (!existingKeys.has(key)) {
                localMistakes.unshift({
                  id: rem.id || `mistake-remote-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  date: rem.date || getLocalDateString(),
                  subject: rem.subject || 'General',
                  topic: rem.topic || '',
                  source: rem.source || 'Study',
                  severity: rem.severity || 'Medium',
                  trap: rem.trap || rem.error || '',
                  rootCause: rem.rootCause || rem.cause || '',
                  goldenRule: rem.goldenRule || rem.rule || '',
                  createdAt: rem.createdAt || new Date().toISOString(),
                });
                existingKeys.add(key);
                pulledMistakesCount++;
              }
            });
            this.saveMistakes(localMistakes);
          }
        }
      } catch {
        // Mistakes get is optional/non-blocking
      }

      // 4. Pull Syllabus Subtopics from Subject Sheets (Optimized: Core Active Subjects Only)
      let pulledSubjectsCount = 0;
      try {
        const localSubjects = this.getSubjects();
        const coreCodes = new Set(['Sub_DBMS', 'Sub_OS', 'Sub_COA', 'Sub_DSA']);
        let activeToPull = localSubjects.filter((s) => coreCodes.has(s.code));
        if (activeToPull.length === 0) {
          activeToPull = localSubjects.slice(0, 4);
        }

        await Promise.all(
          activeToPull.map(async (sub) => {
            try {
              const subUrl = url.includes('?')
                ? `${url}&action=getSyllabus&subject=${encodeURIComponent(sub.code)}`
                : `${url}?action=getSyllabus&subject=${encodeURIComponent(sub.code)}`;
              const subRes = await fetch(subUrl, { method: 'GET' });
              if (subRes.ok) {
                const subData = await subRes.json();
                if (subData.status === 'success' && Array.isArray(subData.topics)) {
                  let updatedAny = false;
                  subData.topics.forEach((remoteTopic: any) => {
                    const localTopic = sub.topics.find(
                      (t) =>
                        t.rowIndex === remoteTopic.rowIndex ||
                        t.subtopic.trim().toLowerCase() === String(remoteTopic.subtopic || '').trim().toLowerCase()
                    );
                    if (localTopic) {
                      if (typeof remoteTopic.theory === 'boolean') localTopic.theory = remoteTopic.theory;
                      if (typeof remoteTopic.practice === 'boolean') localTopic.practice = remoteTopic.practice;
                      if (typeof remoteTopic.pyq === 'boolean') localTopic.pyq = remoteTopic.pyq;
                      if (typeof remoteTopic.revisionCount === 'number') localTopic.revisionCount = remoteTopic.revisionCount;
                      if (remoteTopic.notes) localTopic.notes = remoteTopic.notes;
                      updatedAny = true;
                    }
                  });
                  if (updatedAny) {
                    sub.completedSubtopics = sub.topics.filter((t) => t.theory && t.practice && t.pyq).length;
                    pulledSubjectsCount++;
                  }
                }
              }
            } catch {
              // individual subject pull error is non-blocking
            }
          })
        );

        if (pulledSubjectsCount > 0) {
          this.saveSubjects(localSubjects);
        }
      } catch {
        // Syllabus get is optional/non-blocking
      }

      this.saveSettings({ lastSyncedAt: Date.now() });
      this.notify();

      return {
        success: true,
        message: `Synced with Google Sheets: updated ${pulledHabitsCount} habits${
          pulledPomodoroCount > 0 ? `, ${pulledPomodoroCount} sessions` : ''
        }${pulledMistakesCount > 0 ? `, ${pulledMistakesCount} mistake logs` : ''}${
          pulledSubjectsCount > 0 ? `, ${pulledSubjectsCount} subjects syllabus` : ''
        }.`,
        habitsCount: pulledHabitsCount,
        pomodoroCount: pulledPomodoroCount,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Sync pull failed: ${err.message || 'Network error'}`,
      };
    }
  }

  public async testConnection(url: string): Promise<{ success: boolean; message: string }> {
    if (!url) return { success: false, message: 'Please enter a valid Apps Script Web App URL.' };
    try {
      const testUrl = url.includes('?') ? `${url}&action=getHabits` : `${url}?action=getHabits`;
      const res = await fetch(testUrl, { method: 'GET' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            message: 'Apps Script is running an outdated script. Please update Code.gs and deploy a New Version.',
          };
        }
        return { success: false, message: `Server returned status ${res.status}. Verify deployment permissions ('Anyone').` };
      }
      const data = await res.json();
      if (
        data &&
        (data.error === 'GET supports ping only' ||
          data.message?.includes('ping only') ||
          (data.status === 'error' && data.message?.includes('Unsupported')))
      ) {
        return {
          success: false,
          message: 'Apps Script is running an outdated script. Please update Code.gs and deploy a New Version.',
        };
      }
      if (data && data.status === 'success' && Array.isArray(data.habits)) {
        return {
          success: true,
          message: `Connected successfully! Retrieved ${data.habits.length} habits from Monthly_Habit_Tracker.`,
        };
      } else if (data && data.status === 'success') {
        return { success: true, message: 'Connected successfully to Master_100_Habit_Tracker!' };
      } else {
        return { success: true, message: 'Endpoint reached successfully!' };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Could not connect. Ensure the Web App is deployed with "Execute as: Me" and "Who has access: Anyone".',
      };
    }
  }

  // --- EISENHOWER PRIORITY MATRIX ---

  public getEisenhowerItems(): EisenhowerItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EISENHOWER);
      if (!data) {
        this.saveEisenhowerItems(INITIAL_EISENHOWER_ITEMS);
        return INITIAL_EISENHOWER_ITEMS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_EISENHOWER_ITEMS;
    }
  }

  public saveEisenhowerItems(items: EisenhowerItem[]) {
    localStorage.setItem(STORAGE_KEYS.EISENHOWER, JSON.stringify(items));
    this.notify();
  }

  public addEisenhowerItem(item: Omit<EisenhowerItem, 'id'>) {
    const items = this.getEisenhowerItems();
    const newItem: EisenhowerItem = {
      ...item,
      id: `eise-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    items.push(newItem);
    this.saveEisenhowerItems(items);
    return newItem;
  }

  public deleteEisenhowerItem(id: string) {
    const items = this.getEisenhowerItems().filter((i) => i.id !== id);
    this.saveEisenhowerItems(items);
  }

  public resetAllToSeed() {
    localStorage.removeItem(STORAGE_KEYS.HABITS);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    localStorage.removeItem(STORAGE_KEYS.POMODORO);
    localStorage.removeItem(STORAGE_KEYS.MUTATIONS);
    localStorage.removeItem(STORAGE_KEYS.EISENHOWER);
    this.getHabits();
    this.getSubjects();
    this.getPomodoroSessions();
    this.getEisenhowerItems();
    this.notify();
  }

  public exportDataJSON(): string {
    const payload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      habits: this.getHabits(),
      subjects: this.getSubjects(),
      pomodoroSessions: this.getPomodoroSessions(),
      settings: this.getSettings(),
    };
    return JSON.stringify(payload, null, 2);
  }
}

export const storageService = new StorageService();
