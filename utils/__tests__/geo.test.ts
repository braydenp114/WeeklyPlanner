import { describe, expect, test } from "@jest/globals";
import { PRESET_LOCATIONS } from "../../constants/presetLocations";
import {
  ARRIVAL_RADIUS_METRES,
  detectArrival,
  distanceInMetres,
  findPresetAt,
} from "../geo";

const autCity = PRESET_LOCATIONS.find((p) => p.id === "aut-city")!;

describe("distanceInMetres", () => {
  test("returns 0 for the same point", () => {
    expect(
      distanceInMetres(
        autCity.latitude,
        autCity.longitude,
        autCity.latitude,
        autCity.longitude,
      ),
    ).toBe(0);
  });

  test("0.001 degrees of latitude is about 111 metres", () => {
    expect(distanceInMetres(0, 0, 0.001, 0)).toBeCloseTo(111.2, 0);
  });

  test("is the same in both directions", () => {
    const a = distanceInMetres(-36.8534, 174.7659, -36.7886, 174.7425);
    const b = distanceInMetres(-36.7886, 174.7425, -36.8534, 174.7659);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("findPresetAt", () => {
  test("finds a preset when standing exactly on it", () => {
    expect(findPresetAt(autCity.latitude, autCity.longitude)?.id).toBe(
      "aut-city",
    );
  });

  test("finds a preset when about 50 metres away", () => {
    expect(
      findPresetAt(autCity.latitude + 0.00045, autCity.longitude)?.id,
    ).toBe("aut-city");
  });

  test("returns null when far from every preset", () => {
    expect(findPresetAt(-37.787, 175.2793)).toBeNull();
  });

  test("returns null when outside the default radius", () => {
    expect(ARRIVAL_RADIUS_METRES).toBe(150);
    expect(
      findPresetAt(autCity.latitude + 0.0027, autCity.longitude),
    ).toBeNull();
  });

  test("a bigger radius catches the same point", () => {
    expect(
      findPresetAt(autCity.latitude + 0.0027, autCity.longitude, 500)?.id,
    ).toBe("aut-city");
  });
});

describe('detectArrival', () => {
  const autNorth = PRESET_LOCATIONS.find((p) => p.id === 'aut-north')!;

  test('arriving from nowhere counts as an arrival', () => {
    expect(detectArrival(null, autCity)?.id).toBe('aut-city');
  });

  test('staying at the same place is not a new arrival', () => {
    expect(detectArrival(autCity, autCity)).toBeNull();
  });

  test('leaving a place is not an arrival', () => {
    expect(detectArrival(autCity, null)).toBeNull();
  });

  test('going straight to a different place is an arrival', () => {
    expect(detectArrival(autCity, autNorth)?.id).toBe('aut-north');
  });

  test('being nowhere before and now is not an arrival', () => {
    expect(detectArrival(null, null)).toBeNull();
  });
});