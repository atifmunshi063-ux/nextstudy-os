import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Habit, SyllabusSubject } from '../../types';
import { Search, X, CheckSquare, BookOpen, ArrowRight } from 'lucide-react';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  subjects: SyllabusSubject[];
  onSelectHabit: (habit: Habit) => void;
  onSelectSubject: (subjectCode: string) => void;
}

export const CommandSearchModal: React.FC<CommandSearchModalProps> = ({
  isOpen,
  onClose,
  habits,
  subjects,
  onSelectHabit,
  onSelectSubject,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { matchingHabits: [], matchingTopics: [] };

    const matchingHabits = habits
      .filter(
        (h) =>
          h.description.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q)
      )
      .slice(0, 5);

    const matchingTopics: Array<{
      subjectCode: string;
      subjectName: string;
      unit: string;
      subtopic: string;
    }> = [];

    for (const sub of subjects) {
      for (const top of sub.topics) {
        if (
          top.subtopic.toLowerCase().includes(q) ||
          top.topic.toLowerCase().includes(q) ||
          sub.name.toLowerCase().includes(q)
        ) {
          matchingTopics.push({
            subjectCode: sub.code,
            subjectName: sub.name,
            unit: top.unit,
            subtopic: top.subtopic,
          });
          if (matchingTopics.length >= 6) break;
        }
      }
      if (matchingTopics.length >= 6) break;
    }

    return { matchingHabits, matchingTopics };
  }, [query, habits, subjects]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-[#0e1410] border border-slate-800 shadow-2xl text-slate-200 overflow-hidden"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-[#111813]">
          <Search className="w-5 h-5 text-emerald-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search habits, syllabus subtopics, subjects (e.g. Tree, OS, LeetCode)..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-3">
          {query.trim() === '' ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Type to search across 100 habits, 20 core subjects, and all exam syllabus subtopics.
            </div>
          ) : results.matchingHabits.length === 0 && results.matchingTopics.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No matching habits or syllabus topics found for "{query}".
            </div>
          ) : (
            <>
              {/* Habits Section */}
              {results.matchingHabits.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Habits ({results.matchingHabits.length})
                  </div>
                  {results.matchingHabits.map((habit) => (
                    <button
                      key={habit.id}
                      onClick={() => {
                        onSelectHabit(habit);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#141d17] text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-white group-hover:text-emerald-300 truncate">
                            {habit.description}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {habit.category} · {habit.totalDone} done
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Syllabus Topics Section */}
              {results.matchingTopics.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Syllabus Subtopics ({results.matchingTopics.length})
                  </div>
                  {results.matchingTopics.map((top, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onSelectSubject(top.subjectCode);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#141d17] text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-white group-hover:text-cyan-300 truncate">
                            {top.subtopic}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {top.subjectName} · {top.unit}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Key Hints */}
        <div className="px-4 py-2 border-t border-slate-800 bg-[#111813] text-[11px] text-slate-500 flex items-center justify-between">
          <span>Esc to exit</span>
          <span className="font-mono">⌘K / Ctrl+K</span>
        </div>
      </div>
    </div>
  );
};
