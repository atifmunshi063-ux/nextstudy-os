import { getDB } from '../db/indexedDb';
import { Task, SyncRecord } from '../types';

export class TaskRepository {
  async getAllTasks(): Promise<Task[]> {
    const db = await getDB();
    const tasks = await db.getAll('tasks');
    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTasksByStatus(status: Task['status']): Promise<Task[]> {
    const db = await getDB();
    return db.getAllFromIndex('tasks', 'by-status', status);
  }

  async getTasksForDate(date: string): Promise<Task[]> {
    const db = await getDB();
    return db.getAllFromIndex('tasks', 'by-scheduled', date);
  }

  async addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const db = await getDB();
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.put('tasks', newTask);

    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'task',
      entityId: newTask.id,
      operation: 'create',
      payload: newTask,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return newTask;
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<Task | null> {
    const db = await getDB();
    const task = await db.get('tasks', taskId);
    if (!task) return null;

    task.status = status;
    task.updatedAt = new Date().toISOString();
    await db.put('tasks', task);

    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'task',
      entityId: task.id,
      operation: 'update',
      payload: { status },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return task;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const db = await getDB();
    await db.delete('tasks', taskId);

    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'task',
      entityId: taskId,
      operation: 'delete',
      payload: { id: taskId },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return true;
  }
}

export const taskRepository = new TaskRepository();
