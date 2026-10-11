/** Default Pomodoro length. */
export const FOCUS_TARGET_MINUTES = 25;

/** Whole minutes between two times (a session shorter than 30 seconds counts as 0). */
export function focusedMinutes(startedAt: number, endedAt: number): number {
  return Math.max(0, Math.round((endedAt - startedAt) / 60000));
}

/** "05:07" for the running timer, "1:02:09" once it passes an hour. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "45m", "1h 30m": how much focus time is logged on a task. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
