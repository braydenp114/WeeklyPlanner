import type { LucideIcon } from 'lucide-react-native';
import {
  Apple,
  BedDouble,
  Bike,
  BookOpen,
  Brain,
  Camera,
  Code,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  GraduationCap,
  Heart,
  Languages,
  Leaf,
  Moon,
  Music,
  Palette,
  PenLine,
  Salad,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react-native';

/**
 * Icons the user can pick for a streak challenge (Lucide, MIT licence).
 * The key is what gets saved in Firestore, so keys must never be renamed.
 */
export const STREAK_ICONS: Record<string, LucideIcon> = {
  flame: Flame,
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  book: BookOpen,
  study: GraduationCap,
  languages: Languages,
  code: Code,
  brain: Brain,
  pen: PenLine,
  droplets: Droplets,
  salad: Salad,
  apple: Apple,
  coffee: Coffee,
  sleep: BedDouble,
  moon: Moon,
  sun: Sun,
  leaf: Leaf,
  heart: Heart,
  music: Music,
  palette: Palette,
  camera: Camera,
  target: Target,
  sparkles: Sparkles,
};

export const DEFAULT_STREAK_ICON = 'flame';

/** Looks up a saved icon key, falling back to the flame if it's unknown. */
export function getStreakIcon(key: string): LucideIcon {
  return STREAK_ICONS[key] ?? STREAK_ICONS[DEFAULT_STREAK_ICON];
}
