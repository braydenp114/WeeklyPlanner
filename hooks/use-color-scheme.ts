import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemePreference } from '@/context/ThemePreferenceContext';

/**
 * Returns the active color scheme ('light' or 'dark'), resolving the user's manual preference
 * against the OS system scheme when set to 'system'.
 */
export function useColorScheme() {
  const { preference } = useThemePreference();
  const systemScheme = useRNColorScheme();

  if (preference === 'system') {
    return systemScheme;
  }
  return preference;
}
