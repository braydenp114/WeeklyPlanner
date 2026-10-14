import type { Task } from "../services/tasksService";
import type { PresetLocation } from "../constants/presetLocations";
import { getCompletionWindow } from "./geofenceWindow";

type MarkableTask = Pick<
  Task,
  "startDate" | "endDate" | "isDeadline" | "completed" | "locationType"
>;

export function shouldAutoMarkByType(
  task: MarkableTask,
  preset: PresetLocation,
  now: number,
): boolean {
  if (task.completed) return false;
  if (!task.locationType || task.locationType !== preset.type) return false;
  const { start, end } = getCompletionWindow(task);
  return now >= start && now <= end;
}
