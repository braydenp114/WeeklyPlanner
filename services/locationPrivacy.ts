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
  return {
    record(userId: string, point: LocationPoint) {
      store.addPoint(userId, point);
    },
  };
}
