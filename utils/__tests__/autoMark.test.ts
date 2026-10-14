import { describe, it, expect } from "@jest/globals";
import { shouldAutoMarkByType } from "../autoMark";
import { PRESET_LOCATIONS } from "../../constants/presetLocations";

const MIN = 60_000;
const NOW = 1_000_000_000_000;
const ts = (ms: number) => ({ toMillis: () => ms }) as any;

const campus = PRESET_LOCATIONS.find((p) => p.type === "campus")!;
const gym = PRESET_LOCATIONS.find((p) => p.type === "gym")!;

function makeTask(overrides: any = {}) {
  return {
    startDate: ts(NOW - 10 * MIN),
    endDate: ts(NOW + 50 * MIN),
    isDeadline: false,
    completed: false,
    locationType: "campus",
    ...overrides,
  } as any;
}

describe("shouldAutoMarkByType", () => {
  it("marks a campus task when arriving at a campus inside its window", () => {
    expect(shouldAutoMarkByType(makeTask(), campus, NOW)).toBe(true);
  });

  it("marks a gym task when arriving at a gym", () => {
    expect(
      shouldAutoMarkByType(makeTask({ locationType: "gym" }), gym, NOW),
    ).toBe(true);
  });

  it("does not mark a gym task when arriving at a campus", () => {
    expect(
      shouldAutoMarkByType(makeTask({ locationType: "gym" }), campus, NOW),
    ).toBe(false);
  });

  it("does not mark a task with no location type", () => {
    expect(
      shouldAutoMarkByType(makeTask({ locationType: null }), campus, NOW),
    ).toBe(false);
  });

  it("does not mark a task that is already completed", () => {
    expect(
      shouldAutoMarkByType(makeTask({ completed: true }), campus, NOW),
    ).toBe(false);
  });

  it("does not mark a task before its window starts", () => {
    const task = makeTask({
      startDate: ts(NOW + 5 * MIN),
      endDate: ts(NOW + 65 * MIN),
    });
    expect(shouldAutoMarkByType(task, campus, NOW)).toBe(false);
  });

  it("does not mark a task after its window has ended", () => {
    const task = makeTask({
      startDate: ts(NOW - 90 * MIN),
      endDate: ts(NOW - 30 * MIN),
    });
    expect(shouldAutoMarkByType(task, campus, NOW)).toBe(false);
  });

  it("gives a deadline a 30 minute grace period", () => {
    const task = makeTask({
      isDeadline: true,
      startDate: ts(NOW - 20 * MIN),
      endDate: ts(NOW - 20 * MIN),
    });
    expect(shouldAutoMarkByType(task, campus, NOW)).toBe(true);
  });

  it("does not mark a deadline once the grace period is over", () => {
    const task = makeTask({
      isDeadline: true,
      startDate: ts(NOW - 40 * MIN),
      endDate: ts(NOW - 40 * MIN),
    });
    expect(shouldAutoMarkByType(task, campus, NOW)).toBe(false);
  });
});
