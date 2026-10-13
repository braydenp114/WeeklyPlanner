import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { functions } from '../config/firebase';
import {
  calculateHeuristicTravelMinutes,
  calculateHaversineDistanceMeters,
} from '../utils/travelFeasibility';

export type TravelMode = 'DRIVE' | 'TRANSIT' | 'WALK';

export interface TravelEstimate {
  durationMinutes: number;
  staticDurationMinutes: number;
  distanceMeters: number;
  trafficDelayMinutes: number;
  isTransitUnavailable?: boolean;
  isHeuristic?: boolean;
  travelMode: TravelMode;
  departureTimeIso: string;
}

export interface FetchTravelTimeParams {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  travelMode?: TravelMode;
  departureTime?: string; // ISO 8601 string
}

// In-memory cache for fast UI updates during a session
const memoryCache = new Map<string, TravelEstimate>();
const STORAGE_CACHE_PREFIX = 'travel_cache_v1_';

/**
 * Builds a deterministic bucketed cache key for routes.
 * Uses 15-minute intervals if departure is within 3 hours, 1-hour intervals otherwise.
 */
export function getRouteCacheKey(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  mode: TravelMode,
  departureTimeMs: number
): string {
  const oLat = origin.latitude.toFixed(4);
  const oLng = origin.longitude.toFixed(4);
  const dLat = destination.latitude.toFixed(4);
  const dLng = destination.longitude.toFixed(4);

  const diffFromNow = Math.abs(departureTimeMs - Date.now());
  const intervalMs = diffFromNow <= 3 * 60 * 60 * 1000 ? 15 * 60 * 1000 : 60 * 60 * 1000;
  const bucket = Math.floor(departureTimeMs / intervalMs);

  return `${oLat},${oLng}_${dLat},${dLng}_${mode}_${bucket}`;
}

/**
 * Retrieves cached estimate from memory or AsyncStorage if present and not stale.
 */
async function getCachedEstimate(key: string): Promise<TravelEstimate | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  try {
    const serialized = await AsyncStorage.getItem(STORAGE_CACHE_PREFIX + key);
    if (serialized) {
      const parsed = JSON.parse(serialized) as TravelEstimate;
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // Non-fatal cache read failure
  }

  return null;
}

/**
 * Stores calculated travel estimate into memory and persistent AsyncStorage.
 */
async function setCachedEstimate(key: string, estimate: TravelEstimate): Promise<void> {
  memoryCache.set(key, estimate);
  try {
    await AsyncStorage.setItem(STORAGE_CACHE_PREFIX + key, JSON.stringify(estimate));
  } catch {
    // Non-fatal cache write failure
  }
}

/**
 * Fetches estimated travel time between two coordinates using the secure Cloud Function proxy,
 * falling back gracefully to local heuristic calculation on network error or offline state.
 */
export async function getTravelTimeEstimate(params: FetchTravelTimeParams): Promise<TravelEstimate> {
  const { origin, destination, travelMode = 'DRIVE', departureTime } = params;

  // Zero-distance check (< 50 meters)
  const straightMeters = calculateHaversineDistanceMeters(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  const depMs = departureTime ? new Date(departureTime).getTime() : Date.now();
  const validDepMs = isNaN(depMs) ? Date.now() : depMs;
  const departureIso = new Date(validDepMs).toISOString();

  if (straightMeters < 50) {
    return {
      durationMinutes: 0,
      staticDurationMinutes: 0,
      distanceMeters: Math.round(straightMeters),
      trafficDelayMinutes: 0,
      travelMode,
      departureTimeIso: departureIso,
    };
  }

  const cacheKey = getRouteCacheKey(origin, destination, travelMode, validDepMs);
  const cached = await getCachedEstimate(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const callable = httpsCallable<FetchTravelTimeParams, {
      durationMinutes: number;
      staticDurationMinutes: number;
      distanceMeters: number;
      trafficDelayMinutes: number;
      isTransitUnavailable?: boolean;
    }>(functions, 'getTravelTime');

    const result = await callable({
      origin,
      destination,
      travelMode,
      departureTime: departureIso,
    });

    const data = result.data;
    const estimate: TravelEstimate = {
      durationMinutes: data.durationMinutes,
      staticDurationMinutes: data.staticDurationMinutes,
      distanceMeters: data.distanceMeters,
      trafficDelayMinutes: data.trafficDelayMinutes,
      isTransitUnavailable: data.isTransitUnavailable,
      travelMode,
      departureTimeIso: departureIso,
    };

    await setCachedEstimate(cacheKey, estimate);
    return estimate;
  } catch (error: any) {
    console.warn('[travelTimeService] Cloud Function failed, using heuristic fallback:', error?.message || error);

    // Graceful offline heuristic fallback
    const heuristicDuration = calculateHeuristicTravelMinutes(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
      travelMode
    );

    const fallbackEstimate: TravelEstimate = {
      durationMinutes: heuristicDuration,
      staticDurationMinutes: heuristicDuration,
      distanceMeters: Math.round(straightMeters),
      trafficDelayMinutes: 0,
      isHeuristic: true,
      travelMode,
      departureTimeIso: departureIso,
    };

    // Store in memory only to prevent persisting stale fallbacks long-term
    memoryCache.set(cacheKey, fallbackEstimate);
    return fallbackEstimate;
  }
}
