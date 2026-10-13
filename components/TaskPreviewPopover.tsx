import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
  Linking,
  AppState,
} from "react-native";
import { Timestamp } from "firebase/firestore";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors, Fonts, RoundedGeometry, Typography } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/AuthContext";
import { TaskItem } from "./WeeklyGrid";
import { AnchorRect } from "./ui/TimeDropdown";
import {
  updateTask,
  logTaskActual,
  getSeriesOccurrences,
  ChecklistItem,
  getTasksForRange,
  Task,
} from "@/services/tasksService";
import { useTravelSettings } from "@/context/TravelSettingsContext";
import { getTravelTimeEstimate, TravelEstimate } from "@/services/travelTimeService";
import { calculateFeasibility, FeasibilityResult } from "@/utils/travelFeasibility";
import {
  calculateStreak,
  isStreakEligible,
  StreakResult,
} from "@/utils/streaks";
import { getWeatherForTask, WeatherResult } from "@/services/weatherService";
import { Flag, Timer } from "lucide-react-native";
import { useFocus } from "@/context/FocusContext";
import { FOCUS_TARGET_MINUTES, formatMinutes } from "@/utils/focus";
import { PRIORITY_META } from "@/utils/priority";
import { isAutoCompleteAvailable } from "@/services/geofenceService";
import { getCompletionWindow } from "@/utils/geofenceWindow";

interface TaskPreviewPopoverProps {
  visible: boolean;
  onClose: () => void;
  task: TaskItem | null;
  anchor: AnchorRect | null;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  /** Called after the completion state (task or a checklist item) is persisted, so the grid can refetch. */
  onChanged?: () => void;
}

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const dateFmt = new Intl.DateTimeFormat(locale, {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat(locale, {
  hour: "numeric",
  minute: "2-digit",
});

function formatTaskTime(task: TaskItem) {
  if (task.isAllDay) return "All day";
  const start = task.originalTaskData.startDate.toDate();
  const end = task.originalTaskData.endDate.toDate();
  return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

/**
 * Contextual popover showing full task details, weather, travel estimates, checklists, and focus controls.
 */
export function TaskPreviewPopover({
  visible,
  onClose,
  task,
  anchor,
  onEdit,
  onDelete,
  onChanged,
}: TaskPreviewPopoverProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = Colors[scheme];
  const { user } = useAuth();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [showLogActual, setShowLogActual] = useState(false);
  const [substitutedText, setSubstitutedText] = useState("");
  const [actualNoteText, setActualNoteText] = useState("");
  const [savingActual, setSavingActual] = useState(false);
  const [streak, setStreak] = useState<StreakResult | null>(null);
  const [autoCompleteOff, setAutoCompleteOff] = useState(false);
  const { session: focusSession, start: startFocus } = useFocus();
  const { travelMode, comfortBufferMinutes } = useTravelSettings();

  const [precedingEstimate, setPrecedingEstimate] = useState<{
    task: Task;
    estimate: TravelEstimate;
    feasibility: FeasibilityResult;
    scheduledGapMinutes: number;
    recommendedDeparture: Date;
  } | null>(null);

  const [subsequentEstimate, setSubsequentEstimate] = useState<{
    task: Task;
    estimate: TravelEstimate;
    feasibility: FeasibilityResult;
    scheduledGapMinutes: number;
    recommendedDeparture: Date;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tData = task?.originalTaskData;
    if (
      !visible ||
      !tData ||
      typeof tData.latitude !== "number" ||
      typeof tData.longitude !== "number" ||
      tData.allDay
    ) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setPrecedingEstimate(null);
          setSubsequentEstimate(null);
        }
      });
      return;
    }


    const taskDate = tData.startDate.toDate();
    const dayStart = new Date(taskDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(taskDate);
    dayEnd.setHours(23, 59, 59, 999);

    getTasksForRange(dayStart, dayEnd)
      .then(async (dayTasks) => {
        if (cancelled) return;
        const locationTasks = dayTasks.filter(
          (t) =>
            !t.allDay &&
            typeof t.latitude === "number" &&
            typeof t.longitude === "number"
        );
        locationTasks.sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis());

        const currentIndex = locationTasks.findIndex((t) => t.id === tData.id);
        if (currentIndex === -1) return;

        // Preceding task
        if (currentIndex > 0) {
          const prev = locationTasks[currentIndex - 1];
          const prevEnd = prev.endDate.toMillis();
          const curStart = tData.startDate.toMillis();
          const gapMin = Math.round((curStart - prevEnd) / 60000);

          try {
            const est = await getTravelTimeEstimate({
              origin: { latitude: prev.latitude!, longitude: prev.longitude! },
              destination: { latitude: tData.latitude!, longitude: tData.longitude! },
              travelMode,
              departureTime: prev.endDate.toDate().toISOString(),
            });
            if (cancelled) return;

            const feas = calculateFeasibility(gapMin, est.durationMinutes, comfortBufferMinutes);
            const departureDate = new Date(prevEnd + 3 * 60 * 1000);

            setPrecedingEstimate({
              task: prev,
              estimate: est,
              feasibility: feas,
              scheduledGapMinutes: gapMin,
              recommendedDeparture: departureDate,
            });
          } catch (e) {
            console.warn("[TaskPreviewPopover] Failed getting preceding estimate:", e);
          }
        } else {
          setPrecedingEstimate(null);
        }

        // Subsequent task
        if (currentIndex < locationTasks.length - 1) {
          const next = locationTasks[currentIndex + 1];
          const curEnd = tData.endDate.toMillis();
          const nextStart = next.startDate.toMillis();
          const gapMin = Math.round((nextStart - curEnd) / 60000);

          try {
            const est = await getTravelTimeEstimate({
              origin: { latitude: tData.latitude!, longitude: tData.longitude! },
              destination: { latitude: next.latitude!, longitude: next.longitude! },
              travelMode,
              departureTime: tData.endDate.toDate().toISOString(),
            });
            if (cancelled) return;

            const feas = calculateFeasibility(gapMin, est.durationMinutes, comfortBufferMinutes);
            const departureDate = new Date(curEnd + 3 * 60 * 1000);

            setSubsequentEstimate({
              task: next,
              estimate: est,
              feasibility: feas,
              scheduledGapMinutes: gapMin,
              recommendedDeparture: departureDate,
            });
          } catch (e) {
            console.warn("[TaskPreviewPopover] Failed getting subsequent estimate:", e);
          }
        } else {
          setSubsequentEstimate(null);
        }
      })
      .catch((e) => console.warn("[TaskPreviewPopover] Failed getting day tasks:", e));

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    task?.originalTaskId,
    task?.originalTaskData,
    travelMode,
    comfortBufferMinutes,
  ]);

  // Show the "auto-complete is off" hint on upcoming location-tagged tasks when permission
  // is missing. This only reads the permission state and never prompts the user.
  useEffect(() => {
    const tData = task?.originalTaskData;
    const eligible =
      visible &&
      Platform.OS !== "web" &&
      !!tData &&
      tData.latitude != null &&
      tData.longitude != null &&
      !tData.completed &&
      getCompletionWindow(tData).end >= Date.now();
    if (!eligible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoCompleteOff(false);
      return;
    }

    let cancelled = false;
    const check = () =>
      isAutoCompleteAvailable().then((ok) => {
        if (!cancelled) setAutoCompleteOff(!ok);
      });
    check();
    // Re-check when the user comes back from the Settings app
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [visible, task]);

  // Fetches the series and recalculates the streak (null if the task is not streak-eligible)
  const fetchStreak = async (): Promise<StreakResult | null> => {
    const tData = task?.originalTaskData;
    if (!tData || !tData.seriesId || !isStreakEligible(tData)) return null;
    try {
      const occurrences = await getSeriesOccurrences(tData.seriesId);
      return calculateStreak(occurrences);
    } catch {
      return null;
    }
  };

  // Called after the user completes or logs an occurrence, so the counter updates straight away
  const loadStreak = async () => {
    setStreak(await fetchStreak());
  };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    fetchStreak().then((result) => {
      if (!cancelled) setStreak(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, task]);
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowFullDesc(false);
      setCompleted(!!task?.originalTaskData.completed);
      setChecklistItems(task?.originalTaskData.checklistItems || []);
      setWeather(null);

      const tData = task?.originalTaskData;
      const isPast = tData
        ? tData.endDate.toDate().getTime() < Date.now()
        : true;
      if (tData?.latitude != null && tData?.longitude != null && !isPast) {
        let cancelled = false;
        getWeatherForTask({
          latitude: tData.latitude,
          longitude: tData.longitude,
          date: tData.startDate.toDate(),
          allDay: tData.allDay,
        }).then((result) => {
          if (!cancelled) setWeather(result);
        });
        return () => {
          cancelled = true;
        };
      }
    }
  }, [visible, task]);

  if (!visible || !task) return null;

  const toggleCompleted = async () => {
    const next = !completed;
    setCompleted(next);
    try {
      // Manual completion works regardless of location permission
      await updateTask(task.originalTaskId, {
        completed: next,
        completedBy: next ? 'manual' : null,
        completedAt: next ? Timestamp.now() : null,
      });
      await loadStreak();
      onChanged?.();
    } catch {
      setCompleted(!next);
    }
  };

  const handleLogAsPlanned = async () => {
    setSavingActual(true);
    try {
      await logTaskActual(task.originalTaskId, { status: "as_planned" });
      setCompleted(true);
      setShowLogActual(false);
      await loadStreak();
      onChanged?.();
    } catch {
      // silently ignore for now
    } finally {
      setSavingActual(false);
    }
  };

  const handleLogDifferent = async () => {
    setSavingActual(true);
    try {
      await logTaskActual(task.originalTaskId, {
        status: "different",
        substitutedActivity: substitutedText,
        note: actualNoteText,
      });
      setCompleted(false);
      setShowLogActual(false);
      await loadStreak();
      onChanged?.();
    } catch {
      // silently ignore for now
    } finally {
      setSavingActual(false);
    }
  };

  const toggleChecklistItem = async (id: string) => {
    const next = checklistItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    );
    setChecklistItems(next);
    try {
      await updateTask(task.originalTaskId, { checklistItems: next });
      onChanged?.();
    } catch {
      setChecklistItems(checklistItems);
    }
  };

  const POPOVER_WIDTH = Math.min(360, windowWidth - 32);
  const POPOVER_HEIGHT_ESTIMATE = 240; // rough estimate

  let popoverPlacementStyle: any = null;
  if (anchor) {
    const spaceBelow = windowHeight - (anchor.y + anchor.height);
    const spaceAbove = anchor.y;

    let top: number;
    // Prefer below if there's enough space, otherwise above, or stick to bottom
    if (spaceBelow >= POPOVER_HEIGHT_ESTIMATE || spaceBelow >= spaceAbove) {
      top = anchor.y + anchor.height + 4;
    } else {
      top = Math.max(8, anchor.y - POPOVER_HEIGHT_ESTIMATE - 4);
    }

    // Prevent clipping top/bottom roughly
    if (top + POPOVER_HEIGHT_ESTIMATE > windowHeight - 8) {
      top = Math.max(8, windowHeight - POPOVER_HEIGHT_ESTIMATE - 8);
    }

    let left = anchor.x;
    if (left + POPOVER_WIDTH > windowWidth - 12) {
      left = anchor.x + anchor.width - POPOVER_WIDTH;
    }
    if (left + POPOVER_WIDTH > windowWidth - 12) {
      left = windowWidth - POPOVER_WIDTH - 12;
    }
    if (left < 12) {
      left = 12;
    }

    popoverPlacementStyle = {
      position: "absolute" as const,
      top,
      left,
      width: POPOVER_WIDTH,
    };
  }

  const tData = task.originalTaskData;
  const ownerName = user?.displayName || user?.email || "Signed-in User";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.popover,
            {
              backgroundColor: theme.surfaceContainerHighest,
              borderColor: theme.outlineVariant,
            },
            popoverPlacementStyle,
            !anchor && styles.centeredFallback,
          ]}
        >
          <ScrollView
            style={styles.popoverScroll}
            showsVerticalScrollIndicator={true}
          >
            {/* Action Row */}
            <View style={styles.actionRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => onEdit(task)}
                accessibilityLabel="Edit task"
                style={styles.iconBtn}
              >
                <MaterialIcons
                  name="edit"
                  size={20}
                  color={theme.onSurfaceVariant}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete(task)}
                accessibilityLabel="Delete task"
                style={styles.iconBtn}
              >
                <MaterialIcons
                  name="delete"
                  size={20}
                  color={theme.onSurfaceVariant}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Close">
                <MaterialIcons
                  name="close"
                  size={20}
                  color={theme.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            {/* Header Row: Checkbox + Color Dot + Title */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={toggleCompleted}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.checkboxBtn}
              >
                <MaterialIcons
                  name={completed ? "check-box" : "check-box-outline-blank"}
                  size={22}
                  color={
                    completed ? theme.primaryAction : theme.onSurfaceVariant
                  }
                />
              </TouchableOpacity>
              <View
                style={[styles.colorDot, { backgroundColor: task.colorHex }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.titleText, { color: theme.text, textDecorationLine: completed ? 'line-through' : 'none' }]}>
                  {task.title}
                </Text>
                {completed && tData.completedBy === 'geofence' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                    <MaterialIcons name="auto-awesome" size={14} color={theme.primaryAction} />
                    <Text style={{ fontSize: 12, color: theme.primaryAction }}>
                      Completed automatically on arrival
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Time/Date */}
            <View style={styles.row}>
              <View style={styles.iconPlaceholder} />
              <Text style={[styles.timeText, { color: theme.text }]}>
                {formatTaskTime(task)}
              </Text>
            </View>

            {/* Streak (recurring tasks only) */}
            {streak && (
              <View style={styles.row}>
                <MaterialIcons
                  name="local-fire-department"
                  size={18}
                  color={streak.current > 0 ? "#F97316" : theme.onSurfaceVariant}
                  style={styles.icon}
                />
                <Text style={[styles.detailText, { color: theme.text }]}>
                  {`Streak: ${streak.current} in a row`}
                  {streak.longest > streak.current
                    ? ` · best ${streak.longest}`
                    : ""}
                </Text>
              </View>
            )}

            {/* Priority */}
            {tData.priority && PRIORITY_META[tData.priority] && (
              <View style={styles.row}>
                <View style={styles.lucideIcon}>
                  <Flag
                    size={16}
                    color={PRIORITY_META[tData.priority].colorHex}
                    fill={PRIORITY_META[tData.priority].colorHex}
                  />
                </View>
                <Text style={[styles.detailText, { color: theme.text }]}>
                  {`${PRIORITY_META[tData.priority].label} ${PRIORITY_META[tData.priority].name}`}
                </Text>
              </View>
            )}

            {/* Focus timer */}
            <View style={[styles.row, { alignItems: "center" }]}>
              <View style={styles.lucideIcon}>
                <Timer size={16} color={theme.onSurfaceVariant} />
              </View>
              <Text style={[styles.detailText, { color: theme.text }]}>
                {tData.actualMinutes
                  ? `Focused ${formatMinutes(tData.actualMinutes)}`
                  : "No focus time yet"}
              </Text>
              {focusSession?.taskId === task.originalTaskId ? (
                <Text style={[styles.focusingText, { color: theme.primaryAction }]}>
                  Focusing…
                </Text>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Start focus timer"
                  style={[styles.focusBtn, { borderColor: theme.outlineVariant }]}
                  onPress={() => {
                    startFocus({
                      id: task.originalTaskId,
                      title: task.title,
                      colorHex: task.colorHex,
                    });
                    onClose();
                  }}
                >
                  <Text style={[styles.focusBtnText, { color: theme.primaryAction }]}>
                    {`Start focus · ${FOCUS_TARGET_MINUTES} min`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Location */}
            {tData.location && (
              <View style={styles.row}>
                <MaterialIcons
                  name="location-on"
                  size={18}
                  color={theme.onSurfaceVariant}
                  style={styles.icon}
                />
                <Text style={[styles.detailText, { color: theme.text }]}>
                  {tData.location}
                </Text>
              </View>
            )}

            {/* Travel & Route Feasibility Section */}
            {(precedingEstimate || subsequentEstimate) && (
              <View
                style={[
                  styles.travelSection,
                  {
                    backgroundColor: theme.surfaceContainer,
                    borderColor: theme.outlineVariant,
                  },
                ]}
              >
                {precedingEstimate && (
                  <View style={styles.travelItem}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons
                        name={
                          precedingEstimate.feasibility.status === "infeasible" ||
                          precedingEstimate.feasibility.status === "overlap"
                            ? "warning"
                            : precedingEstimate.estimate.travelMode === "TRANSIT"
                            ? "directions-transit"
                            : precedingEstimate.estimate.travelMode === "WALK"
                            ? "directions-walk"
                            : "directions-car"
                        }
                        size={16}
                        color={
                          precedingEstimate.feasibility.status === "infeasible" ||
                          precedingEstimate.feasibility.status === "overlap"
                            ? "#ef4444"
                            : precedingEstimate.feasibility.status === "tight"
                            ? "#d97706"
                            : theme.primaryAction
                        }
                      />
                      <Text style={[styles.travelTitle, { color: theme.text }]} numberOfLines={1}>
                        From {precedingEstimate.task.title}: {precedingEstimate.estimate.durationMinutes} min
                        {precedingEstimate.estimate.distanceMeters > 0
                          ? ` (${(precedingEstimate.estimate.distanceMeters / 1000).toFixed(1)} km)`
                          : ""}
                      </Text>
                    </View>

                    <Text style={[styles.travelDetail, { color: theme.textSecondary }]}>
                      Recommended departure: {timeFmt.format(precedingEstimate.recommendedDeparture)}
                    </Text>

                    {precedingEstimate.estimate.trafficDelayMinutes > 5 && (
                      <Text style={[styles.travelDetail, { color: "#ef4444" }]}>
                        Includes {precedingEstimate.estimate.trafficDelayMinutes} min traffic delay (baseline: {precedingEstimate.estimate.staticDurationMinutes} min)
                      </Text>
                    )}

                    {(precedingEstimate.feasibility.status === "infeasible" ||
                      precedingEstimate.feasibility.status === "overlap") && (
                      <View
                        style={[
                          styles.travelConflictBadge,
                          {
                            backgroundColor: scheme === "dark" ? "#3b1212" : "#fee2e2",
                            borderColor: "#ef4444",
                          },
                        ]}
                      >
                        <MaterialIcons name="warning" size={14} color="#ef4444" />
                        <Text style={[styles.travelConflictText, { color: "#ef4444" }]}>
                          {precedingEstimate.feasibility.status === "overlap"
                            ? "Overlapping schedule"
                            : `Tight/Late: Needs ${precedingEstimate.estimate.durationMinutes} min, only ${precedingEstimate.scheduledGapMinutes} min gap`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {subsequentEstimate && (
                  <View
                    style={[
                      styles.travelItem,
                      precedingEstimate && {
                        borderTopWidth: 1,
                        borderTopColor: theme.outlineVariant,
                        paddingTop: 8,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons
                        name={
                          subsequentEstimate.estimate.travelMode === "TRANSIT"
                            ? "directions-transit"
                            : subsequentEstimate.estimate.travelMode === "WALK"
                            ? "directions-walk"
                            : "directions-car"
                        }
                        size={16}
                        color={theme.primaryAction}
                      />
                      <Text style={[styles.travelTitle, { color: theme.text }]} numberOfLines={1}>
                        To {subsequentEstimate.task.title}: {subsequentEstimate.estimate.durationMinutes} min
                        {subsequentEstimate.estimate.distanceMeters > 0
                          ? ` (${(subsequentEstimate.estimate.distanceMeters / 1000).toFixed(1)} km)`
                          : ""}
                      </Text>
                    </View>
                    <Text style={[styles.travelDetail, { color: theme.textSecondary }]}>
                      Leave at {timeFmt.format(subsequentEstimate.recommendedDeparture)} (with 3m pack-up)
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Auto-complete hint (location permission missing) */}
            {autoCompleteOff && !completed && (
              <View style={[styles.hintRow, { backgroundColor: theme.surfaceContainer }]}>
                <MaterialIcons
                  name="location-off"
                  size={16}
                  color={theme.onSurfaceVariant}
                />
                <Text style={[styles.hintText, { color: theme.textSecondary }]}>
                  Auto-complete is off. Enable location in Settings.
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openSettings().catch(() => {})}
                  accessibilityRole="button"
                  accessibilityLabel="Open location settings"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.hintAction, { color: theme.primaryAction }]}>
                    Settings
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Weather */}
            {weather && (
              <View style={styles.row}>
                <MaterialIcons
                  name={weather.condition.icon as any}
                  size={18}
                  color={theme.onSurfaceVariant}
                  style={styles.icon}
                />
                <Text style={[styles.detailText, { color: theme.text }]}>
                  {weather.kind === "hourly"
                    ? `${weather.temperature}°C · ${weather.condition.label}`
                    : `${weather.temperatureMin}°–${weather.temperatureMax}°C · ${weather.condition.label}`}
                </Text>
              </View>
            )}

            {/* Description */}
            {tData.description && (
              <View style={styles.row}>
                <MaterialIcons
                  name="notes"
                  size={18}
                  color={theme.onSurfaceVariant}
                  style={styles.icon}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.detailText, { color: theme.text }]}
                    numberOfLines={showFullDesc ? undefined : 3}
                  >
                    {tData.description}
                  </Text>
                  {tData.description.length > 100 && !showFullDesc && (
                    <TouchableOpacity onPress={() => setShowFullDesc(true)}>
                      <Text
                        style={[
                          styles.showMoreText,
                          { color: theme.primaryAction },
                        ]}
                      >
                        Show more
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Checklist */}
            {tData.hasChecklist && checklistItems.length > 0 && (
              <View style={styles.row}>
                <MaterialIcons
                  name="checklist"
                  size={18}
                  color={theme.onSurfaceVariant}
                  style={styles.icon}
                />
                <View style={{ flex: 1, gap: 8 }}>
                  {checklistItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistItemRow}
                      onPress={() => toggleChecklistItem(item.id)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <MaterialIcons
                        name={
                          item.completed
                            ? "check-box"
                            : "check-box-outline-blank"
                        }
                        size={18}
                        color={
                          item.completed
                            ? theme.primaryAction
                            : theme.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[
                          styles.detailText,
                          { color: theme.text, flex: 1 },
                        ]}
                      >
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Notification */}
            {tData.notification && (
              <View style={styles.row}>
                <MaterialIcons
                  name="notifications"
                  size={18}
                  color={theme.onSurfaceVariant}
                  style={styles.icon}
                />
                <Text style={[styles.detailText, { color: theme.text }]}>
                  {tData.notification.type}
                </Text>
              </View>
            )}

            {/* Owner */}
            <View style={styles.row}>
              <MaterialIcons
                name="calendar-today"
                size={18}
                color={theme.onSurfaceVariant}
                style={styles.icon}
              />
              <Text style={[styles.detailText, { color: theme.text }]}>
                {ownerName}
              </Text>
            </View>

            {/* Log what actually happened */}
            <View style={[styles.row, { marginTop: 8 }]}>
              <MaterialIcons
                name="flip"
                size={18}
                color={theme.onSurfaceVariant}
                style={styles.icon}
              />
              <View style={{ flex: 1 }}>
                {!showLogActual ? (
                  <TouchableOpacity onPress={() => setShowLogActual(true)}>
                    <Text
                      style={[
                        styles.detailText,
                        { color: theme.primaryAction, fontWeight: "600" },
                      ]}
                    >
                      Log what actually happened
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 10 }}>
                    <TouchableOpacity
                      onPress={handleLogAsPlanned}
                      disabled={savingActual}
                      style={{
                        backgroundColor: theme.primaryAction,
                        borderRadius: 8,
                        paddingVertical: 10,
                        alignItems: "center",
                        opacity: savingActual ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                        Done as planned
                      </Text>
                    </TouchableOpacity>

                    <Text
                      style={[
                        styles.detailText,
                        { color: theme.textMuted, fontSize: 12 },
                      ]}
                    >
                      Or, what did you do instead?
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.outlineVariant,
                        borderRadius: 8,
                        padding: 10,
                        color: theme.text,
                      }}
                      placeholder="What actually happened"
                      placeholderTextColor={theme.textMuted}
                      value={substitutedText}
                      onChangeText={setSubstitutedText}
                    />
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.outlineVariant,
                        borderRadius: 8,
                        padding: 10,
                        color: theme.text,
                        minHeight: 60,
                      }}
                      placeholder="Optional note"
                      placeholderTextColor={theme.textMuted}
                      value={actualNoteText}
                      onChangeText={setActualNoteText}
                      multiline
                    />
                    <TouchableOpacity
                      onPress={handleLogDifferent}
                      disabled={savingActual || !substitutedText.trim()}
                      style={{
                        backgroundColor: theme.surfaceContainer,
                        borderWidth: 1,
                        borderColor: theme.outlineVariant,
                        borderRadius: 8,
                        paddingVertical: 10,
                        alignItems: "center",
                        opacity:
                          savingActual || !substitutedText.trim() ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: theme.text, fontWeight: "600" }}>
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hintText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  hintAction: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: "600",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  popover: {
    borderRadius: RoundedGeometry.default,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    padding: 16,
    paddingTop: 8,
    height: 500,
    overflow: "hidden",
  },
  popoverScroll: {
    flex: 1,
    minHeight: 0,
  },
  centeredFallback: {
    alignSelf: "center",
    top: "30%",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: -8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkboxBtn: {
    marginTop: 2,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginTop: 6,
  },
  checklistItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleText: {
    fontFamily: Fonts.headline,
    fontSize: 20, // using hardcoded size as headlineSm is not in Typography
    fontWeight: "700",
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  icon: {
    marginTop: 2,
    width: 18,
    textAlign: "center",
  },
  iconPlaceholder: {
    width: 18,
  },
  lucideIcon: {
    width: 18,
    marginTop: 2,
    alignItems: "center",
  },
  focusBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  focusBtnText: {
    fontFamily: Fonts.body,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: "600",
  },
  focusingText: {
    fontFamily: Fonts.body,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: "600",
  },
  timeText: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodyMd.fontSize,
  },
  detailText: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodySm.fontSize,
    flex: 1,
    lineHeight: 20,
  },
  showMoreText: {
    fontFamily: Fonts.body,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: "600",
    marginTop: 4,
  },
  travelSection: {
    borderRadius: RoundedGeometry.default,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    marginVertical: 4,
  },
  travelItem: {
    gap: 3,
  },
  travelTitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  travelDetail: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginLeft: 22,
  },
  travelConflictBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
    marginLeft: 22,
  },
  travelConflictText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: "600",
  },
});
