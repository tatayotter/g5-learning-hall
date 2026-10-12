import type { VisualAid } from '@/lib/visualAid';

// Shape of a weekly content package (content_weeks.package_data):
// day name -> subject name -> that subject's lesson + quiz. Authored as JSON,
// so every field is optional and consumers guard what they read.

export interface PackageQuestion {
  // Stable content_questions.id; admin-pasted JSON gets one when saved.
  id: string;
  question: string;
  options: string[];
  correct_answer?: string;
  explanation?: string;
  topic?: string;
  subject?: string;
  [key: string]: unknown;
}

export interface PackageSubject {
  summary_markdown?: string;
  visual_aid?: VisualAid | null;
  quiz?: PackageQuestion[];
  // MonsterGuild's extractQuestions() also accepts a `questions` array.
  questions?: PackageQuestion[];
  [key: string]: unknown;
}

export type PackageDay = Record<string, PackageSubject>;

export type WeeklyPackageData = Record<string, PackageDay>;

// What an admin pastes into the package editor before it's saved: no ids yet
// and nothing guaranteed, so validateWeekDays() checks every field.
export interface AuthoredQuestion {
  question?: string;
  options?: string[];
  correct_answer?: string;
  [key: string]: unknown;
}

export interface AuthoredSubject {
  summary_markdown?: string;
  quiz?: AuthoredQuestion[];
  questions?: AuthoredQuestion[];
  [key: string]: unknown;
}

export type AuthoredWeek = Record<string, Record<string, AuthoredSubject>>;
