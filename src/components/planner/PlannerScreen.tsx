import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Database,
  Terminal,
  Trash2,
  Check,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { AddTaskModal } from './AddTaskModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

export interface PlannerTaskItem {
  id: string;
  score: number;
  urgency: string;
  sprintNum: string;
  title: string;
  tags: string[];
  typeText: string;
  inSprint: boolean;
  sprintTime?: string;
  status: 'todo' | 'sprint' | 'done';
  durationMinutes: number;
}

const DEFAULT_TASKS: PlannerTaskItem[] = [
  {
    id: 'task-1',
    score: 96,
    urgency: 'HIGH URGENCY',
    sprintNum: '#SPRINT-01',
    title: 'Sub_OS: Implement Peterson Algorithm in C & Verify Proof',
    tags: ['Sub_OS', 'Sem 3 Core', '7d Revision Due'],
    typeText: '50m Deep Sprint • Target: Unit 2',
    inSprint: true,
    sprintTime: '49:44',
    status: 'sprint',
    durationMinutes: 50,
  },
  {
    id: 'task-2',
    score: 88,
    urgency: 'CRITICAL',
    sprintNum: 'QUEUE #2',
    title: 'Sub_DSA: LeetCode #207 Course Schedule (Kahn BFS)',
    tags: ['Sub_DSA', 'LeetCode', 'Placements'],
    typeText: '25m Sprint • GATE Weight: 4M',
    inSprint: false,
    status: 'todo',
    durationMinutes: 25,
  },
  {
    id: 'task-3',
    score: 79,
    urgency: 'EBBINGHAUS DUE',
    sprintNum: 'QUEUE #3',
    title: 'Sub_DBMS: B+ Tree Indexing & Query Cost Calculation',
    tags: ['Sub_DBMS', 'Overdue 1d', 'GATE CSE'],
    typeText: '25m Sprint • 12 Nodes Recall',
    inSprint: false,
    status: 'todo',
    durationMinutes: 25,
  },
  {
    id: 'task-4',
    score: 68,
    urgency: 'DRILL',
    sprintNum: 'QUEUE #4',
    title: 'GATE PYQ 2022: Paging & Virtual Memory Calculations',
    tags: ['GATE 2028', 'PYQ Practice'],
    typeText: '25m Sprint • Objective Practice',
    inSprint: false,
    status: 'todo',
    durationMinutes: 25,
  },
];

const STORAGE_KEY = 'nextstudy_planner_tasks_v2';

interface PlannerScreenProps {
  onTasksUpdated?: () => void;
  onNavigateTab?: (tab: number) => void;
}

export const PlannerScreen: React.FC<PlannerScreenProps> = ({ onTasksUpdated, onNavigateTab }) => {
  const [tasks, setTasks] = useState<PlannerTaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_TASKS;
  });

  const [filterTab, setFilterTab] = useState<'all' | 'todo' | 'sprint' | 'done'>('all');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Sync to localStorage
  const saveTasks = (newTasks: PlannerTaskItem[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
    } catch {
      // ignore
    }
    if (onTasksUpdated) onTasksUpdated();
  };

  const handleToggleStatus = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id !== id) return t;
      if (t.status === 'done') {
        return { ...t, status: 'todo' as const, inSprint: false };
      } else {
        return { ...t, status: 'done' as const, inSprint: false };
      }
    });
    saveTasks(updated);
  };

  const handleStartSprint = (id: string) => {
    const updated = tasks.map((t) => ({
      ...t,
      inSprint: t.id === id,
      status: t.id === id ? ('sprint' as const) : t.status === 'sprint' ? ('todo' as const) : t.status,
    }));
    saveTasks(updated);
    if (onNavigateTab) {
      onNavigateTab(1); // Jump to Pomodoro Sprint Tab
    }
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
    setDeletingTaskId(null);
  };

  const handleAddTask = (taskData: {
    title: string;
    tag: string;
    durationMinutes: number;
    priority: 'high' | 'medium' | 'low';
    targetNote?: string;
  }) => {
    const nextNum = tasks.length + 1;
    const score = taskData.priority === 'high' ? 90 : taskData.priority === 'medium' ? 75 : 60;
    const urgency =
      taskData.priority === 'high' ? 'HIGH URGENCY' : taskData.priority === 'medium' ? 'PLANNED' : 'NORMAL';

    const newTask: PlannerTaskItem = {
      id: `task-${Date.now()}`,
      score,
      urgency,
      sprintNum: `QUEUE #${nextNum}`,
      title: `${taskData.tag}: ${taskData.title}`,
      tags: [taskData.tag, `${taskData.durationMinutes}m`, taskData.priority.toUpperCase()],
      typeText: `${taskData.durationMinutes}m Sprint • ${taskData.targetNote || 'Focused Study'}`,
      inSprint: false,
      status: 'todo',
      durationMinutes: taskData.durationMinutes,
    };

    saveTasks([newTask, ...tasks]);
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterTab === 'todo') return t.status === 'todo';
      if (filterTab === 'sprint') return t.status === 'sprint';
      if (filterTab === 'done') return t.status === 'done';
      return true;
    });
  }, [tasks, filterTab]);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      sprint: tasks.filter((t) => t.status === 'sprint').length,
      done: tasks.filter((t) => t.status === 'done').length,
      totalMinutes: tasks.reduce((sum, t) => sum + (t.durationMinutes || 25), 0),
      completedMinutes: tasks
        .filter((t) => t.status === 'done')
        .reduce((sum, t) => sum + (t.durationMinutes || 25), 0),
    };
  }, [tasks]);

  const hoursPlanned = (counts.totalMinutes / 60).toFixed(1);
  const hoursDone = (counts.completedMinutes / 60).toFixed(1);

  return (
    <div className="space-y-4 pb-24 md:pb-12 max-w-4xl mx-auto font-mono text-slate-200">
      {/* 1. Header Bar with Manual (+) Add Task Action */}
      <div className="p-4 rounded-2xl bg-[#080E0B] border border-[#16291C] shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-bold uppercase">STUDY ENGINE</span>
            <span className="text-emerald-400 font-bold">• Daily Task Queue</span>
          </div>
          <div className="text-base sm:text-lg font-black text-white mt-1">
            Manual Task Planner & Sprint Queue
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Manage your daily high-priority study sessions directly. Auto-generation is removed.
          </div>
        </div>

        <button
          onClick={() => setIsAddTaskOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-950/40 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>(+) Add Task</span>
        </button>
      </div>

      {/* 2. Filter Tabs Row */}
      <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {[
            { key: 'all', label: `All Tasks (${counts.all})` },
            { key: 'todo', label: `Todo (${counts.todo})` },
            { key: 'sprint', label: `In Sprint (${counts.sprint})` },
            { key: 'done', label: `Completed (${counts.done})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-xs font-semibold ${
                filterTab === tab.key
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500 font-bold'
                  : 'bg-[#050907] border-[#16291C] text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {counts.todo} pending • {counts.done} finished
        </span>
      </div>

      {/* 3. Tasks List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#080E0B] border border-[#16291C] text-slate-500 text-xs space-y-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-[#050907] border border-[#132418] flex items-center justify-center text-slate-600 mx-auto">
              <Calendar className="w-5 h-5 text-slate-600" />
            </div>
            <div className="text-white font-bold text-sm">No Tasks In This View</div>
            <p className="text-slate-400 max-w-sm mx-auto text-xs">
              Click (+) Add Task to schedule your own prioritized study sprints.
            </p>
            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>(+) Add First Task</span>
            </button>
          </div>
        ) : (
          filtered.map((task) => {
            const isCompleted = task.status === 'done';
            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all ${
                  task.inSprint
                    ? 'bg-[#09150E] border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : isCompleted
                    ? 'bg-[#050907] border-[#16291C] opacity-75'
                    : 'bg-[#080E0B] border-[#16291C] hover:border-slate-700'
                }`}
              >
                {/* Top tag bar */}
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        task.score > 90
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : task.score > 80
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : task.score > 70
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isCompleted ? '✓ COMPLETED' : `PRIORITY // ${task.urgency}`}
                    </span>
                    {task.inSprint && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">{task.sprintNum}</span>
                    <button
                      type="button"
                      onClick={() => setDeletingTaskId(task.id)}
                      title="Delete task"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="flex items-start gap-2.5 mt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(task.id)}
                    className={`p-1 rounded-md border transition-all cursor-pointer shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'bg-[#040806] border-[#16291C] text-slate-600 hover:text-slate-300'
                    }`}
                    title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <h4
                    className={`text-sm font-bold flex-1 leading-snug ${
                      isCompleted ? 'line-through text-slate-500' : 'text-white'
                    }`}
                  >
                    {task.title}
                  </h4>
                </div>

                {/* Category & Status Tags */}
                <div className="flex items-center gap-1.5 my-2.5 flex-wrap text-[10px]">
                  {task.tags.map((tg, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded border ${
                        tg.includes('Due') || tg.includes('Overdue') || tg.includes('HIGH')
                          ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                          : tg.includes('Completed')
                          ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                          : 'bg-[#050907] border-[#16291C] text-slate-300'
                      }`}
                    >
                      {tg}
                    </span>
                  ))}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#132418] text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{task.typeText}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.inSprint ? (
                      <button
                        onClick={() => onNavigateTab && onNavigateTab(1)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>[ ▷ IN SPRINT ]</span>
                      </button>
                    ) : !isCompleted ? (
                      <button
                        onClick={() => handleStartSprint(task.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#0b140e] hover:bg-emerald-950 border border-[#1a3322] hover:border-emerald-500 text-slate-300 hover:text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        [ START SPRINT ]
                      </button>
                    ) : (
                      <span className="text-emerald-400 text-[11px] font-bold">100% COMPLETE</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Daily Study Capacity & Balance Card */}
      <div className="p-4 rounded-xl bg-[#080E0B] border border-[#16291C] shadow-lg space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span>DAILY STUDY CAPACITY & BALANCE</span>
          <span className="text-emerald-400 font-mono">{hoursDone}h / {hoursPlanned}h Done</span>
        </div>

        <div className="p-2.5 rounded bg-[#040806] border border-[#132418] flex items-center justify-between text-xs">
          <span className="text-slate-400">PLANNED CAPACITY:</span>
          <span className="font-bold text-white">
            {counts.totalMinutes}m Total ({hoursPlanned} hrs planned across {counts.all} tasks)
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Task Queue: {counts.all} tasks ({counts.done} completed)</span>
          </div>
          <span className="text-emerald-400 font-bold">0 ERR</span>
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onAdd={handleAddTask}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingTaskId}
        title="Delete Task"
        message="Are you sure you want to remove this task from your daily planner queue?"
        confirmText="Yes, Delete Task"
        onConfirm={() => deletingTaskId && handleDeleteTask(deletingTaskId)}
        onClose={() => setDeletingTaskId(null)}
      />
    </div>
  );
};
