/**
 * Keyword search over the tasks already loaded into a calendar view.
 *
 * Matching is a case-insensitive substring test against the task title only, so
 * "gym" finds "Gym session" but not a task that merely mentions a gym in its
 * description. An empty or whitespace-only query matches everything, which is
 * what restores the full list when the search field is cleared.
 */

/** Trimmed, case-folded form of a raw search field value. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Whether the field holds a keyword worth filtering on. */
export function isSearchActive(query: string): boolean {
  return normalizeQuery(query).length > 0;
}

/** Case-insensitive substring match of a keyword against one title. */
export function matchesQuery(title: string, query: string): boolean {
  const needle = normalizeQuery(query);
  if (!needle) return true;
  return (title ?? '').toLowerCase().includes(needle);
}

/**
 * Narrows a list of tasks to those whose title contains the keyword.
 * Returns the original array untouched when the query is empty.
 */
export function filterByQuery<T extends { title: string }>(items: T[], query: string): T[] {
  if (!isSearchActive(query)) return items;
  const needle = normalizeQuery(query);
  return items.filter((item) => (item.title ?? '').toLowerCase().includes(needle));
}
