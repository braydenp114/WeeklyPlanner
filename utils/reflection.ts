/** 1 = rough day ... 5 = great day. */
export type Mood = 1 | 2 | 3 | 4 | 5;

export const MOOD_LABELS: Record<Mood, string> = {
  1: 'Rough',
  2: 'Meh',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

export interface DailyReflection {
  /** YYYY-MM-DD */
  day: string;
  mood: Mood;
  note: string;
}

/** Average mood of the days that have a reflection, rounded to one decimal (null if none). */
export function averageMood(reflections: DailyReflection[]): number | null {
  if (reflections.length === 0) return null;
  const sum = reflections.reduce((acc, r) => acc + r.mood, 0);
  return Math.round((sum / reflections.length) * 10) / 10;
}
