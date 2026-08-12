import { Platform } from 'react-native';

/**
 * Orbital Soft-Tech Design System
 * Defined across light mode.md and dark mode.md
 */

export const Colors = {
  light: {
    primary: '#4648d4', // Core Indigo primary
    primaryAction: '#6366f1',
    onPrimary: '#ffffff',
    primaryContainer: '#6063ee',
    onPrimaryContainer: '#fffbff',

    secondary: '#b4136d',
    secondaryContainer: '#fd56a7',
    onSecondaryContainer: '#600037',

    tertiary: '#006c49',
    tertiaryContainer: '#00885d',

    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',

    surface: '#f8f9ff',
    surfaceDim: '#cbdbf5',
    surfaceBright: '#ffffff',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#eff4ff',
    surfaceContainer: '#e5eeff',
    surfaceContainerHigh: '#dce9ff',
    surfaceContainerHighest: '#d3e4fe',

    background: '#f8f9ff',
    onBackground: '#0b1c30',
    onSurface: '#0b1c30',
    onSurfaceVariant: '#464554',

    text: '#0b1c30',
    textSecondary: '#464554',
    textMuted: '#767586',

    outline: '#767586',
    outlineVariant: '#c7c4d7',
    border: 'rgba(199, 196, 215, 0.4)',

    tint: '#6366f1',
    icon: '#464554',
    tabIconDefault: '#767586',
    tabIconSelected: '#6366f1',

    glassBackground: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(199, 196, 215, 0.4)',
  },

  dark: {
    primary: '#c0c1ff',
    primaryAction: '#6366f1',
    onPrimary: '#1000a9',
    primaryContainer: '#8083ff',
    onPrimaryContainer: '#0d0096',

    secondary: '#b9c8de',
    secondaryContainer: '#39485a',
    onSecondaryContainer: '#a7b6cc',

    tertiary: '#7bd0ff',
    tertiaryContainer: '#009bd1',

    error: '#ffb4ab',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',

    surface: '#0b1326',
    surfaceDim: '#0b1326',
    surfaceBright: '#31394d',
    surfaceContainerLowest: '#060e20',
    surfaceContainerLow: '#131b2e',
    surfaceContainer: '#171f33',
    surfaceContainerHigh: '#222a3d',
    surfaceContainerHighest: '#2d3449',

    background: '#0b1326',
    onBackground: '#dae2fd',
    onSurface: '#dae2fd',
    onSurfaceVariant: '#c7c4d7',

    text: '#dae2fd',
    textSecondary: '#c7c4d7',
    textMuted: '#908fa0',

    outline: '#908fa0',
    outlineVariant: '#464554',
    border: 'rgba(255, 255, 255, 0.1)',

    tint: '#6366f1',
    icon: '#c7c4d7',
    tabIconDefault: '#908fa0',
    tabIconSelected: '#6366f1',

    glassBackground: 'rgba(30, 41, 59, 0.6)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  },
};

export const TaskCardColors = {
  indigo: { bg: '#6366F1', text: '#FFFFFF', name: 'Indigo' },
  amber: { bg: '#D97706', text: '#FFFFFF', name: 'Amber' },
  teal: { bg: '#0D9488', text: '#FFFFFF', name: 'Teal' },
  rose: { bg: '#E11D48', text: '#FFFFFF', name: 'Rose' },
  slate: { bg: '#64748B', text: '#FFFFFF', name: 'Slate' },
  pink: { bg: '#FD56A7', text: '#FFFFFF', name: 'Pink' },
};

export const Fonts = Platform.select({
  ios: {
    headline: 'Hanken Grotesk',
    body: 'Inter',
    mono: 'JetBrains Mono',
    sans: 'Hanken Grotesk, Inter, system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
  },
  default: {
    headline: 'Hanken Grotesk',
    body: 'Inter',
    mono: 'JetBrains Mono',
    sans: 'Hanken Grotesk, Inter, sans-serif',
    serif: 'serif',
    rounded: 'normal',
  },
  web: {
    headline: "'Hanken Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
    sans: "'Hanken Grotesk', 'Inter', system-ui, -apple-system, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
  },
});

export const Typography = {
  displayLg: {
    fontFamily: Fonts.headline,
    fontSize: 48,
    fontWeight: '800' as const,
    lineHeight: 56,
    letterSpacing: -1.0,
  },
  headlineLg: {
    fontFamily: Fonts.headline,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  headlineMobile: {
    fontFamily: Fonts.headline,
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  bodyMd: {
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelMd: {
    fontFamily: Fonts.headline,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSm: {
    fontFamily: Fonts.headline,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
};

export const RoundedGeometry = {
  sm: 4,
  default: 8, // Base rounded rectangle radius
  md: 12,
  lg: 16,
  xl: 24, // Container radius
  full: 9999, // Pill shape
};

export const Glassmorphism = {
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};
