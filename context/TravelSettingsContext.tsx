import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TravelMode } from '../services/travelTimeService';

const TRAVEL_MODE_KEY = 'travel_setting_mode';
const BUFFER_MINUTES_KEY = 'travel_setting_buffer';

export interface TravelSettingsContextType {
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  comfortBufferMinutes: number;
  setComfortBufferMinutes: (minutes: number) => void;
}

const TravelSettingsContext = createContext<TravelSettingsContextType>({
  travelMode: 'DRIVE',
  setTravelMode: () => {},
  comfortBufferMinutes: 10,
  setComfortBufferMinutes: () => {},
});

/** Persists and provides global travel preferences (default mode and comfort buffer minutes). */
export function TravelSettingsProvider({ children }: { children: ReactNode }) {
  const [travelMode, setTravelModeState] = useState<TravelMode>('DRIVE');
  const [comfortBufferMinutes, setComfortBufferState] = useState<number>(10);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(TRAVEL_MODE_KEY),
      AsyncStorage.getItem(BUFFER_MINUTES_KEY),
    ])
      .then(([storedMode, storedBuffer]) => {
        if (storedMode === 'DRIVE' || storedMode === 'TRANSIT' || storedMode === 'WALK') {
          setTravelModeState(storedMode);
        }
        if (storedBuffer) {
          const parsed = parseInt(storedBuffer, 10);
          if (!isNaN(parsed) && [5, 10, 15, 20].includes(parsed)) {
            setComfortBufferState(parsed);
          }
        }
      })
      .catch(() => {});
  }, []);

  const setTravelMode = (mode: TravelMode) => {
    setTravelModeState(mode);
    AsyncStorage.setItem(TRAVEL_MODE_KEY, mode).catch(() => {});
  };

  const setComfortBufferMinutes = (minutes: number) => {
    setComfortBufferState(minutes);
    AsyncStorage.setItem(BUFFER_MINUTES_KEY, minutes.toString()).catch(() => {});
  };

  return (
    <TravelSettingsContext.Provider
      value={{
        travelMode,
        setTravelMode,
        comfortBufferMinutes,
        setComfortBufferMinutes,
      }}
    >
      {children}
    </TravelSettingsContext.Provider>
  );
}

/** Hook to access global travel mode and comfort buffer settings. */
export function useTravelSettings() {
  return useContext(TravelSettingsContext);
}
