/** Todoist-style priority flags. 1 is the most important. */
export type Priority = 1 | 2 | 3;

export const PRIORITY_META: Record<Priority, { label: string; name: string; colorHex: string }> = {
  1: { label: 'P1', name: 'Urgent', colorHex: '#E11D48' },
  2: { label: 'P2', name: 'High', colorHex: '#F97316' },
  3: { label: 'P3', name: 'Medium', colorHex: '#3B82F6' },
};

/** Sort helper: P1 first, then P2, P3, then no priority. */
export function comparePriority(a?: Priority | null, b?: Priority | null): number {
  return (a ?? 4) - (b ?? 4);
}
