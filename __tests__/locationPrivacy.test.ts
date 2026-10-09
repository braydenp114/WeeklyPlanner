import { getVerificationMethod, createLocationTracker } from '@/services/locationPrivacy';
import { createMemoryStore } from './helpers/memoryStore';

describe('location privacy', () => {
  it('1. uses geofence detection when location sharing is on', () => {
    expect(getVerificationMethod({ locationSharing: true })).toBe('geofence');
  });

  it('2. falls back to manual confirmation when location sharing is off', () => {
    expect(getVerificationMethod({ locationSharing: false })).toBe('manual');
  });

  it('3. stores a new location point when sharing is on', () => {
    const store = createMemoryStore();
    const tracker = createLocationTracker({ store });

    tracker.record('user1', { latitude: -36.85, longitude: 174.76, timestamp: 1 });

    expect(store.getPoints('user1')).toEqual([
      { latitude: -36.85, longitude: 174.76, timestamp: 1 },
    ]);
  });
});
