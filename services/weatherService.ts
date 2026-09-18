// Open-Meteo (https://open-meteo.com) — free, no API key required.

export interface WeatherCondition {
  label: string;
  /** MaterialIcons glyph name. */
  icon: string;
}

export interface HourlyWeather {
  kind: 'hourly';
  temperature: number;
  condition: WeatherCondition;
}

export interface DailyWeather {
  kind: 'daily';
  temperatureMax: number;
  temperatureMin: number;
  condition: WeatherCondition;
}

export type WeatherResult = HourlyWeather | DailyWeather;

export interface WeatherForTaskParams {
  latitude: number;
  longitude: number;
  /** The task's start date/time (for all-day tasks, just the date matters). */
  date: Date;
  allDay: boolean;
}

// Open-Meteo's free forecast endpoint only covers this many days ahead.
const MAX_FORECAST_DAYS = 16;

/** WMO weather codes, as returned by Open-Meteo. */
function describeWeatherCode(code: number): WeatherCondition {
  if (code === 0) return { label: 'Clear sky', icon: 'wb-sunny' };
  if (code === 1) return { label: 'Mostly clear', icon: 'wb-sunny' };
  if (code === 2) return { label: 'Partly cloudy', icon: 'wb-cloudy' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'foggy' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'grain' };
  if (code === 61 || code === 63 || code === 80 || code === 81) return { label: 'Rain', icon: 'water-drop' };
  if (code === 65 || code === 82) return { label: 'Heavy rain', icon: 'umbrella' };
  if (code === 66 || code === 67) return { label: 'Freezing rain', icon: 'ac-unit' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', icon: 'ac-unit' };
  if (code === 95 || code === 96 || code === 99) return { label: 'Thunderstorm', icon: 'thunderstorm' };
  return { label: 'Unknown', icon: 'cloud-queue' };
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole-day difference between `date` and today, ignoring time of day. */
function daysUntil(date: Date): number {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
}

/**
 * Fetches the forecast for a task's place and time. Returns null (rather than
 * throwing) whenever there's nothing meaningful to show: no forecast available
 * yet for a date this far out, the date has already passed, or the request
 * fails — callers are expected to simply omit the weather UI in that case.
 */
export async function getWeatherForTask(params: WeatherForTaskParams): Promise<WeatherResult | null> {
  const { latitude, longitude, date, allDay } = params;
  const daysOut = daysUntil(date);
  if (daysOut < 0 || daysOut > MAX_FORECAST_DAYS) return null;

  const dateKey = toDateKey(date);
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: 'auto',
    start_date: dateKey,
    end_date: dateKey,
  });
  query.set(allDay ? 'daily' : 'hourly', allDay ? 'weathercode,temperature_2m_max,temperature_2m_min' : 'temperature_2m,weathercode');

  let response: Response;
  try {
    response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const data = await response.json();

  if (allDay) {
    const code = data?.daily?.weathercode?.[0];
    const tMax = data?.daily?.temperature_2m_max?.[0];
    const tMin = data?.daily?.temperature_2m_min?.[0];
    if (code === undefined || tMax === undefined || tMin === undefined) return null;
    return {
      kind: 'daily',
      temperatureMax: Math.round(tMax),
      temperatureMin: Math.round(tMin),
      condition: describeWeatherCode(code),
    };
  }

  const times: string[] = data?.hourly?.time || [];
  const temps: number[] = data?.hourly?.temperature_2m || [];
  const codes: number[] = data?.hourly?.weathercode || [];
  if (times.length === 0) return null;

  const targetHour = date.getHours();
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getHours() - targetHour);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  const temperature = temps[bestIdx];
  const code = codes[bestIdx];
  if (temperature === undefined || code === undefined) return null;

  return {
    kind: 'hourly',
    temperature: Math.round(temperature),
    condition: describeWeatherCode(code),
  };
}
