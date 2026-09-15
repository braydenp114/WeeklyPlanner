import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { NavIcon } from '@/components/NavIcon';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Colors,
  Fonts,
  Glassmorphism,
  RoundedGeometry,
  Typography,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MonthlyGridView from './MonthlyGridView';
import { getTasksForRange, getRecurringTasks, Task } from '@/services/tasksService';
import { expandAllTasks, ExpandedTask } from '@/utils/expandRecurrences';

const hours = Array.from({ length: 24 }, (_, i) => i);

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
const dayNumFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric' });
const monthDayFormatter = new Intl.DateTimeFormat(locale, {
  month: 'short',
  day: 'numeric',
});
const monthYearFormatter = new Intl.DateTimeFormat(locale, {
  month: 'long',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat(locale, {
  hour: 'numeric',
  minute: '2-digit',
});

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

type ViewMode = 'Day' | 'Week' | '7 Days' | 'Month';

function getGridDates(viewMode: ViewMode, offset: number) {
  const targetDate = new Date();

  if (viewMode === 'Month') {
    targetDate.setMonth(targetDate.getMonth() + offset);
    const firstDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const start = getStartOfWeek(firstDayOfMonth);
    
    const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    const end = new Date(lastDayOfMonth);
    const endDay = end.getDay();
    const endDiff = endDay === 0 ? 0 : 7 - endDay;
    end.setDate(end.getDate() + endDiff);
    
    const days = [];
    let current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  if (viewMode === 'Week') {
    targetDate.setDate(targetDate.getDate() + offset * 7);
    const start = getStartOfWeek(targetDate);
    return Array.from({ length: 7 }, (_, index) => {
      const value = new Date(start);
      value.setDate(start.getDate() + index);
      return value;
    });
  }

  if (viewMode === 'Day') {
    targetDate.setDate(targetDate.getDate() + offset);
    targetDate.setHours(0, 0, 0, 0);
    return [targetDate];
  }

  if (viewMode === '7 Days') {
    targetDate.setDate(targetDate.getDate() + offset * 7);
    targetDate.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const value = new Date(targetDate);
      value.setDate(targetDate.getDate() + index);
      return value;
    });
  }
  return [];
}

// ─── TaskItem: grid-local rendering format ──────────────────────────────────

export type TaskItem = {
  id: string;
  title: string;
  dayIndex: number;
  startHour: number;
  durationHours: number;
  colorHex: string;
  tag: string;
  /** The actual calendar date this occurrence falls on, for month view matching. */
  actualDate: Date;
  /** The original Firestore document ID, for edit/delete operations. */
  originalTaskId: string;
  /** Whether this is a generated recurrence instance. */
  isRecurrenceInstance: boolean;
  /** Whether this is an all-day event. */
  isAllDay: boolean;
};

// ─── Mapping: ExpandedTask → TaskItem[] ─────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Maps expanded Firestore tasks to grid-local TaskItem entries.
 * Each expanded task may span multiple days; one TaskItem is created per visible day it overlaps.
 */
function mapExpandedTasksToItems(
  expandedTasks: ExpandedTask[],
  gridDates: Date[]
): TaskItem[] {
  const items: TaskItem[] = [];

  for (const task of expandedTasks) {
    const taskStart = task.startDate.toDate();
    const taskEnd = task.endDate.toDate();
    const tag = task.title.split(/\s+/)[0] || '';

    for (let dayIdx = 0; dayIdx < gridDates.length; dayIdx++) {
      const gridDate = gridDates[dayIdx];
      const dayStart = new Date(gridDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(gridDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Check if the task overlaps this day
      if (taskEnd < dayStart || taskStart > dayEnd) continue;

      if (task.allDay) {
        items.push({
          id: `${task.occurrenceId}-day${dayIdx}`,
          title: task.title,
          dayIndex: dayIdx,
          startHour: 0,
          durationHours: 24,
          colorHex: task.colorHex,
          tag,
          actualDate: gridDate,
          originalTaskId: task.originalTaskId,
          isRecurrenceInstance: task.isRecurrenceInstance,
          isAllDay: true,
        });
        continue;
      }

      // Compute start hour on this day (clamped to 0 if task started before this day)
      const effectiveStart = taskStart < dayStart ? dayStart : taskStart;
      const startHour =
        effectiveStart.getHours() + effectiveStart.getMinutes() / 60;

      // Compute end on this day (clamped to 24 if task extends past midnight)
      const effectiveEnd = taskEnd > dayEnd ? dayEnd : taskEnd;
      const endHour =
        effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60;

      // Duration in hours on this specific day
      const durationHours = Math.max(endHour - startHour, 0.25); // min 15min visual height

      items.push({
        id: `${task.occurrenceId}-day${dayIdx}`,
        title: task.title,
        dayIndex: dayIdx,
        startHour,
        durationHours,
        colorHex: task.colorHex,
        tag,
        actualDate: gridDate,
        originalTaskId: task.originalTaskId,
        isRecurrenceInstance: task.isRecurrenceInstance,
        isAllDay: false,
      });
    }
  }

  return items;
}

/**
 * The main grid component displaying a weekly view of tasks.
 * It features a scrollable hourly timeline and date headers.
 */
export default function WeeklyGrid() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user, signOutUser } = useAuth();
  const { isDesktop, setIsMobileMenuOpen, openNewTaskModal, taskRefreshKey } = useNav();

  const [currentDate, setCurrentDate] = useState(new Date());

  const [viewMode, setViewMode] = useState<ViewMode>('Week');
  const [dateOffset, setDateOffset] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [gridHeight, setGridHeight] = useState(0);

  // ── Firestore task data ──
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [allDayTasks, setAllDayTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    // Update the current time every minute to keep the "current time" line accurate
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const weekDates = getGridDates(viewMode, dateOffset);
  const MIN_ROW_HEIGHT = 50;
  const MIN_DAY_COLUMN_WIDTH = 100;
  const rowHeight = Math.max(gridHeight > 0 ? gridHeight / 24 : 52, MIN_ROW_HEIGHT);
  const firstDay = weekDates[0];
  const lastDay = weekDates[weekDates.length - 1];

  // ── Compute date range for fetching ──
  const rangeStart = useMemo(() => {
    if (!firstDay) return new Date();
    const d = new Date(firstDay);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [firstDay?.getTime()]);

  const rangeEnd = useMemo(() => {
    if (!lastDay) return new Date();
    const d = new Date(lastDay);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [lastDay?.getTime()]);

  // ── Fetch tasks from Firestore ──
  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setTasksLoading(true);
      setTasksError(null);

      try {
        // Fetch both: tasks in range + recurring tasks that may recur into range
        const [rangeTasks, recurringTasks] = await Promise.all([
          getTasksForRange(rangeStart, rangeEnd),
          getRecurringTasks(rangeStart, rangeEnd),
        ]);

        if (cancelled) return;

        // Merge and deduplicate, then expand recurrences
        const allRawTasks: Task[] = [...rangeTasks, ...recurringTasks];
        const expanded = expandAllTasks(allRawTasks, rangeStart, rangeEnd);

        // Map to grid-local TaskItem format
        const items = mapExpandedTasksToItems(expanded, weekDates);

        // Separate all-day and timed tasks
        setAllDayTasks(items.filter((t) => t.isAllDay));
        setTasks(items.filter((t) => !t.isAllDay));
      } catch (err: any) {
        if (cancelled) return;
        setTasksError(err.message || 'Failed to load tasks');
      } finally {
        if (!cancelled) {
          setTasksLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart.getTime(), rangeEnd.getTime(), taskRefreshKey]);

  const handleSignOut = async () => {
    await signOutUser();
    router.replace('/login');
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      {/* Top Glass Navigation Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.glassBackground,
            borderColor: theme.glassBorder,
            zIndex: 50,
          },
        ]}
      >
        <View style={styles.navGroup}>
          {!isDesktop && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsMobileMenuOpen(true)}
              style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer, marginRight: 8 }]}
            >
              <NavIcon name="hamburger" size={20} color={theme.text} />
            </TouchableOpacity>
          )}


          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setDateOffset(0)}
            style={[styles.todayButton, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
          >
            <Text style={[styles.todayText, { color: theme.text }]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setDateOffset(prev => prev - 1)}
            style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer }]}
          >
            <Text style={[styles.arrowText, { color: theme.text }]}>‹</Text>
          </TouchableOpacity>

          <Text style={[styles.dateLabel, { color: theme.text }]}>
            {viewMode === 'Month'
              ? monthYearFormatter.format(weekDates[Math.floor(weekDates.length / 2)])
              : viewMode === 'Day' 
              ? monthYearFormatter.format(firstDay)
              : (firstDay.getMonth() === lastDay.getMonth() 
                  ? monthYearFormatter.format(firstDay) 
                  : `${monthYearFormatter.format(firstDay).split(' ')[0]} - ${monthYearFormatter.format(lastDay)}`)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setDateOffset(prev => prev + 1)}
            style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer }]}
          >
            <Text style={[styles.arrowText, { color: theme.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ position: 'relative', zIndex: 50 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
            style={[styles.dropdownButton, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
          >
            <Text style={[styles.dropdownText, { color: theme.text }]}>{viewMode}</Text>
            <MaterialIcons name="arrow-drop-down" size={18} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
          {isDropdownOpen && (
            <View style={[styles.dropdownMenu, { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant, right: 0, left: 'auto' }]}>
              {(['Day', 'Week', '7 Days', 'Month'] as ViewMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={styles.dropdownMenuItem}
                  onPress={() => {
                    setViewMode(mode);
                    setDateOffset(0);
                    setIsDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownMenuItemText, { color: theme.text }]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Error Banner */}
      {tasksError && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '22', borderColor: theme.error }]}>
          <MaterialIcons name="error-outline" size={16} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{tasksError}</Text>
          <TouchableOpacity onPress={() => setTasksError(null)}>
            <MaterialIcons name="close" size={16} color={theme.error} />
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'Month' ? (
        <MonthlyGridView 
          dates={weekDates} 
          currentDate={currentDate} 
          tasks={[...tasks, ...allDayTasks]} 
          onDayClick={(date) => {
            const today = new Date();
            today.setHours(0,0,0,0);
            const target = new Date(date);
            target.setHours(0,0,0,0);
            const diffTime = target.getTime() - today.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            setDateOffset(diffDays);
            setViewMode('Day');
            setIsDropdownOpen(false);
          }}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.horizontalGridContent}
          {...(Platform.OS === 'web' ? { dataSet: { class: 'scrollbar-horizontal' } } as any : {})}
        >
          <View style={{ minWidth: MIN_DAY_COLUMN_WIDTH * weekDates.length + 54, flex: 1 }}>
          {/* Scrollable Hourly Timeline with sticky day header */}
          <ScrollView
            style={[styles.timelineScroll, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.timelineContent}
            showsVerticalScrollIndicator={true}
            onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}
            stickyHeaderIndices={[0]}
            {...(Platform.OS === 'web' ? { dataSet: { class: 'scrollbar-vertical' } } as any : {})}
          >
            {/* Days Header Row — sticky at top */}
            <View
              style={[
                styles.headerRowContainer,
                {
                  backgroundColor: theme.surfaceContainerLow,
                  borderColor: theme.outlineVariant,
                },
              ]}
            >
              <View style={[styles.timeColumnHeaderSpacer, { borderColor: theme.outlineVariant }]} />

              <View style={styles.dayHeaderRow}>
                {weekDates.map((date, idx) => {
                  const isToday = date.toDateString() === currentDate.toDateString();
                  return (
                    <View
                      key={date.toISOString()}
                      style={[
                        styles.dayHeaderCell,
                        { borderColor: theme.outlineVariant },
                        isToday && { backgroundColor: theme.surfaceContainerHighest },
                      ]}
                    >
                      <Text style={[styles.dayHeaderName, { color: theme.textSecondary }]}>
                        {dayFormatter.format(date).toUpperCase()}
                      </Text>
                      <View
                        style={[
                          styles.dayNumberBadge,
                          isToday && { backgroundColor: theme.primaryAction },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayHeaderNumber,
                            { color: isToday ? '#FFFFFF' : theme.text },
                          ]}
                        >
                          {dayNumFormatter.format(date)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* All-Day Tasks Banner */}
            {allDayTasks.length > 0 && (
              <View style={[styles.allDayRow, { borderColor: theme.outlineVariant }]}>
                <View style={[styles.allDayLabel, { borderColor: theme.outlineVariant }]}>
                  <Text style={[styles.allDayLabelText, { color: theme.textMuted }]}>ALL DAY</Text>
                </View>
                <View style={styles.allDayColumns}>
                  {weekDates.map((date, dayIdx) => {
                    const dayAllDayTasks = allDayTasks.filter((t) => t.dayIndex === dayIdx);
                    return (
                      <View
                        key={`allday-${date.toISOString()}`}
                        style={[styles.allDayColumn, { borderColor: theme.outlineVariant }]}
                      >
                        {dayAllDayTasks.map((task) => (
                          <View
                            key={task.id}
                            style={[
                              styles.allDayChip,
                              { backgroundColor: task.colorHex },
                            ]}
                          >
                            <Text style={styles.allDayChipText} numberOfLines={1}>
                              {task.title}
                            </Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Grid body */}
            <View style={styles.gridBody}>
              {/* Time Labels Column */}
              <View
                style={[
                  styles.timeColumn,
                  {
                    backgroundColor: theme.surfaceContainerLow,
                    borderColor: theme.outlineVariant,
                  },
                ]}
              >
                {/* Empty spacer blocks to maintain column height */}
                {hours.map((hour) => (
                  <View key={hour} style={[styles.timeSlot, { height: rowHeight }]} />
                ))}
                {/* Time labels positioned on the grid lines (skip midnight) */}
                {hours.filter((h) => h > 0).map((hour) => (
                  <Text
                    key={`label-${hour}`}
                    style={[
                      styles.timeLabelText,
                      { color: theme.textMuted, top: hour * rowHeight - 7 },
                    ]}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </Text>
                ))}
              </View>

              {/* Days Grid Columns with Task Overlay */}
              <View style={styles.daysRow}>
                {weekDates.map((date, dayIdx) => (
                  <View
                    key={`${date.toISOString()}-column`}
                    style={[styles.dayColumn, { borderColor: theme.outlineVariant }]}
                  >
                    {hours.map((hour) => (
                      <TouchableOpacity
                        key={`${date.toISOString()}-${hour}`}
                        style={[styles.hourCell, { borderColor: theme.outlineVariant, height: rowHeight }]}
                        activeOpacity={0.6}
                        onPress={() => openNewTaskModal(date, hour)}
                      />
                    ))}

                    {/* Render Current Time Line if Today */}
                    {isToday(date) && (
                      <View
                        style={[
                          styles.currentTimeLine,
                          {
                            top: (currentDate.getHours() + currentDate.getMinutes() / 60) * rowHeight,
                            backgroundColor: theme.primaryAction,
                          },
                        ]}
                      />
                    )}

                    {/* Render Task Cards belonging to this day */}
                    {tasks
                      .filter((task) => task.dayIndex === dayIdx)
                      .map((task) => {
                        const topOffset = task.startHour * rowHeight;
                        const cardHeight = task.durationHours * rowHeight - 6;

                        return (
                          <TouchableOpacity
                            key={task.id}
                            activeOpacity={0.85}
                            style={[
                              styles.taskCard,
                              {
                                top: topOffset + 3,
                                height: cardHeight,
                                backgroundColor: task.colorHex,
                                borderColor: theme.glassBorder,
                              },
                            ]}
                          >
                            <View style={styles.taskCardHeader}>
                              <Text style={styles.taskTagText}>{task.tag}</Text>
                              <Text style={styles.taskTimeText}>
                                {String(Math.floor(task.startHour)).padStart(2, '0')}:
                                {String(Math.round((task.startHour % 1) * 60)).padStart(2, '0')}
                              </Text>
                            </View>

                            <Text style={styles.taskTitleText} numberOfLines={2}>
                              {task.title}
                            </Text>

                            {task.isRecurrenceInstance && (
                              <View style={styles.recurrenceBadge}>
                                <MaterialIcons name="repeat" size={10} color="rgba(255,255,255,0.8)" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                ))}
              </View>

              {/* Loading Overlay (stale-while-revalidate: doesn't blank existing tasks) */}
              {tasksLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={theme.primaryAction} />
                </View>
              )}

              {/* Empty State */}
              {!tasksLoading && tasks.length === 0 && allDayTasks.length === 0 && !tasksError && (
                <View style={styles.emptyState}>
                  <MaterialIcons name="event-busy" size={32} color={theme.textMuted} />
                  <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>
                    No events
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

/**
 * Styles for the WeeklyGrid component.
 */

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RoundedGeometry.default, // 8px base radius
    borderWidth: 1,
    marginBottom: 8,
    ...Glassmorphism,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: RoundedGeometry.sm, // 4px
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RoundedGeometry.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  todayText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '600',
  },
  dateLabel: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineMobile.fontSize,
    fontWeight: '600',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RoundedGeometry.full, // 9999px pill
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timePillText: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: '500',
  },
  rightHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RoundedGeometry.full, // 9999px pill
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  userEmailText: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelSm.fontSize,
    maxWidth: 120,
  },
  signOutText: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: '600',
  },
  headerRowContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: RoundedGeometry.default, // 8px base radius
    overflow: 'hidden',
  },
  timeColumnHeaderSpacer: {
    width: 54,
    borderRightWidth: 1,
  },
  dayHeaderRow: {
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  dayHeaderCell: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
  },
  dayHeaderName: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayNumberBadge: {
    width: 45,
    height: 45,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dayHeaderNumber: {
    fontFamily: Fonts.headline,
    fontSize: 30,
    fontWeight: '700',
  },
  timelineScroll: {
    flex: 1,
    marginTop: 4,
  },
  horizontalGridContent: {
    flexGrow: 1,
  },
  timelineContent: {
    paddingBottom: 24,
  },
  gridBody: {
    flexDirection: 'row',
    flex: 1,
    position: 'relative',
  },
  timeColumn: {
    width: 54,
    borderRightWidth: 1,
    position: 'relative',
  },
  timeSlot: {
  },
  timeLabelText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontFamily: Fonts.mono,
    fontSize: Typography.labelSm.fontSize,
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  dayColumn: {
    flex: 1,
    minWidth: 100,
    borderRightWidth: 1,
    position: 'relative',
  },
  hourCell: {
    borderBottomWidth: 1,
  },
  taskCard: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: RoundedGeometry.default, // 8px rounded rectangle
    padding: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'space-between',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTagText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskTimeText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  taskTitleText: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodySm.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RoundedGeometry.sm,
    borderWidth: 1,
    justifyContent: 'center',
  },
  dropdownText: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: RoundedGeometry.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 100,
  },
  dropdownMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownMenuItemText: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: '500',
  },
  // ── All-Day Banner ──
  allDayRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderRadius: 0,
    minHeight: 32,
  },
  allDayLabel: {
    width: 54,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  allDayLabelText: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  allDayColumns: {
    flex: 1,
    flexDirection: 'row',
  },
  allDayColumn: {
    flex: 1,
    minWidth: 100,
    borderRightWidth: 1,
    padding: 2,
    gap: 2,
  },
  allDayChip: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  allDayChipText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // ── Recurrence Badge ──
  recurrenceBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    opacity: 0.7,
  },
  // ── Error Banner ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RoundedGeometry.sm,
    borderWidth: 1,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    flex: 1,
  },
  // ── Loading Overlay ──
  loadingOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
  },
  // ── Empty State ──
  emptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '500',
  },
});
