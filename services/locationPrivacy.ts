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
}

export function createLocationTracker({ store }: { store: LocationStore }) {
  let sharing = true;

  return {
    setSharing(value: boolean) {
      sharing = value;
    },
    record(userId: string, point: LocationPoint) {
      if (!sharing) return;
      store.addPoint(userId, point);
    },
  };
}
