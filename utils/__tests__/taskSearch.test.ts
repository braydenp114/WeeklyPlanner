import { describe, expect, test } from '@jest/globals';
import { filterByQuery, isSearchActive, matchesQuery, normalizeQuery } from '../taskSearch';

const titled = (...titles: string[]) => titles.map((title) => ({ title }));

describe('matchesQuery', () => {
  test('matches regardless of case', () => {
    expect(matchesQuery('Gym session', 'gym')).toBe(true);
    expect(matchesQuery('gym session', 'GYM')).toBe(true);
    expect(matchesQuery('Study COMP602', 'comp602')).toBe(true);
  });

  test('matches a keyword anywhere in the title, not just the start', () => {
    expect(matchesQuery('Morning gym session', 'gym')).toBe(true);
    expect(matchesQuery('Study COMP602', '602')).toBe(true);
  });

  test('does not match an unrelated title', () => {
    expect(matchesQuery('Study COMP602', 'gym')).toBe(false);
  });

  test('an empty or whitespace-only query matches everything', () => {
    expect(matchesQuery('Study COMP602', '')).toBe(true);
    expect(matchesQuery('Study COMP602', '   ')).toBe(true);
  });

  test('surrounding whitespace in the query is ignored', () => {
    expect(matchesQuery('Gym session', '  gym  ')).toBe(true);
  });
});

describe('filterByQuery', () => {
  // Acceptance: "Gym session" and "Study COMP602" exist, searching "gym" shows only the gym task.
  test('keeps only the tasks whose title contains the keyword', () => {
    const tasks = titled('Gym session', 'Study COMP602');
    expect(filterByQuery(tasks, 'gym').map((t) => t.title)).toEqual(['Gym session']);
  });

  // Acceptance: no task matches the keyword, so the caller can show an empty state.
  test('returns nothing when no title matches', () => {
    const tasks = titled('Gym session', 'Study COMP602');
    expect(filterByQuery(tasks, 'dentist')).toEqual([]);
  });

  // Acceptance: clearing the field brings the full list back.
  test('returns the full list for an empty query', () => {
    const tasks = titled('Gym session', 'Study COMP602');
    expect(filterByQuery(tasks, '')).toHaveLength(2);
    expect(filterByQuery(tasks, '   ')).toHaveLength(2);
  });

  test('returns the same array reference when the query is empty', () => {
    const tasks = titled('Gym session');
    expect(filterByQuery(tasks, '')).toBe(tasks);
  });

  test('keeps every title that matches, not just the first', () => {
    const tasks = titled('Gym session', 'Gym — leg day', 'Study COMP602');
    expect(filterByQuery(tasks, 'gym')).toHaveLength(2);
  });

  test('tolerates a task with a missing title', () => {
    const tasks = [{ title: 'Gym session' }, { title: undefined as unknown as string }];
    expect(filterByQuery(tasks, 'gym')).toHaveLength(1);
  });
});

describe('isSearchActive / normalizeQuery', () => {
  test('a blank field is not an active search', () => {
    expect(isSearchActive('')).toBe(false);
    expect(isSearchActive('   ')).toBe(false);
  });

  test('any real keyword is an active search', () => {
    expect(isSearchActive('gym')).toBe(true);
    expect(isSearchActive('  gym ')).toBe(true);
  });

  test('normalizeQuery trims and case-folds', () => {
    expect(normalizeQuery('  GyM  ')).toBe('gym');
  });
});
