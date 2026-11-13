import React from 'react';
import { StudyTrackerScreen } from '../study/StudyTrackerScreen';
import { SyllabusSubject } from '../../types';

interface SyllabusScreenProps {
  subjects: SyllabusSubject[];
  onSubjectsChange: () => void;
  initialSelectedSubjectCode?: string;
  onNavigateTab?: (tab: number) => void;
}

export const SyllabusScreen: React.FC<SyllabusScreenProps> = (props) => {
  return <StudyTrackerScreen {...props} />;
};

export default SyllabusScreen;
