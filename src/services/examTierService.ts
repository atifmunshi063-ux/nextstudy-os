import { SyllabusSubject } from '../types';

/**
 * Exam Tier Service
 * Allows users to add other exams (ISRO, UPSC, BARC, CAT, Semester 4, etc.)
 * and manage subjects dynamically under each exam.
 */

export interface CustomExamTier {
  id: string;
  label: string;
  icon: string;
  description: string;
  subjects: string[];
  isCustom?: boolean;
}

const STORAGE_KEY = 'nextstudy_exam_tiers_v1';

export const DEFAULT_EXAM_TIERS: CustomExamTier[] = [
  {
    id: 'semester',
    label: '🎓 Semester',
    icon: '🎓',
    subjects: ['Sub_DBMS', 'Sub_OS', 'Sub_COA', 'Sub_Python', 'Sub_ProbStats', 'Sub_DiscreteMath'],
    description: 'Brainware Univ CSE Semester 3 Core Engineering',
    isCustom: false,
  },
  {
    id: 'placement',
    label: '💼 Placement',
    icon: '💼',
    subjects: [
      'Sub_DSA',
      'Sub_Cpp',
      'Sub_Java',
      'Sub_OS',
      'Sub_DBMS',
      'Sub_CN',
      'Sub_WebDev',
      'Sub_SystemDesign',
      'Sub_InterviewPrep',
      'Sub_Aptitude',
    ],
    description: 'Campus Placement, LeetCode & Coding Interviews',
    isCustom: false,
  },
  {
    id: 'gate',
    label: '🚀 GATE',
    icon: '🚀',
    subjects: [
      'Sub_TOC',
      'Sub_Algorithms',
      'Sub_OS',
      'Sub_DBMS',
      'Sub_CN',
      'Sub_COA',
      'Sub_DiscreteMath',
    ],
    description: 'GATE CSE 2028 Core Theory & Depth',
    isCustom: false,
  },
  {
    id: 'rrb',
    label: '🚆 RRB',
    icon: '🚆',
    subjects: ['Sub_GenScience', 'Sub_Reasoning', 'Sub_AdvMath', 'Sub_GK_Current'],
    description: 'Railway Recruitment Board (RRB NTPC & JE Technical)',
    isCustom: false,
  },
  {
    id: 'ssc',
    label: '🏛️ SSC',
    icon: '🏛️',
    subjects: ['Sub_AdvMath', 'Sub_Reasoning', 'Sub_GenScience', 'Sub_GK_Current'],
    description: 'Staff Selection Commission (SSC CGL & CHSL Engineering Services)',
    isCustom: false,
  },
];

type Listener = (tiers: CustomExamTier[]) => void;
const listeners: Set<Listener> = new Set();

export const examTierService = {
  getTiers(): CustomExamTier[] {
    if (typeof window === 'undefined') return DEFAULT_EXAM_TIERS;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed: CustomExamTier[] = JSON.parse(data);
        // Ensure default tiers are always present and updated with default core shared subjects
        let updated = false;
        DEFAULT_EXAM_TIERS.forEach((def) => {
          const found = parsed.find((t) => t.id === def.id);
          if (!found) {
            parsed.push(def);
            updated = true;
          } else {
            def.subjects.forEach((s) => {
              if (!found.subjects.includes(s)) {
                found.subjects.push(s);
                updated = true;
              }
            });
          }
        });
        if (updated) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse custom exam tiers:', e);
    }
    return DEFAULT_EXAM_TIERS;
  },

  saveTiers(tiers: CustomExamTier[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tiers));
    } catch (e) {
      console.warn('Failed to save exam tiers:', e);
    }
    listeners.forEach((fn) => fn(tiers));
  },

  getUnlinkedSubjectsForTier(tierId: string, allSubjects?: SyllabusSubject[]): SyllabusSubject[] {
    const tiers = this.getTiers();
    const target = tiers.find((t) => t.id === tierId);
    const linkedCodes = new Set(target ? target.subjects : []);

    let subjects = allSubjects;
    if (!subjects && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('nextstudy_subjects_v2');
        if (raw) subjects = JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to parse subjects in getUnlinkedSubjectsForTier:', e);
      }
    }
    return (subjects || []).filter((s) => !linkedCodes.has(s.code));
  },

  addExamTier(
    name: string,
    icon: string = '🎯',
    description: string = 'Exam Syllabus & PYQs',
    initialSubjectCode?: string
  ): CustomExamTier {
    const tiers = this.getTiers();
    const cleanId = `exam_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10)}`;
    const newTier: CustomExamTier = {
      id: cleanId,
      label: `${icon} ${name.trim()}`,
      icon,
      description: description.trim(),
      subjects: initialSubjectCode ? [initialSubjectCode] : [],
      isCustom: true,
    };
    tiers.push(newTier);
    this.saveTiers(tiers);
    return newTier;
  },

  deleteExamTier(tierId: string): boolean {
    const tiers = this.getTiers();
    const target = tiers.find((t) => t.id === tierId);
    if (!target || !target.isCustom) return false;
    const filtered = tiers.filter((t) => t.id !== tierId);
    this.saveTiers(filtered);
    return true;
  },

  addSubjectToTier(tierId: string, subjectCode: string): void {
    const tiers = this.getTiers();
    const target = tiers.find((t) => t.id === tierId);
    if (!target) return;
    if (!target.subjects.includes(subjectCode)) {
      target.subjects.push(subjectCode);
      this.saveTiers(tiers);
    }
  },

  removeSubjectFromTier(tierId: string, subjectCode: string): void {
    const tiers = this.getTiers();
    const target = tiers.find((t) => t.id === tierId);
    if (!target) return;
    target.subjects = target.subjects.filter((c) => c !== subjectCode);
    this.saveTiers(tiers);
  },

  removeMultipleSubjectsFromTier(tierId: string, subjectCodes: string[]): void {
    const tiers = this.getTiers();
    const target = tiers.find((t) => t.id === tierId);
    if (!target) return;
    const toRemove = new Set(subjectCodes);
    target.subjects = target.subjects.filter((c) => !toRemove.has(c));
    this.saveTiers(tiers);
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
