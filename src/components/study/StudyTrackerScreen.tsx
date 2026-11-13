import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SyllabusSubject, SyllabusSubtopic } from '../../types';
import { storageService } from '../../services/storage';
import { soundService } from '../../services/audio';
import { examTierService, CustomExamTier } from '../../services/examTierService';
import { AddSubtopicModal } from '../syllabus/AddSubtopicModal';
import { AddExamModal } from './AddExamModal';
import { AddSubjectModal } from './AddSubjectModal';
import { SmartSubjectDeleteModal } from './SmartSubjectDeleteModal';
import { SubtopicActionMenu } from './SubtopicActionMenu';
import { SubjectActionMenu } from './SubjectActionMenu';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  Check,
  Search,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Rocket,
  Train,
  Landmark,
  Trash2,
  FolderPlus,
  CheckSquare,
  Square,
  ListChecks,
  X,
  Link2Off,
  CloudOff,
  CheckCheck,
} from 'lucide-react';

interface StudyTrackerScreenProps {
  subjects: SyllabusSubject[];
  onSubjectsChange: () => void;
  initialSelectedSubjectCode?: string;
  onNavigateTab?: (tab: number) => void;
}

export const StudyTrackerScreen: React.FC<StudyTrackerScreenProps> = ({
  subjects,
  onSubjectsChange,
  initialSelectedSubjectCode,
  onNavigateTab,
}) => {
  const [tiers, setTiers] = useState<CustomExamTier[]>(() => examTierService.getTiers());
  const [activeTierId, setActiveTierId] = useState<string>('semester');
  const [selectedCode, setSelectedCode] = useState<string>(
    initialSelectedSubjectCode || 'Sub_DBMS'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'incomplete'>('all');

  // Modals state
  const [isAddSubtopicOpen, setIsAddSubtopicOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'subtopic' | 'exam';
    id: string;
    title: string;
    name: string;
    message: string;
  } | null>(null);

  const [subjectToDelete, setSubjectToDelete] = useState<{
    code: string;
    name: string;
  } | null>(null);

  // Subtopics bulk selection
  const [selectedSubtopicIds, setSelectedSubtopicIds] = useState<Set<string>>(new Set());

  // Subjects bulk batch mode
  const [isSubjectBatchMode, setIsSubjectBatchMode] = useState<boolean>(false);
  const [selectedSubjectCodes, setSelectedSubjectCodes] = useState<Set<string>>(new Set());

  // Bulk action confirmation modal
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [bulkActionTarget, setBulkActionTarget] = useState<'subtopics' | 'subjects_unlink' | 'subjects_permanent' | null>(null);

  // Subscribe to exam tiers updates
  useEffect(() => {
    const unsubscribe = examTierService.subscribe((updatedTiers) => {
      setTiers(updatedTiers);
    });
    return () => unsubscribe();
  }, []);

  // Active subjects from storage
  const activeSubjects = useMemo(() => {
    if (subjects && subjects.length > 0) return subjects;
    return storageService.getSubjects();
  }, [subjects]);

  // Current tier configuration
  const currentTier = useMemo(() => {
    return tiers.find((t) => t.id === activeTierId) || tiers[0] || {
      id: 'semester',
      label: '🎓 Semester',
      icon: '🎓',
      description: 'College Semester',
      subjects: ['Sub_DBMS'],
    };
  }, [tiers, activeTierId]);

  // Ensure selected subject belongs to the active tier (or fallback to first available)
  useEffect(() => {
    if (currentTier.subjects.length > 0 && !currentTier.subjects.includes(selectedCode)) {
      setSelectedCode(currentTier.subjects[0]);
    }
  }, [activeTierId, currentTier, selectedCode]);

  // Current subject data
  const currentSubject = useMemo(() => {
    return (
      activeSubjects.find((s) => s.code === selectedCode) ||
      activeSubjects[0] || {
        code: 'Sub_DBMS',
        name: 'Database Management Systems',
        tierId: 'tier1_sem3',
        totalSubtopics: 0,
        completedSubtopics: 0,
        topics: [],
      }
    );
  }, [activeSubjects, selectedCode]);

  // Group subtopics by Unit
  const unitsGrouped = useMemo(() => {
    const map = new Map<string, SyllabusSubtopic[]>();
    currentSubject.topics.forEach((t) => {
      const unitName = t.unit || 'Unit 1: Core Fundamentals';
      if (!map.has(unitName)) map.set(unitName, []);
      map.get(unitName)!.push(t);
    });
    return Array.from(map.entries());
  }, [currentSubject]);

  // Compute 3-Stage Checklist stats: Theory (33%), Practice (67%), PYQ (100%)
  const stats = useMemo(() => {
    const list = currentSubject.topics;
    const total = Math.max(1, list.length);
    const theoryDone = list.filter((t) => t.theory).length;
    const practiceDone = list.filter((t) => t.practice).length;
    const pyqDone = list.filter((t) => t.pyq).length;

    const totalPoints = theoryDone * 1 + practiceDone * 1 + pyqDone * 1;
    const maxPoints = total * 3;
    const masteryPct = Math.round((totalPoints / maxPoints) * 100);

    const theoryPct = Math.round((theoryDone / total) * 100);
    const practicePct = Math.round((practiceDone / total) * 100);
    const pyqPct = Math.round((pyqDone / total) * 100);

    return {
      total: list.length,
      theoryDone,
      practiceDone,
      pyqDone,
      theoryPct,
      practicePct,
      pyqPct,
      masteryPct,
    };
  }, [currentSubject]);

  const handleToggleCheck = (subtopicId: string, stage: 'theory' | 'practice' | 'pyq') => {
    soundService.playCheckSound();
    const topic = currentSubject.topics.find((t) => t.id === subtopicId);
    if (!topic) return;

    const nextVal = !topic[stage];
    storageService.updateSubtopic(currentSubject.code, subtopicId, {
      [stage]: nextVal,
    });
    onSubjectsChange();
  };

  const handleRevisionDelta = (subtopicId: string, delta: number) => {
    const topic = currentSubject.topics.find((t) => t.id === subtopicId);
    if (!topic) return;

    const currentCount = topic.revisionCount || 0;
    const nextCount = Math.max(0, currentCount + delta);
    storageService.updateSubtopic(currentSubject.code, subtopicId, {
      revisionCount: nextCount,
    });
    onSubjectsChange();
  };

  const handleAddSubtopic = (
    unit: string,
    topic: string,
    subtopic: string,
    priority: 'High' | 'Medium' | 'Low'
  ) => {
    storageService.addSubtopic(currentSubject.code, unit, topic, subtopic, priority);
    onSubjectsChange();
  };

  const executeDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'subtopic') {
      storageService.deleteSubtopic(currentSubject.code, deleteTarget.id);
      onSubjectsChange();
    } else if (deleteTarget.type === 'exam') {
      examTierService.deleteExamTier(deleteTarget.id);
      setActiveTierId('semester');
    }
    setDeleteTarget(null);
  };

  const subjectLinkedTiers = useMemo(() => {
    if (!subjectToDelete) return [];
    return tiers
      .filter((t) => t.subjects.includes(subjectToDelete.code))
      .map((t) => ({ id: t.id, label: t.label }));
  }, [subjectToDelete, tiers]);

  const handleUnlinkSubject = () => {
    if (!subjectToDelete) return;
    const code = subjectToDelete.code;
    examTierService.removeSubjectFromTier(activeTierId, code);
    const updatedTiers = examTierService.getTiers();
    setTiers(updatedTiers);
    const current = updatedTiers.find((t) => t.id === activeTierId);
    const remaining = current?.subjects || [];
    setSelectedCode(remaining.length > 0 ? remaining[0] : '');
    setSubjectToDelete(null);
    onSubjectsChange();
  };

  const handleDeleteSubjectPermanently = () => {
    if (!subjectToDelete) return;
    const code = subjectToDelete.code;
    storageService.deleteSubject(code, true);
    const updatedTiers = examTierService.getTiers();
    setTiers(updatedTiers);
    const current = updatedTiers.find((t) => t.id === activeTierId);
    const remaining = current?.subjects || [];
    setSelectedCode(remaining.length > 0 ? remaining[0] : '');
    setSubjectToDelete(null);
    onSubjectsChange();
  };

  // Clear subtopics selection when active subject changes
  useEffect(() => {
    setSelectedSubtopicIds(new Set());
  }, [selectedCode, activeTierId]);

  // All filtered subtopics IDs
  const allFilteredSubtopicIds = useMemo(() => {
    return currentSubject.topics
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !item.topic.toLowerCase().includes(q) &&
            !item.subtopic.toLowerCase().includes(q) &&
            !item.unit.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        if (filterMode === 'incomplete') {
          return !(item.theory && item.practice && item.pyq);
        }
        if (filterMode === 'due') {
          return (item.revisionCount || 0) < 2;
        }
        return true;
      })
      .map((t) => t.id);
  }, [currentSubject.topics, searchQuery, filterMode]);

  const handleSelectAllSubtopics = () => {
    if (selectedSubtopicIds.size >= allFilteredSubtopicIds.length && allFilteredSubtopicIds.length > 0) {
      setSelectedSubtopicIds(new Set());
    } else {
      setSelectedSubtopicIds(new Set(allFilteredSubtopicIds));
    }
  };

  const toggleSelectSubtopic = (id: string) => {
    setSelectedSubtopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMarkSubtopicsDone = () => {
    if (selectedSubtopicIds.size === 0) return;
    storageService.markMultipleSubtopics(
      currentSubject.code,
      Array.from(selectedSubtopicIds),
      { theory: true, practice: true, pyq: true }
    );
    setSelectedSubtopicIds(new Set());
    onSubjectsChange();
  };

  const handleBulkDeleteSubtopicsConfirm = () => {
    if (selectedSubtopicIds.size === 0) return;
    storageService.deleteMultipleSubtopics(
      currentSubject.code,
      Array.from(selectedSubtopicIds)
    );
    setSelectedSubtopicIds(new Set());
    setIsBulkDeleteModalOpen(false);
    setBulkActionTarget(null);
    onSubjectsChange();
  };

  // Subjects batch handlers
  const handleSelectAllSubjects = () => {
    if (selectedSubjectCodes.size >= currentTier.subjects.length && currentTier.subjects.length > 0) {
      setSelectedSubjectCodes(new Set());
    } else {
      setSelectedSubjectCodes(new Set(currentTier.subjects));
    }
  };

  const toggleSelectSubject = (code: string) => {
    setSelectedSubjectCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleBulkUnlinkSubjectsConfirm = () => {
    if (selectedSubjectCodes.size === 0) return;
    examTierService.removeMultipleSubjectsFromTier(
      activeTierId,
      Array.from(selectedSubjectCodes)
    );
    const updatedTiers = examTierService.getTiers();
    setTiers(updatedTiers);
    const current = updatedTiers.find((t) => t.id === activeTierId);
    const remaining = current?.subjects || [];
    setSelectedCode(remaining.length > 0 ? remaining[0] : '');
    setSelectedSubjectCodes(new Set());
    setIsSubjectBatchMode(false);
    setIsBulkDeleteModalOpen(false);
    setBulkActionTarget(null);
    onSubjectsChange();
  };

  const handleBulkDeleteSubjectsEverywhereConfirm = () => {
    if (selectedSubjectCodes.size === 0) return;
    storageService.deleteMultipleSubjects(
      Array.from(selectedSubjectCodes),
      true
    );
    const updatedTiers = examTierService.getTiers();
    setTiers(updatedTiers);
    const current = updatedTiers.find((t) => t.id === activeTierId);
    const remaining = current?.subjects || [];
    setSelectedCode(remaining.length > 0 ? remaining[0] : '');
    setSelectedSubjectCodes(new Set());
    setIsSubjectBatchMode(false);
    setIsBulkDeleteModalOpen(false);
    setBulkActionTarget(null);
    onSubjectsChange();
  };

  // Mobile Long Press Handlers for Subtopics
  const subtopicTouchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subtopicTouchStartedRef = useRef<boolean>(false);

  const handleSubtopicTouchStart = (id: string) => {
    // If already in selection mode, immediate tap selects/deselects
    if (selectedSubtopicIds.size > 0) return;

    subtopicTouchStartedRef.current = true;
    subtopicTouchTimerRef.current = setTimeout(() => {
      if (subtopicTouchStartedRef.current) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate?.(45);
          } catch {
            // ignore
          }
        }
        toggleSelectSubtopic(id);
      }
    }, 450);
  };

  const handleSubtopicTouchEnd = () => {
    subtopicTouchStartedRef.current = false;
    if (subtopicTouchTimerRef.current) {
      clearTimeout(subtopicTouchTimerRef.current);
      subtopicTouchTimerRef.current = null;
    }
  };

  const handleSubtopicTouchMove = () => {
    subtopicTouchStartedRef.current = false;
    if (subtopicTouchTimerRef.current) {
      clearTimeout(subtopicTouchTimerRef.current);
      subtopicTouchTimerRef.current = null;
    }
  };

  // Mobile Long Press Handlers for Subject Pills
  const subjectTouchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subjectTouchStartedRef = useRef<boolean>(false);

  const handleSubjectTouchStart = (code: string) => {
    if (isSubjectBatchMode) return;

    subjectTouchStartedRef.current = true;
    subjectTouchTimerRef.current = setTimeout(() => {
      if (subjectTouchStartedRef.current) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate?.(45);
          } catch {
            // ignore
          }
        }
        setIsSubjectBatchMode(true);
        setSelectedSubjectCodes(new Set([code]));
      }
    }, 450);
  };

  const handleSubjectTouchEnd = () => {
    subjectTouchStartedRef.current = false;
    if (subjectTouchTimerRef.current) {
      clearTimeout(subjectTouchTimerRef.current);
      subjectTouchTimerRef.current = null;
    }
  };

  const handleSubjectTouchMove = () => {
    subjectTouchStartedRef.current = false;
    if (subjectTouchTimerRef.current) {
      clearTimeout(subjectTouchTimerRef.current);
      subjectTouchTimerRef.current = null;
    }
  };

  // Circular ring calculation
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.masteryPct / 100) * circumference;

  return (
    <div className="space-y-4 pb-24 md:pb-12 max-w-5xl mx-auto font-mono text-slate-200">
      {/* 1. FLOATING / STICKY EXAM TIER SELECTOR BAR (WITH "+ ADD EXAM" BUTTON) */}
      <div className="sticky top-14 z-20 p-1.5 rounded-2xl bg-[#060A08]/95 backdrop-blur-md border border-[#16291C] shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tiers.map((tier) => {
            const isSelected = activeTierId === tier.id;
            return (
              <div key={tier.id} className="flex items-center shrink-0">
                <button
                  onClick={() => {
                    setActiveTierId(tier.id);
                    if (tier.subjects.length > 0) {
                      setSelectedCode(tier.subjects[0]);
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-500 text-black font-extrabold shadow-md shadow-emerald-950/60 scale-[1.02]'
                      : 'text-slate-400 hover:text-white bg-[#080E0B] border border-[#132418] hover:border-slate-700'
                  }`}
                >
                  <span>{tier.label}</span>
                </button>

                {tier.isCustom && isSelected && (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        type: 'exam',
                        id: tier.id,
                        title: 'Delete Custom Exam',
                        name: tier.label,
                        message: `Are you sure you want to remove the exam "${tier.label}" and its associated tier configuration?`,
                      })
                    }
                    title="Delete custom exam"
                    className="p-1.5 ml-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* (+) Add Other Exam Button */}
          <button
            onClick={() => setIsAddExamOpen(true)}
            className="py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap border border-dashed border-emerald-500/60 hover:border-emerald-400 bg-emerald-950/40 hover:bg-emerald-950 text-emerald-300 hover:text-white shrink-0"
            title="Add other exams (ISRO, UPSC, BARC, CAT, Sem 4, etc.)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Exam</span>
          </button>
        </div>
      </div>

      {/* 2. Horizontal Subject Pills within Active Tier */}
      <div className="p-3 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-md space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white uppercase">{currentTier.label} SUBJECTS:</span>
            <span className="text-emerald-400">{currentTier.description}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {currentTier.subjects.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setIsSubjectBatchMode((prev) => !prev);
                  setSelectedSubjectCodes(new Set());
                }}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isSubjectBatchMode
                    ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-md'
                    : 'bg-[#0c1610] hover:bg-[#122218] border-[#16291C] text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle batch selection of multiple subjects"
              >
                <ListChecks className="w-3 h-3" />
                <span>{isSubjectBatchMode ? 'Exit Batch Mode' : 'Select Multiple'}</span>
              </button>
            )}

            <button
              onClick={() => setIsAddSubjectOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-[#0c1610] hover:bg-[#122218] border border-emerald-600/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add Subject</span>
            </button>
          </div>
        </div>

        {/* Batch Subject Selection Controls */}
        {isSubjectBatchMode && (
          <div className="p-2 rounded-lg bg-[#050A07] border border-amber-900/60 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllSubjects}
                className="px-2.5 py-1 rounded bg-[#080E0B] border border-slate-700 hover:border-slate-500 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                {selectedSubjectCodes.size === currentTier.subjects.length && currentTier.subjects.length > 0 ? (
                  <CheckSquare className="w-3 h-3 text-amber-400" />
                ) : (
                  <Square className="w-3 h-3 text-slate-500" />
                )}
                <span>
                  {selectedSubjectCodes.size === currentTier.subjects.length && currentTier.subjects.length > 0
                    ? 'Deselect All'
                    : `Select All (${currentTier.subjects.length})`}
                </span>
              </button>
              <span className="text-[11px] text-amber-300 font-bold">
                {selectedSubjectCodes.size} selected
              </span>
            </div>

            {selectedSubjectCodes.size > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setBulkActionTarget('subjects_unlink');
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Unlink selected subjects from this exam only (safe)"
                >
                  <Link2Off className="w-3 h-3" />
                  <span>Unlink Selected ({selectedSubjectCodes.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkActionTarget('subjects_permanent');
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Delete selected subjects permanently everywhere & Google Sheets"
                >
                  <CloudOff className="w-3 h-3" />
                  <span>Delete Everywhere ({selectedSubjectCodes.size})</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {currentTier.subjects.length === 0 ? (
            <div className="text-xs text-slate-500 py-1 flex items-center gap-2">
              <span>No subjects added yet.</span>
              <button
                onClick={() => setIsAddSubjectOpen(true)}
                className="text-emerald-400 font-bold hover:underline"
              >
                (+) Add your first subject
              </button>
            </div>
          ) : (
            currentTier.subjects.map((code) => {
              const isSel = selectedCode === code;
              const subData = activeSubjects.find((s) => s.code === code);
              const count = subData ? subData.topics.length : 0;
              const isChecked = selectedSubjectCodes.has(code);

              return (
                <div
                  key={code}
                  className="flex items-center shrink-0"
                  onTouchStart={() => handleSubjectTouchStart(code)}
                  onTouchEnd={handleSubjectTouchEnd}
                  onTouchMove={handleSubjectTouchMove}
                >
                  {isSubjectBatchMode && (
                    <button
                      type="button"
                      onClick={() => toggleSelectSubject(code)}
                      className={`p-1 mr-1 rounded border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-[#040806] border-slate-700 text-slate-500 hover:text-white'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (isSubjectBatchMode) {
                        toggleSelectSubject(code);
                      } else {
                        setSelectedCode(code);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap border transition-all cursor-pointer font-bold text-xs flex items-center gap-1.5 ${
                      isChecked
                        ? 'bg-amber-950/80 text-amber-200 border-amber-600'
                        : isSel
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-[#040806] border-[#132418] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{code}</span>
                    {count > 0 && (
                      <span
                        className={`px-1 py-0.2 rounded text-[10px] ${
                          isSel ? 'bg-black text-emerald-300' : 'bg-[#020503] text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>

                  {!isSubjectBatchMode && subData && (
                    <SubjectActionMenu
                      code={code}
                      name={subData.name}
                      onSelect={() => {
                        setIsSubjectBatchMode(true);
                        setSelectedSubjectCodes(new Set([code]));
                      }}
                      onManage={() =>
                        setSubjectToDelete({
                          code,
                          name: subData.name,
                        })
                      }
                      isBatchMode={isSubjectBatchMode}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Subject Mastery Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Title & Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                {currentSubject.code}
              </span>
              <span className="text-slate-400 font-mono">
                {currentSubject.semesterOrDomain || currentTier.description}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white mt-1 truncate">
              {currentSubject.name}
            </h2>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span>{stats.total} Subtopics Total</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{stats.pyqDone} Fully Cleared (PYQ)</span>
            </div>
          </div>

          {/* Circular Progress Mastery Ring */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end bg-[#040806] sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-[#132418]">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#101e14"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-white">{stats.masteryPct}%</span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Mastery</span>
              </div>
            </div>

            <button
              onClick={() => setIsAddSubtopicOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>(+) Add Subtopic</span>
            </button>
          </div>
        </div>

        {/* 3-Stage Progress Breakdown Bar */}
        <div className="space-y-2 pt-2 border-t border-[#132418]">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[#040806] border border-[#132418]">
              <div className="text-[10px] text-slate-400 font-bold uppercase">1. THEORY (33%)</div>
              <div className="text-base font-black text-slate-200 mt-0.5">
                {stats.theoryDone}/{stats.total}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">{stats.theoryPct}%</div>
            </div>
            <div className="p-2 rounded-xl bg-[#040806] border border-[#132418]">
              <div className="text-[10px] text-cyan-400 font-bold uppercase">2. PRACTICE (67%)</div>
              <div className="text-base font-black text-cyan-300 mt-0.5">
                {stats.practiceDone}/{stats.total}
              </div>
              <div className="text-[10px] text-cyan-400 font-semibold">{stats.practicePct}%</div>
            </div>
            <div className="p-2 rounded-xl bg-[#040806] border border-[#132418]">
              <div className="text-[10px] text-amber-400 font-bold uppercase">3. PYQ (100%)</div>
              <div className="text-base font-black text-amber-300 mt-0.5">
                {stats.pyqDone}/{stats.total}
              </div>
              <div className="text-[10px] text-amber-400 font-semibold">{stats.pyqPct}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Subtopics Grouped by Unit with 3-Stage Checkboxes */}
      <div className="space-y-3">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search subtopics in ${currentSubject.code}...`}
              className="w-full px-3.5 py-2 pl-9 rounded-xl bg-[#080E0B] border border-[#16291C] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            {allFilteredSubtopicIds.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllSubtopics}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  selectedSubtopicIds.size > 0 && selectedSubtopicIds.size === allFilteredSubtopicIds.length
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500'
                    : selectedSubtopicIds.size > 0
                    ? 'bg-amber-950 text-amber-300 border-amber-600'
                    : 'bg-[#080E0B] text-slate-400 border-[#16291C] hover:text-white'
                }`}
                title="Select or deselect all visible subtopics"
              >
                {selectedSubtopicIds.size > 0 && selectedSubtopicIds.size === allFilteredSubtopicIds.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                ) : selectedSubtopicIds.size > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>
                  {selectedSubtopicIds.size > 0
                    ? `${selectedSubtopicIds.size} Selected`
                    : `Select All (${allFilteredSubtopicIds.length})`}
                </span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-[#080E0B] p-1 rounded-xl border border-[#16291C] text-xs">
              {(['all', 'incomplete', 'due'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold text-xs capitalize cursor-pointer transition-colors ${
                    filterMode === mode
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'due' ? '⚡ Due Review' : mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Units & Subtopics List */}
        {unitsGrouped.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#080E0B] border border-[#16291C] text-slate-500 text-xs space-y-2">
            <div>No subtopics found for {currentSubject.name}.</div>
            <button
              onClick={() => setIsAddSubtopicOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-400 font-bold"
            >
              (+) Add First Subtopic
            </button>
          </div>
        ) : (
          unitsGrouped.map(([unitName, subtopics]) => {
            const filteredSubtopics = subtopics.filter((item) => {
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                if (
                  !item.topic.toLowerCase().includes(q) &&
                  !item.subtopic.toLowerCase().includes(q)
                ) {
                  return false;
                }
              }
              if (filterMode === 'incomplete') {
                return !(item.theory && item.practice && item.pyq);
              }
              if (filterMode === 'due') {
                return (item.revisionCount || 0) < 2;
              }
              return true;
            });

            if (filteredSubtopics.length === 0) return null;

            return (
              <div
                key={unitName}
                className="rounded-2xl border border-[#16291C] bg-[#080E0B] overflow-hidden shadow-lg space-y-0"
              >
                {/* Unit Header */}
                <div className="px-4 py-2.5 bg-[#050907] border-b border-[#132418] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-bold text-xs text-white uppercase tracking-wider">
                      {unitName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {filteredSubtopics.length} Subtopic{filteredSubtopics.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Subtopics Rows */}
                <div className="divide-y divide-[#101e14]">
                  {filteredSubtopics.map((item) => {
                    const isAllDone = item.theory && item.practice && item.pyq;
                    const isSelected = selectedSubtopicIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        onTouchStart={() => handleSubtopicTouchStart(item.id)}
                        onTouchEnd={handleSubtopicTouchEnd}
                        onTouchMove={handleSubtopicTouchMove}
                        onClick={() => {
                          if (selectedSubtopicIds.size > 0) {
                            toggleSelectSubtopic(item.id);
                          }
                        }}
                        className={`p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors ${
                          isSelected
                            ? 'bg-emerald-950/40 border-l-4 border-l-emerald-400'
                            : isAllDone
                            ? 'bg-[#060D08]/60 hover:bg-[#071109]'
                            : 'hover:bg-[#0b140e]'
                        } ${selectedSubtopicIds.size > 0 ? 'cursor-pointer select-none' : ''}`}
                      >
                        {/* Topic & Subtopic Title with Select Checkbox (when selection mode active) */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          {selectedSubtopicIds.size > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectSubtopic(item.id);
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 mt-0.5 sm:mt-0 ${
                                isSelected
                                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                  : 'bg-[#040806] border-[#16291C] text-slate-600 hover:text-slate-300 hover:border-slate-500'
                              }`}
                              title={isSelected ? 'Deselect subtopic' : 'Select for bulk delete'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5" />
                              ) : (
                                <Square className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-emerald-400">
                                {item.topic}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                  item.priority === 'High'
                                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                                    : item.priority === 'Medium'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : 'bg-slate-900 text-slate-400 border-slate-700'
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                            <div className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                              {item.subtopic}
                            </div>
                          </div>
                        </div>

                        {/* Interactive 3-Stage Checkboxes & Spaced Revision Counter */}
                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#132418]">
                          {/* 1. Theory */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCheck(item.id, 'theory');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              item.theory
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                : 'bg-[#040806] text-slate-500 border-[#16291C] hover:text-slate-300'
                            }`}
                            title="Theory: Concept comprehension (33%)"
                          >
                            <span className="w-3.5 h-3.5 rounded border border-current flex items-center justify-center text-[10px]">
                              {item.theory && '✓'}
                            </span>
                            <span>Theo</span>
                          </button>

                          {/* 2. Practice */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCheck(item.id, 'practice');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              item.practice
                                ? 'bg-cyan-950 text-cyan-400 border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                                : 'bg-[#040806] text-slate-500 border-[#16291C] hover:text-slate-300'
                            }`}
                            title="Practice: Problem solving & coding (67%)"
                          >
                            <span className="w-3.5 h-3.5 rounded border border-current flex items-center justify-center text-[10px]">
                              {item.practice && '✓'}
                            </span>
                            <span>Prac</span>
                          </button>

                          {/* 3. PYQs */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCheck(item.id, 'pyq');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              item.pyq
                                ? 'bg-amber-950 text-amber-400 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                : 'bg-[#040806] text-slate-500 border-[#16291C] hover:text-slate-300'
                            }`}
                            title="PYQ: Previous Year Questions solved (100%)"
                          >
                            <span className="w-3.5 h-3.5 rounded border border-current flex items-center justify-center text-[10px]">
                              {item.pyq && '✓'}
                            </span>
                            <span>PYQ</span>
                          </button>

                          {/* Spaced Revision Counter */}
                          <div className="flex items-center gap-1 pl-1 border-l border-[#16291C]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevisionDelta(item.id, -1);
                              }}
                              disabled={(item.revisionCount || 0) <= 0}
                              className="w-5 h-6 rounded bg-[#040806] border border-[#132418] text-slate-400 hover:text-white disabled:opacity-30 text-[10px] flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span
                              className="px-1.5 py-0.5 rounded bg-[#030704] border border-[#14261a] text-[10px] font-mono font-bold text-emerald-400 min-w-[40px] text-center"
                              title="Spaced repetition review count"
                            >
                              Rev:{item.revisionCount || 0}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevisionDelta(item.id, 1);
                              }}
                              className="w-5 h-6 rounded bg-[#040806] border border-[#132418] text-slate-400 hover:text-white text-[10px] flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          {/* Subtopic 3-dot Action Menu (PC click/hold or delete) */}
                          <SubtopicActionMenu
                            itemId={item.id}
                            subtopicTitle={item.subtopic}
                            onSelect={() => toggleSelectSubtopic(item.id)}
                            onDelete={() =>
                              setDeleteTarget({
                                type: 'subtopic',
                                id: item.id,
                                title: 'Delete Subtopic',
                                name: item.subtopic,
                                message: `Are you sure you want to remove this subtopic from ${currentSubject.code}?`,
                              })
                            }
                            isSelectionActive={selectedSubtopicIds.size > 0}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Bulk Action Bar for Subtopics */}
      {selectedSubtopicIds.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl p-3 rounded-2xl bg-[#080E0B]/95 backdrop-blur-md border border-emerald-500/80 shadow-2xl flex items-center justify-between gap-3 text-xs flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white">
              {selectedSubtopicIds.size} of {allFilteredSubtopicIds.length} subtopics selected
            </span>
            <button
              type="button"
              onClick={handleSelectAllSubtopics}
              className="text-emerald-400 hover:underline text-[11px] font-semibold cursor-pointer"
            >
              {selectedSubtopicIds.size === allFilteredSubtopicIds.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleBulkMarkSubtopicsDone}
              className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Mark all 3 stages (Theory + Practice + PYQ) complete for selected"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark Done</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBulkActionTarget('subtopics');
                setIsBulkDeleteModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Bulk delete selected subtopics"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedSubtopicIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSubtopicIds(new Set())}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleteModalOpen}
        title={
          bulkActionTarget === 'subtopics'
            ? `Delete ${selectedSubtopicIds.size} Subtopics`
            : bulkActionTarget === 'subjects_unlink'
            ? `Unlink ${selectedSubjectCodes.size} Subjects`
            : `Delete ${selectedSubjectCodes.size} Subjects Everywhere`
        }
        message={
          bulkActionTarget === 'subtopics'
            ? `Are you sure you want to permanently delete ${selectedSubtopicIds.size} selected subtopics from ${currentSubject.code}? This will re-index syllabus rows and sync deletions to Google Sheets.`
            : bulkActionTarget === 'subjects_unlink'
            ? `Are you sure you want to unlink ${selectedSubjectCodes.size} selected subjects from ${currentTier.label}? Their notes, checkboxes, and sheet tabs will remain completely intact in other exams.`
            : `⚠️ DESTRUCTIVE: Are you sure you want to delete ${selectedSubjectCodes.size} selected subjects everywhere? This will remove them from all exams and queue deletion of their sheet tabs from Google Sheets.`
        }
        itemName={
          bulkActionTarget === 'subtopics'
            ? `${selectedSubtopicIds.size} subtopics selected`
            : `${selectedSubjectCodes.size} subjects selected`
        }
        confirmText={
          bulkActionTarget === 'subjects_unlink' ? 'Yes, Unlink Selected' : 'Yes, Delete All'
        }
        onConfirm={() => {
          if (bulkActionTarget === 'subtopics') {
            handleBulkDeleteSubtopicsConfirm();
          } else if (bulkActionTarget === 'subjects_unlink') {
            handleBulkUnlinkSubjectsConfirm();
          } else if (bulkActionTarget === 'subjects_permanent') {
            handleBulkDeleteSubjectsEverywhereConfirm();
          }
        }}
        onClose={() => {
          setIsBulkDeleteModalOpen(false);
          setBulkActionTarget(null);
        }}
      />

      {/* Add Subtopic Modal */}
      <AddSubtopicModal
        isOpen={isAddSubtopicOpen}
        onClose={() => setIsAddSubtopicOpen(false)}
        subjectCode={currentSubject.code}
        onAddSubtopic={handleAddSubtopic}
      />

      {/* Add Exam Modal */}
      <AddExamModal
        isOpen={isAddExamOpen}
        onClose={() => setIsAddExamOpen(false)}
        onExamAdded={(tierId, initialCode) => {
          setActiveTierId(tierId);
          setSelectedCode(initialCode);
          onSubjectsChange();
        }}
      />

      {/* Add Subject Modal */}
      <AddSubjectModal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        tierId={currentTier.id}
        tierLabel={currentTier.label}
        onSubjectAdded={(code) => {
          setSelectedCode(code);
          onSubjectsChange();
        }}
      />

      {/* Smart Subject Deletion & Unlink Modal */}
      <SmartSubjectDeleteModal
        isOpen={!!subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        subjectCode={subjectToDelete?.code || ''}
        subjectName={subjectToDelete?.name || ''}
        tierId={currentTier.id}
        tierLabel={currentTier.label}
        linkedTiers={subjectLinkedTiers}
        onUnlink={handleUnlinkSubject}
        onDeletePermanently={handleDeleteSubjectPermanently}
      />

      {/* Unified In-App Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title || 'Confirm Deletion'}
        message={deleteTarget?.message || 'Are you sure you want to delete this item?'}
        itemName={deleteTarget?.name}
        confirmText="Yes, Delete"
        onConfirm={executeDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
