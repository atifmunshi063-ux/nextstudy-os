export type HabitCategory =
  | 'Health, Fitness & Sleep'
  | 'Academics, Semester & Core Engineering'
  | 'DSA, LeetCode & Competitive Coding'
  | 'Systems, Projects & Dev Skills'
  | 'GATE CSE & Competitive Exam Practice'
  | 'Mindset, Discipline, Reading & Routine';

/**
 * Canonical Habit Entity (Decoupled from 31-day array)
 */
export interface HabitEntity {
  id: string;
  numId?: number; // legacy row mapping 1..100
  name: string;
  category: HabitCategory;
  targetPerWeek?: number;
  targetDays: number;
  active: boolean;
  createdAt: string;
  archivedAt?: string;
  order?: number;
}

/**
 * Canonical Habit Log (One record per habit per day)
 */
export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * UI Habit Projection (View Model with checks array for high-speed UI render)
 */
export interface Habit {
  id: number;
  uuid?: string;
  category: HabitCategory;
  description: string;
  targetDays: number;
  checks: boolean[]; // 31 days (index 0 = Day 1)
  totalDone: number;
  completionPct: number;
  status: '🏆 Target Achieved' | '⚡ Strong Streak' | '✅ Active' | '⚪ Not Started';
}

export type PomodoroCategory =
  | 'DSA & LeetCode'
  | 'Semester 3 Core'
  | 'GATE CSE Theory'
  | 'Systems & Dev'
  | 'Aptitude & Placement'
  | 'Revision & Mock';

export type PomodoroQuality = 'High Flow' | 'Solid' | 'Distracted';

export interface PomodoroSession {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  timeOfDay: 'Morning 🌅' | 'Afternoon ☀️' | 'Evening 🌆' | 'Late Night 🌙';
  category: PomodoroCategory;
  taskGoal: string;
  completedPomodoros: number;
  minutes: number;
  hours: number;
  interruptions: number;
  quality: PomodoroQuality;
  notes: string;
  isPractice?: boolean; // For 70/30 practice-to-theory auditor
  synced?: boolean;
  subjectId?: string;
  topicId?: string;
  taskId?: string;
  createdAt?: string;
}

export type AcademicTierId = 'tier1_sem3' | 'tier2_placements' | 'tier3_gate' | 'tier4_rrb' | 'tier5_ssc';

export interface AcademicTier {
  id: AcademicTierId;
  name: string;
  shortTitle: string;
  description: string;
  subjectCodes: string[];
}

export interface SyllabusSubtopic {
  id: string;
  rowIndex: number;
  unit: string;
  topic: string;
  subtopic: string;
  priority: 'High' | 'Medium' | 'Low';
  theory: boolean;
  practice: boolean;
  pyq: boolean;
  revisionCount: number; // Ebbinghaus spaced interval counter
  notes?: string;
}

export interface SyllabusSubject {
  code: string; // Exact Sub_* sheet name
  name: string;
  tierId: AcademicTierId;
  semesterOrDomain?: string;
  totalSubtopics: number;
  completedSubtopics: number;
  topics: SyllabusSubtopic[];
}

/**
 * Task Model for Planner & Daily Execution
 */
export interface Task {
  id: string;
  title: string;
  type: 'study' | 'revision' | 'assignment' | 'coding' | 'mock' | 'personal';
  subjectId?: string;
  topicId?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  actualMinutes?: number;
  dueDate?: string;
  scheduledDate?: string;
  status: 'todo' | 'in_progress' | 'done' | 'skipped';
  source?: 'manual' | 'planner' | 'ai';
  createdAt: string;
  updatedAt: string;
}

/**
 * Ebbinghaus Spaced Repetition Revision Model
 */
export interface RevisionItem {
  id: string;
  topicId: string;
  subjectCode: string;
  topicTitle: string;
  lastStudiedAt: string;
  nextRevisionAt: string;
  intervalDays: number;
  repetition: number;
  difficulty: 'easy' | 'medium' | 'hard';
  recallScore?: number;
  status: 'scheduled' | 'due' | 'overdue' | 'mastered';
  notes?: string;
}

/**
 * Mock Test Assessment Model
 */
export interface MockTest {
  id: string;
  title: string;
  exam: 'semester' | 'gate' | 'placement' | 'custom';
  date: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  score?: number;
  durationMinutes?: number;
  subjectCodes: string[];
  notes?: string;
  createdAt: string;
}

/**
 * Error Log for Targeted Improvement
 */
export interface ErrorLog {
  id: string;
  subjectCode?: string;
  topicTitle?: string;
  mockTestId?: string;
  question: string;
  errorType: 'concept' | 'calculation' | 'careless' | 'memory' | 'time' | 'strategy';
  explanation?: string;
  corrected: boolean;
  retryDate?: string;
  createdAt: string;
}

/**
 * DSA Coding Problem Tracker
 */
export interface CodingProblem {
  id: string;
  topic: string; // e.g. Arrays, Trees, Graphs, DP
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  platform: 'LeetCode' | 'GFG' | 'CodeStudio' | 'Other';
  url?: string;
  status: 'todo' | 'attempted' | 'solved';
  solvedDate?: string;
  attempts: number;
  notes?: string;
  createdAt: string;
}

/**
 * Canonical Cloud/Offline Sync Record
 */
export interface SyncRecord {
  id: string;
  entity: 'habit' | 'habitLog' | 'subject' | 'subtopic' | 'pomodoro' | 'task' | 'revision' | 'mockTest' | 'errorLog';
  entityId: string;
  operation: 'create' | 'update' | 'delete' | 'toggleHabit';
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'synced';
  lastError?: string;
}

export interface MistakeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  topic: string;
  source: string;
  severity: 'High' | 'Medium' | 'Low';
  trap: string; // 1. ❌ What I Did Wrong (The Trap)
  rootCause: string; // 2. 🔍 Root Cause Analysis (Why the logic failed)
  goldenRule: string; // 3. 💡 Permanent Corrective Rule (The unbreakable takeaway)
  createdAt: string;
}

export interface SyncMutation {
  id: string;
  timestamp: number;
  action:
    | 'toggleHabit'
    | 'logPomodoro'
    | 'updateSyllabus'
    | 'addHabit'
    | 'addSubtopic'
    | 'logMistake'
    | 'deleteHabit'
    | 'deleteSubtopic'
    | 'deletePomodoro'
    | 'deleteMistake'
    | 'createSubjectSheet'
    | 'createExamSheet'
    | 'deleteSubjectSheet'
    | 'logQuestion';
  payload: any;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error?: string;
}

export interface SyncSettings {
  webAppUrl: string;
  spreadsheetId: string;
  autoSync: boolean;
  lastSyncedAt: number | null;
}

export interface EisenhowerItem {
  id: string;
  title: string;
  quadrant: 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'neither';
  category: string;
  deadline?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  institution: string;
  degree: string;
  semester: number;
  timezone: string;
  targetExams: string[];
  createdAt: string;
}

