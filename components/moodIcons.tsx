import type { LucideIcon } from 'lucide-react-native';
import { Frown, Laugh, Meh, Smile, FaceSlightlySmiling } from 'lucide-react-native';
import type { Mood } from '@/utils/reflection';

/** Lucide face for each mood, from a rough day (1) to a great day (5). */
export const MOOD_ICONS: Record<Mood, LucideIcon> = {
  1: Frown,
  2: Meh,
  3: FaceSlightlySmiling,
  4: Smile,
  5: Laugh,
};

export const MOOD_COLORS: Record<Mood, string> = {
  1: '#E11D48',
  2: '#F97316',
  3: '#EAB308',
  4: '#22C55E',
  5: '#0EA5E9',
};

export const MOODS: Mood[] = [1, 2, 3, 4, 5];
