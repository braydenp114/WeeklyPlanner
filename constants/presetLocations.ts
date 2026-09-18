export interface PresetLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  icon?: string; // MaterialIcons name
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: 'aut-wg',
    name: 'AUT WG Block',
    address: 'Sir Paul Reeves Building, Mayoral Drive, Auckland CBD',
    latitude: -36.8530,
    longitude: 174.7663,
    icon: 'school',
  },
  {
    id: 'aut-ws',
    name: 'AUT WS Block',
    address: 'St Paul Street, Auckland CBD',
    latitude: -36.8533,
    longitude: 174.7667,
    icon: 'school',
  },
  {
    id: 'aut-wz',
    name: 'AUT WZ Block',
    address: 'St Paul Street, Auckland CBD',
    latitude: -36.8540,
    longitude: 174.7669,
    icon: 'school',
  },
  {
    id: 'aut-wf',
    name: 'AUT WF Block',
    address: 'Mayoral Drive, Auckland CBD',
    latitude: -36.8536,
    longitude: 174.7658,
    icon: 'school',
  },
  {
    id: 'gym-cityfitness-cbd',
    name: 'CityFitness Queen St',
    address: 'Queen Street, Auckland CBD',
    latitude: -36.8510,
    longitude: 174.7645,
    icon: 'fitness-center',
  },
  {
    id: 'gym-lesmills-auckland',
    name: 'Les Mills Auckland City',
    address: '186 Victoria Street West, Auckland CBD',
    latitude: -36.8488,
    longitude: 174.7576,
    icon: 'fitness-center',
  },
  {
    id: 'retail-jbhifi-queenst',
    name: 'JB Hi-Fi Queen St',
    address: 'Queen Street, Auckland CBD',
    latitude: -36.8502,
    longitude: 174.7648,
    icon: 'store',
  }
];
