import { calculateHaversineMeters, parseDurationSeconds } from '../index';

describe('Cloud Function travel time helpers', () => {
  it('parses protobuf duration strings correctly', () => {
    expect(parseDurationSeconds('120s')).toBe(120);
    expect(parseDurationSeconds('300.5s')).toBe(301);
    expect(parseDurationSeconds('0s')).toBe(0);
    expect(parseDurationSeconds(undefined)).toBe(0);
    expect(parseDurationSeconds('invalid')).toBe(0);
  });

  it('calculates Haversine distance correctly for identical coordinates', () => {
    const loc = { latitude: 37.7749, longitude: -122.4194 };
    const distance = calculateHaversineMeters(loc, loc);
    expect(distance).toBe(0);
  });

  it('calculates Haversine distance correctly for separated locations', () => {
    // San Francisco to San Jose (~67-70 km)
    const sf = { latitude: 37.7749, longitude: -122.4194 };
    const sj = { latitude: 37.3382, longitude: -121.8863 };
    const distance = calculateHaversineMeters(sf, sj);
    expect(distance).toBeGreaterThan(65000);
    expect(distance).toBeLessThan(75000);
  });

  it('detects distances less than 50 meters as zero-distance', () => {
    // Two points roughly 10 meters apart
    const p1 = { latitude: 37.774900, longitude: -122.419400 };
    const p2 = { latitude: 37.774950, longitude: -122.419400 };
    const distance = calculateHaversineMeters(p1, p2);
    expect(distance).toBeLessThan(50);
  });
});
