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
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors, Fonts, RoundedGeometry, Typography } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/AuthContext";
import { TaskItem } from "./WeeklyGrid";
import { AnchorRect } from "./ui/TimeDropdown";
import {
  updateTask,
  logTaskActual,
  ChecklistItem,
} from "@/services/tasksService";
import { getWeatherForTask, WeatherResult } from "@/services/weatherService";

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
      await updateTask(task.originalTaskId, { completed: next });
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
                style={styles.iconBtn}
              >
                <MaterialIcons
                  name="delete"
                  size={20}
                  color={theme.onSurfaceVariant}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
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
              <Text style={[styles.titleText, { color: theme.text }]}>
                {task.title}
              </Text>
            </View>

            {/* Time/Date */}
            <View style={styles.row}>
              <View style={styles.iconPlaceholder} />
              <Text style={[styles.timeText, { color: theme.text }]}>
                {formatTaskTime(task)}
              </Text>
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
});
