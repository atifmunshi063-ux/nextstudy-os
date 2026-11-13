import { revisionRepository } from '../repositories/RevisionRepository';
import { RevisionItem } from '../types';
import { getLocalDateString } from '../utils/date';

export class RevisionService {
  async getDueCount(): Promise<number> {
    const todayStr = getLocalDateString();
    const due = await revisionRepository.getDueRevisions(todayStr);
    return due.length;
  }

  async getAll(): Promise<RevisionItem[]> {
    return revisionRepository.getAllRevisions();
  }

  async getCategorizedRevisions(): Promise<{
    dueToday: RevisionItem[];
    overdue: RevisionItem[];
    upcoming: RevisionItem[];
    mastered: RevisionItem[];
  }> {
    const todayStr = getLocalDateString();
    const all = await revisionRepository.getAllRevisions();

    const dueToday: RevisionItem[] = [];
    const overdue: RevisionItem[] = [];
    const upcoming: RevisionItem[] = [];
    const mastered: RevisionItem[] = [];

    for (const item of all) {
      if (item.status === 'mastered') {
        mastered.push(item);
      } else if (item.nextRevisionAt < todayStr) {
        overdue.push(item);
      } else if (item.nextRevisionAt === todayStr) {
        dueToday.push(item);
      } else {
        upcoming.push(item);
      }
    }

    return { dueToday, overdue, upcoming, mastered };
  }

  async scheduleTopicRevision(topic: {
    id: string;
    subjectCode: string;
    subtopic: string;
    notes?: string;
  }): Promise<RevisionItem> {
    return revisionRepository.createRevision({
      topicId: topic.id,
      subjectCode: topic.subjectCode,
      topicTitle: topic.subtopic,
      notes: topic.notes,
    });
  }

  async processRecall(revisionId: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<RevisionItem | null> {
    return revisionRepository.recordRecall(revisionId, difficulty);
  }
}

export const revisionService = new RevisionService();
