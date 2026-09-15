import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

import React, { useEffect } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
