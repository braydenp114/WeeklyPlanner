import { REMINDER_ID_PREFIX } from "./reminders";

type PlannableTask = {
  id?: string;
  title?: string;
  startDate?: { toMillis(): number };
  endDate?: { toMillis(): number };
  allDay?: boolean;
  isDeadline?: boolean;
  completed?: boolean;
};

export type EndOfBlockPush = {
  identifier: string;
  title: string;
  body: string;
  fireAt: Date;
};

export function endOfBlockId(taskId: string): string {
  return `${REMINDER_ID_PREFIX}end-${taskId}`;
}

export function planEndOfBlockPushes(
  tasks: PlannableTask[],
  now: number,
): EndOfBlockPush[] {
  const plan: EndOfBlockPush[] = [];
  for (const task of tasks) {
    if (!task.id || !task.startDate || !task.endDate) continue;
    if (task.completed || task.allDay || task.isDeadline) continue;
    const start = task.startDate.toMillis();
    const end = task.endDate.toMillis();
    if (end <= start || end <= now) continue;
    plan.push({
      identifier: endOfBlockId(task.id),
      title: `Did you finish ${task.title ?? "your task"}?`,
      body: "Open your planner to mark it done.",
      fireAt: new Date(end),
    });
  }
  return plan;
}
