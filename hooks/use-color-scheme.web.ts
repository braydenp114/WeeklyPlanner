import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemePreference } from '@/context/ThemePreferenceContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasHydrated(true);
  }, []);

  const { preference } = useThemePreference();
  const systemScheme = useRNColorScheme();

  if (!hasHydrated) {
    return 'light';
  }

  if (preference === 'system') {
    return systemScheme;
  }
  return preference;
}
