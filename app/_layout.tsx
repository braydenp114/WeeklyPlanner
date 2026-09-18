import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';


import { AuthProvider } from '@/context/AuthContext';
import { ThemePreferenceProvider } from '@/context/ThemePreferenceContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestNotificationPermission } from '@/config/notifications';

import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncAllGeofences } from '@/services/geofenceService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <AppContent />
    </ThemePreferenceProvider>
  );
}

function AppContent() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleError = (event: ErrorEvent) => {
        console.error('[Global Error Listener]', event.error?.code, event.error?.message, event.error?.stack, event.error);
      };
      const handleRejection = (event: PromiseRejectionEvent) => {
        console.error('[Global Rejection Listener]', event.reason?.code, event.reason?.message, event.reason?.stack, event.reason);
      };
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleRejection);
      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleRejection);
      };
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncAllGeofences().catch(console.error);
      }
    });

    // Also sync on initial mount
    syncAllGeofences().catch(console.error);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
