export type LocationType = "campus" | "gym";

export interface PresetLocation {
  id: string;
  name: string;
  type: LocationType;
  latitude: number;
  longitude: number;
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: "aut-city",
    name: "AUT City Campus",
    type: "campus",
    latitude: -36.8534,
    longitude: 174.7659,
  },
  {
    id: "aut-north",
    name: "AUT North Campus",
    type: "campus",
    latitude: -36.7886,
    longitude: 174.7425,
  },
  {
    id: "aut-south",
    name: "AUT South Campus",
    type: "campus",
    latitude: -36.9918,
    longitude: 174.8795,
  },
  {
    id: "les-mills-city",
    name: "Les Mills Auckland City",
    type: "gym",
    latitude: -36.8447,
    longitude: 174.76,
  },
];
