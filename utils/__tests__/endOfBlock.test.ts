import { describe, it, expect } from "@jest/globals";
import { planEndOfBlockPushes } from "../endOfBlock";
import { REMINDER_ID_PREFIX } from "../reminders";

const MIN = 60_000;
const NOW = 1_000_000_000_000;
const ts = (ms: number) =>
  ({ toMillis: () => ms, toDate: () => new Date(ms) }) as any;

function makeTask(overrides: any = {}) {
  return {
    id: "t1",
    title: "Gym session",
    startDate: ts(NOW + 10 * MIN),
    endDate: ts(NOW + 70 * MIN),
    allDay: false,
    isDeadline: false,
    completed: false,
    ...overrides,
  } as any;
}

describe("planEndOfBlockPushes", () => {
  it("schedules one push at the moment the block ends", () => {
    const plan = planEndOfBlockPushes([makeTask()], NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0].fireAt.getTime()).toBe(NOW + 70 * MIN);
  });

  it("asks about the task by name", () => {
    const plan = planEndOfBlockPushes([makeTask()], NOW);
    expect(plan[0].title).toContain("Gym session");
  });

  it("uses the reminder id prefix so old pushes get cleaned up", () => {
    const plan = planEndOfBlockPushes([makeTask()], NOW);
    expect(plan[0].identifier.startsWith(REMINDER_ID_PREFIX)).toBe(true);
    expect(plan[0].identifier).toContain("t1");
  });

  it("plans one push per task with different ids", () => {
    const plan = planEndOfBlockPushes(
      [makeTask(), makeTask({ id: "t2" })],
      NOW,
    );
    expect(plan).toHaveLength(2);
    expect(plan[0].identifier).not.toBe(plan[1].identifier);
  });

  it("skips a task that is already completed", () => {
    expect(planEndOfBlockPushes([makeTask({ completed: true })], NOW)).toEqual(
      [],
    );
  });

  it("skips all-day tasks", () => {
    expect(planEndOfBlockPushes([makeTask({ allDay: true })], NOW)).toEqual([]);
  });

  it("skips deadlines", () => {
    expect(planEndOfBlockPushes([makeTask({ isDeadline: true })], NOW)).toEqual(
      [],
    );
  });

  it("skips a task with no duration", () => {
    const task = makeTask({ endDate: ts(NOW + 10 * MIN) });
    expect(planEndOfBlockPushes([task], NOW)).toEqual([]);
  });

  it("skips a block that has already ended", () => {
    const task = makeTask({
      startDate: ts(NOW - 90 * MIN),
      endDate: ts(NOW - 30 * MIN),
    });
    expect(planEndOfBlockPushes([task], NOW)).toEqual([]);
  });

  it("skips a task with no end date", () => {
    expect(
      planEndOfBlockPushes([makeTask({ endDate: undefined })], NOW),
    ).toEqual([]);
  });
});
