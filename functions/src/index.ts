import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const routesApiKey = defineSecret('ROUTES_API_KEY');

export interface LatLng {
  latitude: number;
  longitude: number;
}

export type TravelMode = 'DRIVE' | 'TRANSIT' | 'WALK';

export interface TravelTimeRequestData {
  origin: LatLng;
  destination: LatLng;
  travelMode?: TravelMode;
  departureTime?: string; // ISO 8601 string
}

export interface TravelTimeResponseData {
  durationMinutes: number;
  staticDurationMinutes: number;
  distanceMeters: number;
  trafficDelayMinutes: number;
  isTransitUnavailable?: boolean;
}

/**
 * Calculates straight-line distance in meters using Haversine formula
 */
export function calculateHaversineMeters(origin: LatLng, destination: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const dLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lat2 = (destination.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parses Google Routes protobuf duration string (e.g. "1240s" or "300.5s") into seconds
 */
export function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(parseFloat(match[1])) : 0;
}

/**
 * Helper to call Google Routes API computeRoutes
 */
async function callRoutesApi(
  origin: LatLng,
  destination: LatLng,
  travelMode: TravelMode,
  departureIso: string,
  apiKey: string,
  departureMs: number
): Promise<{ durationMinutes: number; staticDurationMinutes: number; distanceMeters: number; trafficDelayMinutes: number } | null> {
  const body: Record<string, any> = {
    origin: {
      location: {
        latLng: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      },
    },
    travelMode,
    departureTime: departureIso,
  };

  // Google Routes API strictly requires routingPreference ONLY for DRIVE mode.
  // Passing routingPreference for TRANSIT or WALK results in an HTTP 400 Bad Request.
  if (travelMode === 'DRIVE') {
    const isWithin3Hours = departureMs - Date.now() <= 3 * 60 * 60 * 1000;
    body.routingPreference = isWithin3Hours ? 'TRAFFIC_AWARE_OPTIMAL' : 'TRAFFIC_AWARE';
  }

  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Routes API Error] ${response.status}: ${errText}`);
    throw new HttpsError('internal', `Google Routes API request failed with status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const routes = data.routes;
  if (!routes || routes.length === 0) {
    return null;
  }

  const primaryRoute = routes[0];
  const durationSec = parseDurationSeconds(primaryRoute.duration);
  const staticDurationSec = parseDurationSeconds(primaryRoute.staticDuration);
  const distanceMeters = primaryRoute.distanceMeters || 0;

  const durationMinutes = Math.max(1, Math.round(durationSec / 60));
  const staticDurationMinutes = staticDurationSec > 0
    ? Math.max(1, Math.round(staticDurationSec / 60))
    : durationMinutes;
  const trafficDelayMinutes = Math.max(0, durationMinutes - staticDurationMinutes);

  return {
    durationMinutes,
    staticDurationMinutes,
    distanceMeters,
    trafficDelayMinutes,
  };
}

/**
 * Callable Firebase Function to calculate travel time between two coordinates.
 */
export const getTravelTime = onCall<TravelTimeRequestData, Promise<TravelTimeResponseData>>(
  {
    region: 'asia-southeast1',
    secrets: [routesApiKey],
    maxInstances: 10,
    timeoutSeconds: 30,
    enforceAppCheck: false,
  },
  async (request) => {
    // 1. Authentication requirement
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be signed in to calculate travel time.');
    }

    const uid = request.auth.uid;
    const { origin, destination, travelMode = 'DRIVE', departureTime } = request.data || {};

    // 2. Validate input coordinates
    if (
      !origin ||
      typeof origin.latitude !== 'number' ||
      typeof origin.longitude !== 'number' ||
      !destination ||
      typeof destination.latitude !== 'number' ||
      typeof destination.longitude !== 'number'
    ) {
      throw new HttpsError('invalid-argument', 'Valid origin and destination coordinates are required.');
    }

    const validModes: TravelMode[] = ['DRIVE', 'TRANSIT', 'WALK'];
    if (!validModes.includes(travelMode)) {
      throw new HttpsError('invalid-argument', `Invalid travel mode: ${travelMode}. Supported: DRIVE, TRANSIT, WALK.`);
    }

    // 3. Fixed-window rate limiter (30 requests per 60s per user UID) to protect against per-user abuse.
    // Long-term free tier budget protection is enforced at the project level via Cloud Console quotas.
    const db = admin.firestore();
    const rateLimitRef = db.doc(`users/${uid}/rateLimits/travelTime`);
    const nowMs = Date.now();
    const WINDOW_MS = 60 * 1000;
    const MAX_REQUESTS = 30;

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(rateLimitRef);
      if (!snap.exists) {
        transaction.set(rateLimitRef, {
          windowStartMs: nowMs,
          requestCount: 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const rateData = snap.data() || {};
      const windowStartMs = typeof rateData.windowStartMs === 'number' ? rateData.windowStartMs : 0;
      const requestCount = typeof rateData.requestCount === 'number' ? rateData.requestCount : 0;

      if (nowMs - windowStartMs > WINDOW_MS) {
        // Window expired, start a fresh window
        transaction.set(rateLimitRef, {
          windowStartMs: nowMs,
          requestCount: 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        if (requestCount >= MAX_REQUESTS) {
          throw new HttpsError(
            'resource-exhausted',
            'Rate limit exceeded (maximum 30 requests per minute). Please wait a moment.'
          );
        }
        transaction.update(rateLimitRef, {
          requestCount: requestCount + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    // 4. Zero-distance check (< 50 meters)
    const straightLineMeters = calculateHaversineMeters(origin, destination);
    if (straightLineMeters < 50) {
      return {
        durationMinutes: 0,
        staticDurationMinutes: 0,
        distanceMeters: Math.round(straightLineMeters),
        trafficDelayMinutes: 0,
      };
    }

    // 5. Use client-provided departure time, clamped to present moment if in the past
    let departureMs = nowMs;
    if (departureTime) {
      const parsed = new Date(departureTime).getTime();
      if (!isNaN(parsed)) {
        departureMs = parsed;
      }
    }
    // Clamp to present moment if target departure has already passed
    if (departureMs < nowMs) {
      departureMs = nowMs;
    }
    const departureIso = new Date(departureMs).toISOString();

    const apiKey = routesApiKey.value();
    if (!apiKey) {
      throw new HttpsError('internal', 'Routes API key secret is not configured.');
    }

    // 6. Invoke Google Routes API
    let routeResult = await callRoutesApi(origin, destination, travelMode, departureIso, apiKey, departureMs);

    // 7. Zero-route transit fallback
    if (!routeResult) {
      if (travelMode === 'TRANSIT') {
        // Fallback to DRIVE mode
        const driveFallback = await callRoutesApi(origin, destination, 'DRIVE', departureIso, apiKey, departureMs);
        if (driveFallback) {
          return {
            ...driveFallback,
            isTransitUnavailable: true,
          };
        }
      }

      throw new HttpsError('not-found', 'No viable route found between these locations.');
    }

    return routeResult;
  }
);
