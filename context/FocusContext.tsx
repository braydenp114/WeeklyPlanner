import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { addFocusMinutes } from '@/services/tasksService';
import { useNav } from '@/context/NavContext';
import { FOCUS_TARGET_MINUTES, focusedMinutes } from '@/utils/focus';

export interface FocusSession {
  taskId: string;
  title: string;
  colorHex: string;
  /** Epoch ms when the timer started. */
  startedAt: number;
  targetMinutes: number;
}

interface FocusContextType {
  session: FocusSession | null;
  start: (task: { id: string; title: string; colorHex: string }, targetMinutes?: number) => Promise<void>;
  /** Stops the timer; when save is true the minutes are added to the task. Returns minutes saved. */
  stop: (save: boolean) => Promise<number>;
}

const STORAGE_KEY = 'focus-session';
const NOTIFICATION_ID = 'focus-timer';

const FocusContext = createContext<FocusContextType>({
  session: null,
  start: async () => {},
  stop: async () => 0,
});

/**
 * Focus timer (Pomodoro style). The running session is saved on the device, so it
 * survives switching screens or reloading. When stopped, the minutes are added to
 * the task's actualMinutes, which the weekly review shows as "Focused" time.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const { refreshTasks } = useNav();
  const [session, setSession] = useState<FocusSession | null>(null);

  // Restore a session that was running before a reload
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSession(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const start = useCallback(
    async (task: { id: string; title: string; colorHex: string }, targetMinutes = FOCUS_TARGET_MINUTES) => {
      const next: FocusSession = {
        taskId: task.id,
        title: task.title,
        colorHex: task.colorHex,
        startedAt: Date.now(),
        targetMinutes,
      };
      setSession(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});

      // On the phone, ping when the Pomodoro is up (even if the app is in the background)
      if (Platform.OS !== 'web') {
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: NOTIFICATION_ID,
            content: { title: "Time's up", body: `${targetMinutes} minutes of focus on "${task.title}"` },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(next.startedAt + targetMinutes * 60000),
            },
          });
        } catch {
          // Notifications are optional; the timer still works without them
        }
      }
    },
    [],
  );

  const stop = useCallback(
    async (save: boolean) => {
      if (!session) return 0;
      const minutes = focusedMinutes(session.startedAt, Date.now());
      setSession(null);
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      if (Platform.OS !== 'web') {
        Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});
      }
      if (save && minutes > 0) {
        await addFocusMinutes(session.taskId, minutes);
        refreshTasks();
        return minutes;
      }
      return 0;
    },
    [session, refreshTasks],
  );

  return <FocusContext.Provider value={{ session, start, stop }}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  return useContext(FocusContext);
}
