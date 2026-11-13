/**
 * Exam Target Dates Service
 * Stores user-editable exam targets in localStorage ('nextstudy_exam_targets_v1')
 */

export interface ExamTargetItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  badge?: string;
  isDeletable?: boolean;
}

export interface ExamTargets {
  sem3Date: string; // YYYY-MM-DD
  gateDate: string; // YYYY-MM-DD
  sem3Title?: string;
  gateTitle?: string;
  customTargets?: ExamTargetItem[];
}

const STORAGE_KEY = 'nextstudy_exam_targets_v1';

const DEFAULT_TARGETS: ExamTargets = {
  sem3Date: '2026-12-15',
  gateDate: '2028-02-05',
  sem3Title: 'BWU SEM 3 FINALS',
  gateTitle: 'GATE CSE 2028',
  customTargets: [
    {
      id: 'rrb-target',
      title: 'RRB NTPC & JE Technical',
      date: '2027-04-10',
      badge: 'Railways Govt Exam',
      isDeletable: true,
    },
    {
      id: 'ssc-target',
      title: 'SSC CGL Tier 1',
      date: '2027-09-18',
      badge: 'Staff Selection Commission',
      isDeletable: true,
    },
  ],
};

type Listener = (targets: ExamTargets) => void;
const listeners: Set<Listener> = new Set();

export const examTargetService = {
  getTargets(): ExamTargets {
    if (typeof window === 'undefined') return DEFAULT_TARGETS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          sem3Date: parsed.sem3Date || DEFAULT_TARGETS.sem3Date,
          gateDate: parsed.gateDate || DEFAULT_TARGETS.gateDate,
          sem3Title: parsed.sem3Title || DEFAULT_TARGETS.sem3Title,
          gateTitle: parsed.gateTitle || DEFAULT_TARGETS.gateTitle,
          customTargets: Array.isArray(parsed.customTargets)
            ? parsed.customTargets
            : DEFAULT_TARGETS.customTargets,
        };
      }
    } catch (e) {
      console.warn('Failed to parse exam targets from localStorage:', e);
    }
    return DEFAULT_TARGETS;
  },

  getAllTargets(): ExamTargetItem[] {
    const t = this.getTargets();
    const list: ExamTargetItem[] = [
      {
        id: 'sem3',
        title: t.sem3Title || 'Semester 3 Finals',
        date: t.sem3Date,
        badge: 'College Semester',
        isDeletable: false,
      },
      {
        id: 'gate',
        title: t.gateTitle || 'GATE CSE 2028',
        date: t.gateDate,
        badge: 'National Competitive',
        isDeletable: false,
      },
      ...(t.customTargets || []),
    ];
    return list;
  },

  addCustomTarget(item: { title: string; date: string; badge?: string }): ExamTargetItem {
    const current = this.getTargets();
    const newTarget: ExamTargetItem = {
      id: `exam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: item.title.trim(),
      date: item.date,
      badge: item.badge?.trim() || 'Target Exam',
      isDeletable: true,
    };
    const customList = current.customTargets ? [...current.customTargets] : [];
    customList.push(newTarget);
    this.saveTargets({ customTargets: customList });
    return newTarget;
  },

  deleteCustomTarget(targetId: string): void {
    const current = this.getTargets();
    if (!current.customTargets) return;
    const filtered = current.customTargets.filter((t) => t.id !== targetId);
    this.saveTargets({ customTargets: filtered });
  },

  saveTargets(newTargets: Partial<ExamTargets>): ExamTargets {
    const current = this.getTargets();
    const updated: ExamTargets = {
      ...current,
      ...newTargets,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save exam targets:', e);
    }
    listeners.forEach((fn) => fn(updated));
    return updated;
  },

  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  calculateRemaining(dateStr: string) {
    if (!dateStr) return { days: 0, hours: 0, mins: 0, secs: 0, isOverdue: true };
    const now = Date.now();
    const cleanDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T09:00:00`;
    const targetDate = new Date(cleanDateStr);
    const targetTime = isNaN(targetDate.getTime()) ? new Date(dateStr).getTime() : targetDate.getTime();
    if (isNaN(targetTime)) {
      return { days: 0, hours: 0, mins: 0, secs: 0, isOverdue: true };
    }
    const diff = targetTime - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, mins: 0, secs: 0, isOverdue: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, mins, secs, isOverdue: false };
  },

  formatDisplayDate(dateStr: string) {
    if (!dateStr) return '';
    try {
      const cleanDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
      const d = new Date(cleanDateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  },
};
