export function getVerificationMethod({ locationSharing }: { locationSharing: boolean }): 'geofence' | 'manual' {
  return locationSharing ? 'geofence' : 'manual';
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface LocationStore {
  addPoint(userId: string, point: LocationPoint): void;
  deletePoints(userId: string): void;
}

export function createLocationTracker({
  store,
  stopWatcher,
}: {
  store: LocationStore;
  stopWatcher?: () => void;
}) {
  let sharing = true;

  return {
    setSharing(value: boolean) {
      sharing = value;
      if (!value && stopWatcher) {
        stopWatcher();
      }
    },
    record(userId: string, point: LocationPoint) {
      if (!sharing) return;
      store.addPoint(userId, point);
    },
  };
}

export function deleteLocationHistory(store: LocationStore, userId: string) {
  store.deletePoints(userId);
}
