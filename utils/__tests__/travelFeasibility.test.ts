import { describe, expect, it } from '@jest/globals';
import {
  calculateFeasibility,
  calculateHaversineDistanceMeters,
  calculateHeuristicTravelMinutes,
  getConsecutiveTaskPairs,
} from '../travelFeasibility';
import type { Task } from '../../services/tasksService';
import type { Timestamp } from 'firebase/firestore';

const fakeTimestamp = (ms: number) => ({ toMillis: () => ms }) as unknown as Timestamp;

describe('travelFeasibility utils', () => {
  describe('calculateFeasibility', () => {
    it('returns overlap when scheduled gap is negative (classified strictly by raw negative gap)', () => {
      const result = calculateFeasibility(-15, 20, 10);
      expect(result.status).toBe('overlap');
      expect(result.shortfallMinutes).toBe(35); // Math.abs(-15) + 20 (no offset on raw overlap)
      expect(result.slackMinutes).toBe(0);
    });

    it('classifies a 0 to 2 minute gap at different locations as infeasible (not overlap)', () => {
      // 0 minute gap with 15 min travel
      const gap0 = calculateFeasibility(0, 15, 10);
      expect(gap0.status).toBe('infeasible');
      expect(gap0.shortfallMinutes).toBe(18); // 15 - (0 - 3)
      expect(gap0.slackMinutes).toBe(0);

      // 1 minute gap with 15 min travel
      const gap1 = calculateFeasibility(1, 15, 10);
      expect(gap1.status).toBe('infeasible');
      expect(gap1.shortfallMinutes).toBe(17); // 15 - (1 - 3)
      expect(gap1.slackMinutes).toBe(0);

      // 2 minute gap with 15 min travel
      const gap2 = calculateFeasibility(2, 15, 10);
      expect(gap2.status).toBe('infeasible');
      expect(gap2.shortfallMinutes).toBe(16); // 15 - (2 - 3)
      expect(gap2.slackMinutes).toBe(0);
    });

    it('classifies any gap of 0 or more for zero-travel pairs as feasible, ignoring buffer', () => {
      // 0 min gap, 0 travel, 10 min comfort buffer -> feasible (ignores buffer) with 0 slack
      const sameLocationZeroGap = calculateFeasibility(0, 0, 10);
      expect(sameLocationZeroGap.status).toBe('feasible');
      expect(sameLocationZeroGap.shortfallMinutes).toBe(0);
      expect(sameLocationZeroGap.slackMinutes).toBe(0);

      // 5 min gap, 0 travel, 10 min buffer -> feasible with 5 min slack (not tight)
      const sameLocationPositiveGap = calculateFeasibility(5, 0, 10);
      expect(sameLocationPositiveGap.status).toBe('feasible');
      expect(sameLocationPositiveGap.shortfallMinutes).toBe(0);
      expect(sameLocationPositiveGap.slackMinutes).toBe(5);

      // 0 min gap, 0 travel, 0 buffer -> feasible with 0 slack
      const zeroBuffer = calculateFeasibility(0, 0, 0);
      expect(zeroBuffer.status).toBe('feasible');
      expect(zeroBuffer.shortfallMinutes).toBe(0);
      expect(zeroBuffer.slackMinutes).toBe(0);
    });

    it('returns infeasible when scheduled gap is less than travel time + departure offset', () => {
      const result = calculateFeasibility(15, 25, 10);
      expect(result.status).toBe('infeasible');
      expect(result.shortfallMinutes).toBe(13); // 25 - (15 - 3)
      expect(result.slackMinutes).toBe(0);
    });

    it('returns tight when scheduled gap covers travel time but is within buffer', () => {
      const result = calculateFeasibility(30, 25, 10);
      expect(result.status).toBe('tight');
      expect(result.shortfallMinutes).toBe(0);
      expect(result.slackMinutes).toBe(2); // (30 - 3) - 25
    });

    it('returns feasible when scheduled gap covers travel time plus comfort buffer', () => {
      const result = calculateFeasibility(40, 20, 10);
      expect(result.status).toBe('feasible');
      expect(result.shortfallMinutes).toBe(0);
      expect(result.slackMinutes).toBe(7); // (40 - 3) - (20 + 10)
    });

    it('handles exact boundaries properly', () => {
      // travel = 20, buffer = 10, offset = 3
      // 1 minute below tight boundary (22 min gap) -> infeasible
      const belowTight = calculateFeasibility(22, 20, 10);
      expect(belowTight.status).toBe('infeasible');
      expect(belowTight.shortfallMinutes).toBe(1);

      // Exactly equals travel time + departure offset (20 + 3 = 23) -> tight with 0 slack
      const tightBoundary = calculateFeasibility(23, 20, 10);
      expect(tightBoundary.status).toBe('tight');
      expect(tightBoundary.slackMinutes).toBe(0);

      // 1 minute below feasible boundary (32 min gap) -> tight with 9 min slack
      const belowFeasible = calculateFeasibility(32, 20, 10);
      expect(belowFeasible.status).toBe('tight');
      expect(belowFeasible.slackMinutes).toBe(9);

      // Exactly equals travel + buffer + departure offset (20 + 10 + 3 = 33) -> feasible with 0 slack
      const feasibleBoundary = calculateFeasibility(33, 20, 10);
      expect(feasibleBoundary.status).toBe('feasible');
      expect(feasibleBoundary.slackMinutes).toBe(0);
    });
  });

  describe('calculateHaversineDistanceMeters', () => {
    it('returns 0 for identical coordinates', () => {
      expect(calculateHaversineDistanceMeters(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
    });

    it('returns realistic distance between distinct coordinates', () => {
      // NYC to Philadelphia (~130 km)
      const dist = calculateHaversineDistanceMeters(40.7128, -74.006, 39.9526, -75.1652);
      expect(dist).toBeGreaterThan(120000);
      expect(dist).toBeLessThan(140000);
    });
  });

  describe('calculateHeuristicTravelMinutes', () => {
    it('returns 0 for locations closer than 50 meters', () => {
      expect(calculateHeuristicTravelMinutes(40.7128, -74.006, 40.71282, -74.006, 'DRIVE')).toBe(0);
    });

    it('calculates reasonable driving time', () => {
      // ~35 km at 35 km/h = ~60 minutes
      const p1 = { lat: 0, lon: 0 };
      const p2 = { lat: 0.315, lon: 0 }; // ~35 km
      const minutes = calculateHeuristicTravelMinutes(p1.lat, p1.lon, p2.lat, p2.lon, 'DRIVE');
      expect(minutes).toBeGreaterThan(50);
      expect(minutes).toBeLessThan(70);
    });

    it('calculates walking time significantly longer than driving', () => {
      const p1 = { lat: 0, lon: 0 };
      const p2 = { lat: 0.045, lon: 0 }; // ~5 km
      const driveMin = calculateHeuristicTravelMinutes(p1.lat, p1.lon, p2.lat, p2.lon, 'DRIVE');
      const walkMin = calculateHeuristicTravelMinutes(p1.lat, p1.lon, p2.lat, p2.lon, 'WALK');
      expect(walkMin).toBeGreaterThan(driveMin);
      expect(walkMin).toBeGreaterThan(55); // 5km at 4.5km/h = ~67m
    });
  });

  describe('getConsecutiveTaskPairs', () => {
    const makeTask = (
      id: string,
      startHour: number,
      endHour: number,
      lat?: number | null,
      lon?: number | null,
      allDay: boolean = false
    ): Task => {
      const base = new Date(2026, 9, 13, 0, 0, 0, 0).getTime();
      return {
        id,
        title: `Task ${id}`,
        description: null,
        location: lat != null ? 'Somewhere' : null,
        latitude: lat,
        longitude: lon,
        colorHex: '#3b82f6',
        category: null,
        busyStatus: 'busy',
        visibility: 'default',
        startDate: fakeTimestamp(base + startHour * 3600000),
        endDate: fakeTimestamp(base + endHour * 3600000),
        allDay,
        recurrence: 'none',
        recurrenceEndDate: null,
        customRecurrenceRule: null,
        notification: null,
        ownerId: 'user123',
        createdAt: fakeTimestamp(base),
      };
    };

    it('pairs consecutive tasks with valid coordinates', () => {
      const t1 = makeTask('1', 9, 10, 37.77, -122.41);
      const t2 = makeTask('2', 11, 12, 37.78, -122.42);
      const t3 = makeTask('3', 14, 15, 37.79, -122.43);

      const pairs = getConsecutiveTaskPairs([t2, t1, t3]); // deliberately out of order
      expect(pairs.length).toBe(2);

      expect(pairs[0].fromTask.id).toBe('1');
      expect(pairs[0].toTask.id).toBe('2');
      expect(pairs[0].scheduledGapMinutes).toBe(60); // 10:00 to 11:00

      expect(pairs[1].fromTask.id).toBe('2');
      expect(pairs[1].toTask.id).toBe('3');
      expect(pairs[1].scheduledGapMinutes).toBe(120); // 12:00 to 14:00
    });

    it('skips all-day tasks and tasks without coordinates', () => {
      const t1 = makeTask('1', 9, 10, 37.77, -122.41);
      const tNoCoord = makeTask('no-coords', 10, 11, null, null);
      const tAllDay = makeTask('all-day', 11, 12, 37.78, -122.42, true);
      const t2 = makeTask('2', 13, 14, 37.79, -122.43);

      const pairs = getConsecutiveTaskPairs([t1, tNoCoord, tAllDay, t2]);
      expect(pairs.length).toBe(1);
      expect(pairs[0].fromTask.id).toBe('1');
      expect(pairs[0].toTask.id).toBe('2');
      expect(pairs[0].scheduledGapMinutes).toBe(180); // 10:00 to 13:00
    });
  });
});
