import { PRESET_LOCATIONS, PresetLocation } from "../constants/presetLocations";

export const ARRIVAL_RADIUS_METRES = 150;

export function distanceInMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function findPresetAt(
  latitude: number,
  longitude: number,
  radius: number = ARRIVAL_RADIUS_METRES,
): PresetLocation | null {
  let closest: PresetLocation | null = null;
  let closestDistance = Infinity;
  for (const preset of PRESET_LOCATIONS) {
    const d = distanceInMetres(
      latitude,
      longitude,
      preset.latitude,
      preset.longitude,
    );
    if (d <= radius && d < closestDistance) {
      closest = preset;
      closestDistance = d;
    }
  }
  return closest;
}
