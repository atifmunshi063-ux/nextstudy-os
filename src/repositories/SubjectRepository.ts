import { getDB } from '../db/indexedDb';
import { SyllabusSubject, SyllabusSubtopic, SyncRecord } from '../types';

export class SubjectRepository {
  async getAllSubjects(): Promise<SyllabusSubject[]> {
    const db = await getDB();
    const subjects = await db.getAll('subjects');
    return subjects;
  }

  async getSubject(code: string): Promise<SyllabusSubject | undefined> {
    const db = await getDB();
    return db.get('subjects', code);
  }

  async updateTopicField(
    subjectCode: string,
    subtopicId: string,
    field: 'theory' | 'practice' | 'pyq' | 'revisionCount' | 'notes',
    value: any
  ): Promise<SyllabusSubject | null> {
    const db = await getDB();
    const subject = await db.get('subjects', subjectCode);
    if (!subject) return null;

    const topic = subject.topics.find((t) => t.id === subtopicId);
    if (!topic) return null;

    (topic as any)[field] = value;
    subject.completedSubtopics = subject.topics.filter(
      (t) => t.theory && t.practice && t.pyq
    ).length;

    await db.put('subjects', subject);

    // Also update topics store
    const fullTopic = await db.get('topics', subtopicId);
    if (fullTopic) {
      (fullTopic as any)[field] = value;
      await db.put('topics', fullTopic);
    }

    // Queue sync record
    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'subtopic',
      entityId: subtopicId,
      operation: 'update',
      payload: {
        action: 'updateSyllabus',
        subject: subjectCode,
        row: topic.rowIndex,
        theory: topic.theory,
        practice: topic.practice,
        pyq: topic.pyq,
        notes: topic.notes,
      },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return subject;
  }

  async addSubtopic(
    subjectCode: string,
    unit: string,
    topicName: string,
    subtopicTitle: string,
    priority: 'High' | 'Medium' | 'Low'
  ): Promise<SyllabusSubtopic | null> {
    const db = await getDB();
    const subject = await db.get('subjects', subjectCode);
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

    await db.put('subjects', subject);
    await db.put('topics', { ...newTopic, subjectCode });

    const syncItem: SyncRecord = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity: 'subtopic',
      entityId: newTopic.id,
      operation: 'create',
      payload: {
        action: 'addSubtopic',
        subject: subjectCode,
        unit: newTopic.unit,
        topic: newTopic.topic,
        subtopic: newTopic.subtopic,
        priority: newTopic.priority,
      },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    await db.put('syncQueue', syncItem);

    return newTopic;
  }

  async deleteSubtopic(subjectCode: string, subtopicId: string): Promise<void> {
    const db = await getDB();
    const subject = await db.get('subjects', subjectCode);
    if (subject) {
      subject.topics = subject.topics.filter((t) => t.id !== subtopicId);
      subject.totalSubtopics = subject.topics.length;
      subject.completedSubtopics = subject.topics.filter(
        (t) => t.theory && t.practice && t.pyq
      ).length;
      await db.put('subjects', subject);
    }
    await db.delete('topics', subtopicId);
  }
}

export const subjectRepository = new SubjectRepository();
