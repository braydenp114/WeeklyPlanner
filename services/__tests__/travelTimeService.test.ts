import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../config/firebase', () => ({
  functions: {},
}));

// Mock dependencies
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

import { getRouteCacheKey, getTravelTimeEstimate } from '../travelTimeService';

describe('travelTimeService', () => {
  describe('getRouteCacheKey', () => {
    it('produces identical keys for coordinates rounded to 4 decimals', () => {
      const origin1 = { latitude: 37.774912, longitude: -122.419412 };
      const origin2 = { latitude: 37.774944, longitude: -122.419444 };
      const dest = { latitude: 37.3382, longitude: -121.8863 };
      const timeMs = Date.now() + 10 * 60 * 1000;

      const key1 = getRouteCacheKey(origin1, dest, 'DRIVE', timeMs);
      const key2 = getRouteCacheKey(origin2, dest, 'DRIVE', timeMs);

      expect(key1).toBe(key2);
    });

    it('differentiates travel modes in cache key', () => {
      const origin = { latitude: 37.7749, longitude: -122.4194 };
      const dest = { latitude: 37.3382, longitude: -121.8863 };
      const timeMs = Date.now();

      const driveKey = getRouteCacheKey(origin, dest, 'DRIVE', timeMs);
      const transitKey = getRouteCacheKey(origin, dest, 'TRANSIT', timeMs);

      expect(driveKey).not.toBe(transitKey);
      expect(driveKey).toContain('_DRIVE_');
      expect(transitKey).toContain('_TRANSIT_');
    });
  });

  describe('getTravelTimeEstimate', () => {
    it('returns zero duration immediately for coordinates < 50 meters apart', async () => {
      const p1 = { latitude: 37.774900, longitude: -122.419400 };
      const p2 = { latitude: 37.774920, longitude: -122.419400 }; // ~2m apart

      const result = await getTravelTimeEstimate({
        origin: p1,
        destination: p2,
        travelMode: 'DRIVE',
      });

      expect(result.durationMinutes).toBe(0);
      expect(result.distanceMeters).toBeLessThan(50);
      expect(result.trafficDelayMinutes).toBe(0);
    });

    it('falls back gracefully to heuristic estimate on network failure', async () => {
      const { httpsCallable } = require('firebase/functions');
      (httpsCallable as unknown as jest.Mock).mockReturnValue(
        (() => Promise.reject(new Error('Network error / offline'))) as any
      );


      const sf = { latitude: 37.7749, longitude: -122.4194 };
      const oakland = { latitude: 37.8044, longitude: -122.2712 }; // ~13 km

      const result = await getTravelTimeEstimate({
        origin: sf,
        destination: oakland,
        travelMode: 'DRIVE',
      });

      expect(result.isHeuristic).toBe(true);
      expect(result.durationMinutes).toBeGreaterThan(0);
      expect(result.distanceMeters).toBeGreaterThan(10000);
    });
  });
});
