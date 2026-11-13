import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, CheckSquare, Trash2 } from 'lucide-react';

interface SubtopicActionMenuProps {
  itemId: string;
  subtopicTitle: string;
  onSelect: () => void;
  onDelete: () => void;
  isSelectionActive: boolean;
}

export const SubtopicActionMenu: React.FC<SubtopicActionMenuProps> = ({
  itemId,
  subtopicTitle,
  onSelect,
  onDelete,
  isSelectionActive,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const clearHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startHold = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    e.stopPropagation();

    clearHold();
    setIsHolding(true);
    startTimeRef.current = Date.now();
    const duration = 480; // ms to trigger long press

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(pct);
    }, 20);

    timerRef.current = setTimeout(() => {
      clearHold();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(45);
        } catch {
          // ignore
        }
      }
      onSelect();
    }, duration);
  };

  const endHold = (e: React.MouseEvent) => {
    e.stopPropagation();
    const elapsed = Date.now() - startTimeRef.current;
    clearHold();

    // If held for less than 280ms, treat as regular click to toggle popup menu
    if (elapsed < 280) {
      setIsOpen((prev) => !prev);
    }
  };

  if (isSelectionActive) {
    return null; // Hidden when in batch selection mode
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={clearHold}
        className={`relative p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
          isHolding
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 scale-105'
            : 'bg-[#040806] border-[#16291C] text-slate-500 hover:text-slate-300 hover:border-slate-700'
        }`}
        title="Click for options, or hold down to enter multi-select mode"
      >
        {/* Hold progress ring indicator */}
        {isHolding && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 28 28">
            <circle
              cx="14"
              cy="14"
              r="11"
              stroke="#10B981"
              strokeWidth="2.5"
              fill="transparent"
              strokeDasharray={69}
              strokeDashoffset={69 - (holdProgress / 100) * 69}
            />
          </svg>
        )}

        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {/* Floating tooltip when holding */}
      {isHolding && (
        <div className="absolute right-0 bottom-full mb-1 z-50 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 text-[10px] font-bold whitespace-nowrap shadow-lg animate-pulse">
          Hold to select... {holdProgress}%
        </div>
      )}

      {/* Dropdown Menu on Click */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-[#080E0B] border border-[#1a3322] shadow-2xl p-1 text-xs font-mono space-y-0.5 backdrop-blur-md">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onSelect();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-emerald-950 hover:text-emerald-300 flex items-center gap-2 transition-colors cursor-pointer text-xs"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Select & Multi-Delete</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-400 hover:bg-rose-950/80 hover:text-rose-300 flex items-center gap-2 transition-colors cursor-pointer text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Subtopic</span>
          </button>
        </div>
      )}
    </div>
  );
};
