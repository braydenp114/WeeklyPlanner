import { Task } from '../services/tasksService';

export type FeasibilityStatus = 'feasible' | 'tight' | 'infeasible' | 'overlap';

export interface FeasibilityResult {
  status: FeasibilityStatus;
  scheduledGapMinutes: number;
  travelMinutes: number;
  bufferMinutes: number;
  shortfallMinutes: number;
  slackMinutes: number;
}

export interface TaskTravelPair {
  fromTask: Task;
  toTask: Task;
  scheduledGapMinutes: number;
  departureTimeIso: string;
}

/** Allotted buffer in minutes after a previous task ends for pack-up / transition before departure. */
export const DEPARTURE_OFFSET_MINUTES = 3;
export const DEPARTURE_OFFSET_MS = DEPARTURE_OFFSET_MINUTES * 60 * 1000;

/**
 * Calculates straight-line distance in meters using Haversine formula
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) *
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates whether a schedule transition is physically feasible given travel time and a comfort buffer.
 *
 * @param scheduledGapMinutes Gap in minutes between the previous task's end and the next task's start
 * @param travelMinutes Estimated travel time in minutes
 * @param bufferMinutes Safety/comfort buffer in minutes (defaults to 10)
 * @param departureOffsetMinutes Allotted departure buffer in minutes (defaults to DEPARTURE_OFFSET_MINUTES = 3)
 */
export function calculateFeasibility(
  scheduledGapMinutes: number,
  travelMinutes: number,
  bufferMinutes: number = 10,
  departureOffsetMinutes: number = DEPARTURE_OFFSET_MINUTES
): FeasibilityResult {
  const gap = Math.round(scheduledGapMinutes);
  const travel = Math.max(0, Math.round(travelMinutes));
  const buffer = Math.max(0, Math.round(bufferMinutes));
  const offset = Math.max(0, Math.round(departureOffsetMinutes));

  // Overlap is classified strictly by raw negative scheduled gap (no offset)
  if (gap < 0) {
    return {
      status: 'overlap',
      scheduledGapMinutes: gap,
      travelMinutes: travel,
      bufferMinutes: buffer,
      shortfallMinutes: Math.abs(gap) + travel,
      slackMinutes: 0,
    };
  }

  // Apply departure offset only when travel minutes are above 0 (no offset for same-location or zero-travel pairs)
  const effectiveGap = travel > 0 ? gap - offset : gap;

  if (effectiveGap < travel) {
    return {
      status: 'infeasible',
      scheduledGapMinutes: gap,
      travelMinutes: travel,
      bufferMinutes: buffer,
      shortfallMinutes: travel - effectiveGap,
      slackMinutes: 0,
    };
  }

  if (effectiveGap < travel + buffer) {
    return {
      status: 'tight',
      scheduledGapMinutes: gap,
      travelMinutes: travel,
      bufferMinutes: buffer,
      shortfallMinutes: 0,
      slackMinutes: effectiveGap - travel,
    };
  }

  return {
    status: 'feasible',
    scheduledGapMinutes: gap,
    travelMinutes: travel,
    bufferMinutes: buffer,
    shortfallMinutes: 0,
    slackMinutes: effectiveGap - (travel + buffer),
  };
}

/**
 * Calculates a fallback heuristic travel time (in minutes) based on Haversine distance
 */
export function calculateHeuristicTravelMinutes(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  mode: 'DRIVE' | 'TRANSIT' | 'WALK' = 'DRIVE'
): number {
  const distanceMeters = calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2);
  if (distanceMeters < 50) {
    return 0;
  }

  const distanceKm = distanceMeters / 1000;
  let speedKmH = 35; // Default driving speed
  if (mode === 'WALK') {
    speedKmH = 4.5;
  } else if (mode === 'TRANSIT') {
    speedKmH = 25;
  }

  const hours = distanceKm / speedKmH;
  return Math.max(1, Math.round(hours * 60));
}

/**
 * Helper to get millisecond timestamp from Firestore Timestamp or Date-like object
 */
function getTimestampMs(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (ts.seconds != null) return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  return 0;
}

/**
 * Filters and pairs consecutive location-based tasks on the same calendar day.
 * Skips all-day tasks and tasks without valid latitude and longitude coordinates.
 */
export function getConsecutiveTaskPairs(tasks: Task[]): TaskTravelPair[] {
  // 1. Filter tasks: must have valid coordinates and not be all-day
  const locationTasks = tasks.filter((t) => {
    if (t.allDay) return false;
    if (typeof t.latitude !== 'number' || typeof t.longitude !== 'number') return false;
    return true;
  });

  // 2. Sort by start date ascending
  locationTasks.sort((a, b) => getTimestampMs(a.startDate) - getTimestampMs(b.startDate));

  // 3. Form consecutive pairs
  const pairs: TaskTravelPair[] = [];
  const nowMs = Date.now();

  for (let i = 0; i < locationTasks.length - 1; i++) {
    const fromTask = locationTasks[i];
    const toTask = locationTasks[i + 1];

    const fromEndMs = getTimestampMs(fromTask.endDate);
    const toStartMs = getTimestampMs(toTask.startDate);

    const scheduledGapMinutes = Math.round((toStartMs - fromEndMs) / (60 * 1000));

    // Departure time offset: pack-up buffer after fromTask ends
    let departureMs = fromEndMs + DEPARTURE_OFFSET_MS;
    // Clamp to now if passed
    if (departureMs < nowMs) {
      departureMs = nowMs;
    }

    pairs.push({
      fromTask,
      toTask,
      scheduledGapMinutes,
      departureTimeIso: new Date(departureMs).toISOString(),
    });
  }

  return pairs;
}
