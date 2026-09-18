import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemePreference } from '@/context/ThemePreferenceContext';

export function useColorScheme() {
  const { preference } = useThemePreference();
  const systemScheme = useRNColorScheme();

  if (preference === 'system') {
    return systemScheme;
  }
  return preference;
}
