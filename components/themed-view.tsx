import { View, type ViewProps } from 'react-native';

import { Colors, Glassmorphism } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'surface' | 'surfaceContainer' | 'surfaceBright' | 'glass';
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = 'surface',
  ...otherProps
}: ThemedViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const themeColors = Colors[scheme];

  const defaultBackground =
    variant === 'surfaceBright'
      ? themeColors.surfaceBright
      : variant === 'surfaceContainer'
      ? themeColors.surfaceContainer
      : variant === 'glass'
      ? themeColors.glassBackground
      : themeColors.background;

  const backgroundColor = useThemeColor(
    { light: lightColor ?? defaultBackground, dark: darkColor ?? defaultBackground },
    'background'
  );

  const glassStyle =
    variant === 'glass'
      ? {
          backgroundColor: themeColors.glassBackground,
          borderColor: themeColors.glassBorder,
          borderWidth: 1,
          ...Glassmorphism,
        }
      : undefined;

  return <View style={[{ backgroundColor }, glassStyle, style]} {...otherProps} />;
}
