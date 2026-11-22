export type GradeId =
  | 'k1'
  | 'k2'
  | 'k3'
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4'
  | 'p5'
  | 'p6';

export type AgeGroup = 'kindergarten' | 'lower_primary' | 'upper_primary';

export interface VocabWord {
  id: string;
  word: string;
  thai: string;
  emoji: string;
  phonicsOrPos: string;
  exampleEn: string;
  exampleTh: string;
}

export interface Lesson {
  id: string;
  titleTh: string;
  titleEn: string;
  icon: string;
  color: string;
  words: VocabWord[];
}

export interface GradeLevel {
  id: GradeId;
  shortName: string;
  nameTh: string;
  ageGroup: AgeGroup;
  ageRange: string;
  targetVocab: string;
  cefr: string;
  focusTh: string;
  badgeEmoji: string;
  gradient: string;
  accentBg: string;
  accentText: string;
  lessons: Lesson[];
}

export interface UserProgress {
  selectedGrade: GradeId;
  avatar: string;
  stars: number;
  completedLessons: Record<string, number>; // lessonId -> stars (1-3)
  learnedWords: string[];
  wrongWords: string[];
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  pin?: string;
  progress: UserProgress;
  createdAt: string;
}
