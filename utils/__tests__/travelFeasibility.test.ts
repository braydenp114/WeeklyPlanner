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
    it('returns overlap when scheduled gap is negative', () => {
      const result = calculateFeasibility(-15, 20, 10);
      expect(result.status).toBe('overlap');
      expect(result.shortfallMinutes).toBe(35); // 15 + 20
      expect(result.slackMinutes).toBe(0);
    });

    it('returns infeasible when scheduled gap is less than travel time', () => {
      const result = calculateFeasibility(15, 25, 10);
      expect(result.status).toBe('infeasible');
      expect(result.shortfallMinutes).toBe(10); // 25 - 15
      expect(result.slackMinutes).toBe(0);
    });

    it('returns tight when scheduled gap covers travel time but is within buffer', () => {
      const result = calculateFeasibility(30, 25, 10);
      expect(result.status).toBe('tight');
      expect(result.shortfallMinutes).toBe(0);
      expect(result.slackMinutes).toBe(5); // 30 - 25
    });

    it('returns feasible when scheduled gap covers travel time plus comfort buffer', () => {
      const result = calculateFeasibility(40, 20, 10);
      expect(result.status).toBe('feasible');
      expect(result.shortfallMinutes).toBe(0);
      expect(result.slackMinutes).toBe(10); // 40 - (20 + 10)
    });

    it('handles exact boundaries properly', () => {
      // Exactly equals travel time -> tight
      const tightBoundary = calculateFeasibility(20, 20, 10);
      expect(tightBoundary.status).toBe('tight');

      // Exactly equals travel + buffer -> feasible
      const feasibleBoundary = calculateFeasibility(30, 20, 10);
      expect(feasibleBoundary.status).toBe('feasible');
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
