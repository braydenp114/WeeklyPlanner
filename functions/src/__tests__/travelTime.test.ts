import { calculateHaversineMeters, parseDurationSeconds, getTravelTime } from '../index';

process.env.ROUTES_API_KEY = 'mock_routes_api_key';

jest.mock('firebase-admin', () => {
  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: Object.assign(
      jest.fn(() => ({
        doc: jest.fn(() => ({})),
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({})),
        })),
        runTransaction: jest.fn((cb: any) =>
          cb({
            get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
            set: jest.fn(),
            update: jest.fn(),
          })
        ),
      })),
      {
        FieldValue: {
          serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
        },
      }
    ),
  };
});

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

describe('getTravelTime handler', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            duration: '600s',
            staticDuration: '500s',
            distanceMeters: 10000,
          },
        ],
      }),
    });
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('omits departureTime when target departure is within 30 seconds of now', async () => {
    const now = Date.now();
    // Departure in 15 seconds (within 30s threshold)
    const depTime = new Date(now + 15 * 1000).toISOString();

    const request = {
      auth: { uid: 'user_test_123' },
      data: {
        origin: { latitude: 37.7749, longitude: -122.4194 },
        destination: { latitude: 37.3382, longitude: -121.8863 },
        travelMode: 'DRIVE' as const,
        departureTime: depTime,
      },
    };

    const result = await (getTravelTime as any).run(request);
    expect(result.durationMinutes).toBe(10);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.departureTime).toBeUndefined();
    expect(body.routingPreference).toBe('TRAFFIC_AWARE_OPTIMAL');
  });

  it('omits departureTime when target departure is in the past', async () => {
    const now = Date.now();
    // Departure 2 minutes in the past
    const depTime = new Date(now - 120 * 1000).toISOString();

    const request = {
      auth: { uid: 'user_test_123' },
      data: {
        origin: { latitude: 37.7749, longitude: -122.4194 },
        destination: { latitude: 37.3382, longitude: -121.8863 },
        travelMode: 'DRIVE' as const,
        departureTime: depTime,
      },
    };

    const result = await (getTravelTime as any).run(request);
    expect(result.durationMinutes).toBe(10);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.departureTime).toBeUndefined();
  });

  it('includes departureTime when target departure is more than 30 seconds in the future', async () => {
    const now = Date.now();
    // Departure 15 minutes in the future (> 30s threshold)
    const futureDate = new Date(now + 15 * 60 * 1000);

    const request = {
      auth: { uid: 'user_test_123' },
      data: {
        origin: { latitude: 37.7749, longitude: -122.4194 },
        destination: { latitude: 37.3382, longitude: -121.8863 },
        travelMode: 'DRIVE' as const,
        departureTime: futureDate.toISOString(),
      },
    };

    const result = await (getTravelTime as any).run(request);
    expect(result.durationMinutes).toBe(10);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.departureTime).toBe(futureDate.toISOString());
  });
});

