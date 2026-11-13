import { Task, RevisionItem, SyllabusSubject } from '../types';
import { taskRepository } from '../repositories/TaskRepository';
import { revisionRepository } from '../repositories/RevisionRepository';
import { subjectRepository } from '../repositories/SubjectRepository';
import { getLocalDateString } from '../utils/date';

export interface PlanBlock {
  id: string;
  timeSlot: string; // e.g. "09:00 - 09:50"
  durationMinutes: number;
  title: string;
  type: Task['type'];
  subjectCode?: string;
  topicId?: string;
  reason: string;
  priorityScore: number;
}

export interface GeneratedPlan {
  date: string;
  totalPlannedMinutes: number;
  blocks: PlanBlock[];
  summary: string;
}

export class PlannerService {
  /**
   * Deterministic Priority Engine (Roadmap #22)
   * Priority = deadline urgency + revision urgency + exam importance + user priority
   */
  calculatePriorityScore(params: {
    type: Task['type'];
    priority: Task['priority'];
    isOverdue?: boolean;
    isDueToday?: boolean;
    examWeight?: number;
  }): number {
    let score = 50;

    // Type weight
    if (params.type === 'revision') score += 35; // Spaced repetition retention is paramount
    else if (params.type === 'study') score += 25;
    else if (params.type === 'coding') score += 20;
    else if (params.type === 'mock') score += 20;

    // Priority flag
    if (params.priority === 'high') score += 25;
    else if (params.priority === 'medium') score += 15;
    else score += 5;

    // Urgency
    if (params.isOverdue) score += 30;
    if (params.isDueToday) score += 20;

    if (params.examWeight) score += params.examWeight;

    return score;
  }

  /**
   * Deterministic Smart Daily Planner
   * Inspects due revisions, pending tasks, and urgent syllabus topics
   */
  async generateDailyPlan(
    availableMinutes: number = 240,
    startTime: string = '09:00'
  ): Promise<GeneratedPlan> {
    const todayStr = getLocalDateString();
    const tasks = await taskRepository.getAllTasks();
    const dueRevisions = await revisionRepository.getDueRevisions(todayStr);
    const subjects = await subjectRepository.getAllSubjects();

    const pendingTasks = tasks.filter((t) => t.status === 'todo');

    const candidates: Array<{
      title: string;
      type: Task['type'];
      durationMinutes: number;
      subjectCode?: string;
      topicId?: string;
      reason: string;
      score: number;
    }> = [];

    // 1. Due Revisions (highest retention value)
    for (const rev of dueRevisions) {
      candidates.push({
        title: `Revise: ${rev.topicTitle} (${rev.subjectCode})`,
        type: 'revision',
        durationMinutes: 25,
        subjectCode: rev.subjectCode,
        topicId: rev.topicId,
        reason: `Ebbinghaus Interval ${rev.intervalDays}d due · Spaced recall prevents forgetting`,
        score: this.calculatePriorityScore({
          type: 'revision',
          priority: 'high',
          isDueToday: true,
        }),
      });
    }

    // 2. Pending high & medium priority tasks
    for (const task of pendingTasks) {
      candidates.push({
        title: task.title,
        type: task.type,
        durationMinutes: task.estimatedMinutes || 45,
        subjectCode: task.subjectId,
        topicId: task.topicId,
        reason: `Pending ${task.priority} priority task`,
        score: this.calculatePriorityScore({
          type: task.type,
          priority: task.priority,
          isDueToday: task.dueDate === todayStr,
          isOverdue: task.dueDate ? task.dueDate < todayStr : false,
        }),
      });
    }

    // 3. If time remains, pull pending Core Semester 3 / GATE topics
    if (candidates.length < 5) {
      for (const sub of subjects.slice(0, 3)) {
        const pendingTopic = sub.topics.find((t) => !t.practice || !t.pyq);
        if (pendingTopic) {
          candidates.push({
            title: `${sub.name}: ${pendingTopic.subtopic}`,
            type: 'study',
            durationMinutes: 50,
            subjectCode: sub.code,
            topicId: pendingTopic.id,
            reason: `Core syllabus progression (${sub.code})`,
            score: this.calculatePriorityScore({
              type: 'study',
              priority: pendingTopic.priority.toLowerCase() as any,
              examWeight: 15,
            }),
          });
        }
      }
    }

    // Sort by priority score descending
    candidates.sort((a, b) => b.score - a.score);

    // Build timeline blocks with 5-minute transition breaks
    let currentHour = parseInt(startTime.split(':')[0], 10) || 9;
    let currentMinute = parseInt(startTime.split(':')[1], 10) || 0;
    let accumulatedMinutes = 0;
    const blocks: PlanBlock[] = [];

    for (const c of candidates) {
      if (accumulatedMinutes + c.durationMinutes > availableMinutes) {
        continue;
      }

      const startFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      // Advance clock
      const totalMins = currentMinute + c.durationMinutes;
      currentHour += Math.floor(totalMins / 60);
      currentMinute = totalMins % 60;

      const endFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      blocks.push({
        id: `block-${blocks.length + 1}`,
        timeSlot: `${startFormatted} – ${endFormatted}`,
        durationMinutes: c.durationMinutes,
        title: c.title,
        type: c.type,
        subjectCode: c.subjectCode,
        topicId: c.topicId,
        reason: c.reason,
        priorityScore: c.score,
      });

      accumulatedMinutes += c.durationMinutes;

      // Add 5m buffer
      currentMinute += 5;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute %= 60;
      }
    }

    return {
      date: todayStr,
      totalPlannedMinutes: accumulatedMinutes,
      blocks,
      summary: `Generated high-yield sprint of ${Math.round(accumulatedMinutes / 60 * 10) / 10} hours covering ${blocks.length} prioritized study blocks.`,
    };
  }

  /**
   * Convert generated plan blocks into actual Task records in IndexedDB
   */
  async commitPlanToTasks(plan: GeneratedPlan): Promise<void> {
    for (const block of plan.blocks) {
      await taskRepository.addTask({
        title: block.title,
        type: block.type,
        subjectId: block.subjectCode,
        topicId: block.topicId,
        priority: block.priorityScore > 80 ? 'high' : 'medium',
        estimatedMinutes: block.durationMinutes,
        scheduledDate: plan.date,
        status: 'todo',
        source: 'planner',
      });
    }
  }
}

export const plannerService = new PlannerService();
