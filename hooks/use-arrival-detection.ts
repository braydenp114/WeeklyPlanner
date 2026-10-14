import { useEffect } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { requestNotificationPermission } from "@/config/notifications";
import { useAuth } from "@/context/AuthContext";
import type { PresetLocation } from "@/constants/presetLocations";
import { logArrival } from "@/services/locationLogService";
import { getLocationSharing } from "@/services/settingsService";
import { detectArrival, findPresetAt } from "@/utils/geo";
import { Timestamp } from "firebase/firestore";
import { getUpcomingLocationTasks, updateTask } from "@/services/tasksService";
import { shouldAutoMarkByType } from "@/utils/autoMark";
import { cancelReminder } from "@/hooks/use-task-reminders";
import { endOfBlockId } from "@/utils/endOfBlock";

const CHECK_INTERVAL_MS = 30000;

type Coords = { latitude: number; longitude: number };

let simulated: Coords | null = null;
let checkNow: (() => void) | null = null;

/** Demo helper: pretend to be at these coordinates (null goes back to the real GPS). */
export function setSimulatedLocation(coords: Coords | null) {
  simulated = coords;
  checkNow?.();
}

async function notifyArrival(preset: PresetLocation) {
  if (Platform.OS === "web") return;
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You've arrived at ${preset.name}`,
      body: "Tap to open your planner.",
    },
    trigger: null,
  });
}

async function autoMarkTasks(preset: PresetLocation) {
  const now = Date.now();
  const tasks = await getUpcomingLocationTasks();
  for (const task of tasks) {
    if (!task.id || !shouldAutoMarkByType(task, preset, now)) continue;
    await updateTask(task.id, {
      completed: true,
      completedBy: "arrival",
      completedAt: Timestamp.fromMillis(now),
    });
    if (Platform.OS !== "web") await cancelReminder(endOfBlockId(task.id));
  }
}

async function getCoords(): Promise<Coords | null> {
  if (simulated) return simulated;
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const position = await Location.getCurrentPositionAsync({});
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export function useArrivalDetection() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    let previous: PresetLocation | null = null;
    let running = false;
    let cancelled = false;

    const check = async () => {
      if (running) return;
      running = true;
      try {
        if (!(await getLocationSharing())) {
          previous = null;
          return;
        }
        const coords = await getCoords();
        if (cancelled || !coords) return;
        const current = findPresetAt(coords.latitude, coords.longitude);
        const arrival = detectArrival(previous, current);
        previous = current;
        if (arrival) {
          await logArrival(arrival);
          await notifyArrival(arrival);
          await autoMarkTasks(arrival);
        }
      } catch (e) {
        console.error("[useArrivalDetection] check failed:", e);
      } finally {
        running = false;
      }
    };

    checkNow = check;
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (checkNow === check) checkNow = null;
    };
  }, [user, loading]);
}
