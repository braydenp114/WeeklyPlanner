import { describe, expect, test } from '@jest/globals';
import { calculateGoalGap } from '../weekly-goal';

describe('calculateGoalGap', () => {
  test('shows a 2 hour gap when the goal is 5h and 3h are scheduled', () => {
    expect(calculateGoalGap(5, 3)).toBe(2);
  });

  test('has no gap when the scheduled time exactly meets the goal', () => {
    expect(calculateGoalGap(5, 5)).toBe(0);
  });

  test('never returns a negative gap when the goal is exceeded', () => {
    expect(calculateGoalGap(5, 7.5)).toBe(0);
  });

  test('returns null when no goal is set (empty input)', () => {
    expect(calculateGoalGap(parseFloat(''), 3)).toBeNull();
  });

  test('returns null when the goal is 0', () => {
    expect(calculateGoalGap(0, 3)).toBeNull();
  });

  test('works with decimal goals', () => {
    expect(calculateGoalGap(2.5, 1)).toBe(1.5);
  });
});
