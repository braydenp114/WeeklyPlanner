export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export function createMemoryStore() {
  const pointsByUser = new Map<string, LocationPoint[]>();

  return {
    addPoint(userId: string, point: LocationPoint) {
      const points = pointsByUser.get(userId) ?? [];
      points.push(point);
      pointsByUser.set(userId, points);
    },
    getPoints(userId: string): LocationPoint[] {
      return pointsByUser.get(userId) ?? [];
    },
    deletePoints(userId: string) {
      pointsByUser.delete(userId);
    },
  };
}
