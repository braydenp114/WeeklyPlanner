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

  it('4. ignores new location points after sharing is turned off', () => {
    const store = createMemoryStore();
    const tracker = createLocationTracker({ store });

    tracker.setSharing(false);
    tracker.record('user1', { latitude: -36.85, longitude: 174.76, timestamp: 2 });

    expect(store.getPoints('user1')).toEqual([]);
  });

  it('5. stops the location watcher when sharing is turned off', () => {
    const store = createMemoryStore();
    const stopWatcher = jest.fn();
    const tracker = createLocationTracker({ store, stopWatcher });

    tracker.setSharing(false);

    expect(stopWatcher).toHaveBeenCalledTimes(1);
  });
});
