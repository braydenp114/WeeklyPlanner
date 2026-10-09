import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { ChevronDown, ChevronLeft, ChevronRight, CircleAlert, ListFilter, Menu, Repeat, X } from 'lucide-react-native';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MonthlyGridView from './MonthlyGridView';
import { SwipeNavigator, wasJustSwiped } from './SwipeNavigator';
import { ReflectionCard } from './ReflectionCard';
import { RolloverBanner } from './RolloverBanner';
import { useStreaks } from '@/context/StreaksContext';
import { PRIORITY_META } from '@/utils/priority';
import { getTasksForRange, Task, deleteTask, deleteSeries } from '@/services/tasksService';
import { AnchorRect } from './ui/TimeDropdown';
import { ConfirmDialog } from './ConfirmDialog';
import { RecurringActionDialog, RecurringActionScope } from './RecurringActionDialog';
import { TaskPreviewPopover } from './TaskPreviewPopover';
import {
  TaskItem,
  HoverableTaskCard,
  getPastEventStyle,
  formatTimeRange,
  formatShortTime,
  formatHourLabel,
  NOW_LINE_COLOR,
} from './calendar-shared';

// Re-exported so existing imports from '@/components/WeeklyGrid' keep working
export type { TaskItem } from './calendar-shared';
export { HoverableTaskCard, getPastEventStyle } from './calendar-shared';

const hours = Array.from({ length: 24 }, (_, i) => i);

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
const dayNumFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric' });
const monthShortFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });
const monthShortYearFormatter = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' });

/** Height of one hour row in the week/day grid (Google Calendar uses about 48px). */
const ROW_HEIGHT = 48;
/** Width of the hour-label column on the left. */
const GUTTER_WIDTH_DESKTOP = 64;
const GUTTER_WIDTH_MOBILE = 44;

const monthYearFormatter = new Intl.DateTimeFormat(locale, {
  month: 'long',
  year: 'numeric',
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

type CompletionFilter = 'All' | 'Incomplete' | 'Completed';

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


// ─── Mapping: ExpandedTask → TaskItem[] ─────────────────────────────────────



/**
 * Maps Firestore tasks to grid-local TaskItem entries.
 * Each task may span multiple days; one TaskItem is created per visible day it overlaps.
 */
function mapTasksToItems(
  tasks: Task[],
  gridDates: Date[]
): TaskItem[] {
  const items: TaskItem[] = [];

  for (const task of tasks) {
    const taskStart = task.startDate.toDate();
    const taskEnd = task.endDate.toDate();
    const category = task.category || '';

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
          id: `${task.id}-day${dayIdx}`,
          title: task.title,
          dayIndex: dayIdx,
          startHour: 0,
          durationHours: 24,
          colorHex: task.colorHex,
          category,
          actualDate: gridDate,
          originalTaskId: task.id || '',
          isRecurrenceInstance: !!task.seriesId,
          isAllDay: true,
          originalTaskData: task,
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
        id: `${task.id}-day${dayIdx}`,
        title: task.title,
        dayIndex: dayIdx,
        startHour,
        durationHours,
        colorHex: task.colorHex,
        category,
        actualDate: gridDate,
        originalTaskId: task.id || '',
        isRecurrenceInstance: !!task.seriesId,
        isAllDay: false,
        originalTaskData: task,
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
  const { user, loading: authLoading } = useAuth();
  const { isDesktop, setIsMobileMenuOpen, openNewTaskModal, taskRefreshKey } = useNav();
  const { challenges } = useStreaks();

  const [currentDate, setCurrentDate] = useState(new Date());

  const [viewMode, setViewMode] = useState<ViewMode>('Week');
  const [dateOffset, setDateOffset] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);


  // ── Popover State ──
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<AnchorRect | null>(null);

  const handleTaskClick = useCallback((task: TaskItem, anchor: AnchorRect) => {
    if (wasJustSwiped()) return; // the end of a swipe is not a tap
    setSelectedTask(task);
    setPopoverAnchor(anchor);
  }, []);

  const { openEditTaskModal, refreshTasks } = useNav();

  const [actionTask, setActionTask] = useState<TaskItem | null>(null);
  const [actionMode, setActionMode] = useState<'edit' | 'delete'>('edit');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleEditTask = useCallback((task: TaskItem) => {
    setSelectedTask(null);
    if (task.isRecurrenceInstance) {
      setActionTask(task);
      setActionMode('edit');
    } else {
      openEditTaskModal(task.originalTaskData, 'this');
    }
  }, [openEditTaskModal]);

  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTask = useCallback((task: TaskItem) => {
    setSelectedTask(null);
    if (task.isRecurrenceInstance) {
      setActionTask(task);
      setActionMode('delete');
    } else {
      setDeleteConfirmTask(task);
    }
  }, []);

  const confirmDelete = async () => {
    if (!deleteConfirmTask) return;
    setIsDeleting(true);
    try {
      await deleteTask(deleteConfirmTask.originalTaskId);
      setSelectedTask(null);
      refreshTasks();
    } finally {
      setIsDeleting(false);
      setDeleteConfirmTask(null);
    }
  };

  const handleActionConfirm = async (scope: RecurringActionScope) => {
    if (!actionTask) return;

    if (actionMode === 'edit') {
      openEditTaskModal(actionTask.originalTaskData, scope);
      setActionTask(null);
    } else if (actionMode === 'delete') {
      setIsActionLoading(true);
      try {
        if (scope === 'this') {
          await deleteTask(actionTask.originalTaskId);
        } else {
          await deleteSeries(actionTask.originalTaskData.seriesId!);
        }
        refreshTasks();
        setActionTask(null);
      } catch (e: any) {
        setTasksError(e.message || 'Failed to delete task');
      } finally {
        setIsActionLoading(false);
      }
    }
  };

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
  const firstDay = weekDates[0];
  const lastDay = weekDates[weekDates.length - 1];

  // ── Compute date range for fetching ──
  const rangeStart = firstDay ? new Date(firstDay) : new Date();
  rangeStart.setHours(0, 0, 0, 0);

  const rangeEnd = lastDay ? new Date(lastDay) : new Date();
  rangeEnd.setHours(23, 59, 59, 999);

  // ── Fetch tasks from Firestore (gated on auth readiness) ──
  useEffect(() => {
    let cancelled = false;

    // Don't fetch until Firebase Auth has finished restoring the persisted session.
    // Without this gate, auth.currentUser is null on reload and the service throws
    // "User not authenticated" before onAuthStateChanged has fired.
    if (authLoading || !user) {
      // Clear tasks if the user signed out, asynchronously to avoid ESLint cascade warning
      Promise.resolve().then(() => {
        if (!cancelled) {
          setTasks([]);
          setAllDayTasks([]);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    async function fetchTasks() {
      setTasksLoading(true);
      setTasksError(null);

      try {
        const fetchedTasks = await getTasksForRange(rangeStart, rangeEnd);

        if (cancelled) return;

        // Map to grid-local TaskItem format
        const items = mapTasksToItems(fetchedTasks, weekDates);

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
  }, [rangeStart.getTime(), rangeEnd.getTime(), taskRefreshKey, authLoading, user]);

  // ── Completion filter ──
  const visibleTasks = useMemo(() => {
    if (completionFilter === 'All') return tasks;
    return tasks.filter((task) =>
      completionFilter === 'Completed'
        ? !!task.originalTaskData.completed
        : !task.originalTaskData.completed,
    );
  }, [tasks, completionFilter]);

  const visibleAllDayTasks = useMemo(() => {
    if (completionFilter === 'All') return allDayTasks;
    return allDayTasks.filter((task) =>
      completionFilter === 'Completed'
        ? !!task.originalTaskData.completed
        : !task.originalTaskData.completed,
    );
  }, [allDayTasks, completionFilter]);

  // ── Layout Algorithm for Staggered Events ──
  const layoutMap = useMemo(() => {
    const map = new Map<string, { col: number; maxCols: number }>();

    // Process day by day
    for (const dayIdx of [0, 1, 2, 3, 4, 5, 6]) {
      const dayTasks = visibleTasks.filter(t => t.dayIndex === dayIdx);
      const sorted = [...dayTasks].sort((a, b) => a.startHour - b.startHour || b.durationHours - a.durationHours);
      
      let currentCluster: TaskItem[] = [];
      let clusterEnd = 0;
      
      const processCluster = (cluster: TaskItem[]) => {
        const columns: TaskItem[][] = [];
        for (const task of cluster) {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
             const lastInCol = columns[i][columns[i].length - 1];
             if (lastInCol.startHour + lastInCol.durationHours <= task.startHour) {
                columns[i].push(task);
                placed = true;
                map.set(task.id, { col: i, maxCols: 0 });
                break;
             }
          }
          if (!placed) {
            columns.push([task]);
            map.set(task.id, { col: columns.length - 1, maxCols: 0 });
          }
        }
        for (const task of cluster) {
           const l = map.get(task.id)!;
           l.maxCols = columns.length;
           map.set(task.id, l);
        }
      };

      for (const task of sorted) {
        if (currentCluster.length > 0 && task.startHour >= clusterEnd) {
          processCluster(currentCluster);
          currentCluster = [];
          clusterEnd = 0;
        }
        currentCluster.push(task);
        clusterEnd = Math.max(clusterEnd, task.startHour + task.durationHours);
      }
      if (currentCluster.length > 0) {
        processCluster(currentCluster);
      }
    }
    return map;
  }, [visibleTasks]);


  const goToPrev = useCallback(() => setDateOffset((prev) => prev - 1), []);
  const goToNext = useCallback(() => setDateOffset((prev) => prev + 1), []);

  const gutterWidth = isDesktop ? GUTTER_WIDTH_DESKTOP : GUTTER_WIDTH_MOBILE;
  const gridLineColor = theme.outlineVariant + '80'; // softer than the default outline
  const surface = theme.surfaceContainerLowest;

  const title =
    viewMode === 'Month'
      ? (isDesktop ? monthYearFormatter : monthShortYearFormatter).format(weekDates[Math.floor(weekDates.length / 2)])
      : firstDay.getMonth() === lastDay.getMonth() || viewMode === 'Day'
        ? (isDesktop ? monthYearFormatter : monthShortYearFormatter).format(firstDay)
        : `${monthShortFormatter.format(firstDay)} – ${(isDesktop ? monthShortYearFormatter : monthShortFormatter).format(lastDay)}`;

  // Start the week/day view scrolled to the morning, like Google Calendar
  const timelineRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (viewMode === 'Month') return;
    const t = setTimeout(() => timelineRef.current?.scrollTo({ y: ROW_HEIGHT * 6.6, animated: false }), 0);
    return () => clearTimeout(t);
  }, [viewMode]);

  const renderEventContent = (task: TaskItem, height: number, isPast: boolean) => {
    const start = task.originalTaskData.startDate.toDate();
    const end = task.originalTaskData.endDate.toDate();
    const completed = !!task.originalTaskData.completed;
    const titleText = (
      <Text
        style={[styles.eventTitle, !isDesktop && styles.eventTitleMobile, completed && styles.completedStrike]}
        numberOfLines={height < 34 ? 1 : Math.max(1, Math.floor((height - 18) / 15))}
      >
        {completed ? '✓ ' : ''}
        {task.title}
        {height < 34 ? <Text style={styles.eventMeta}>{`, ${formatShortTime(start)}`}</Text> : null}
      </Text>
    );
    if (height < 34) return titleText;
    return (
      <>
        {titleText}
        <Text style={[styles.eventMeta, !isDesktop && styles.eventTitleMobile]} numberOfLines={1}>
          {formatTimeRange(start, end)}
          {task.originalTaskData.priority ? ` · ${PRIORITY_META[task.originalTaskData.priority].label}` : ''}
        </Text>
        {height >= 60 && !!task.category && (
          <Text style={[styles.eventMeta, styles.eventCategory]} numberOfLines={1}>
            {task.category}
          </Text>
        )}
        {task.isRecurrenceInstance && isDesktop && height >= 44 && (
          <Repeat size={12} color="rgba(255,255,255,0.85)" strokeWidth={2.2} style={styles.repeatIcon} />
        )}
      </>
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: surface }]}>
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { borderBottomColor: gridLineColor }]}>
        <View style={styles.navGroup}>
          {!isDesktop && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsMobileMenuOpen(true)}
              style={styles.iconButton}
            >
              <Menu size={22} color={theme.text} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {isDesktop && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDateOffset(0)}
              style={[styles.pillButton, { borderColor: theme.outline }]}
            >
              <Text style={[styles.pillButtonText, { color: theme.text }]}>Today</Text>
            </TouchableOpacity>
          )}

          {isDesktop && (
            <View style={styles.arrowGroup}>
              <TouchableOpacity activeOpacity={0.6} onPress={goToPrev} style={styles.iconButton}>
                <ChevronLeft size={22} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.6} onPress={goToNext} style={styles.iconButton}>
                <ChevronRight size={22} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.dateLabel, { color: theme.text }, !isDesktop && styles.dateLabelMobile]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.navGroupRight}>
          {!isDesktop && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDateOffset(0)}
              style={[styles.todayIcon, { borderColor: theme.textSecondary }]}
            >
              <Text style={[styles.todayIconText, { color: theme.textSecondary }]}>{new Date().getDate()}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setIsFilterOpen(!isFilterOpen);
                setIsDropdownOpen(false);
              }}
              style={[styles.pillButton, styles.pillWithIcon, { borderColor: theme.outline }, !isDesktop && styles.pillCompact]}
            >
              <ListFilter size={17} color={theme.textSecondary} strokeWidth={2} />
              {isDesktop && <Text style={[styles.pillButtonText, { color: theme.text }]}>{completionFilter}</Text>}
            </TouchableOpacity>
            {isFilterOpen && (
              <View style={[styles.dropdownMenu, { backgroundColor: surface, borderColor: gridLineColor }]}>
                {(['All', 'Incomplete', 'Completed'] as CompletionFilter[]).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.dropdownMenuItem, option === completionFilter && { backgroundColor: theme.surfaceContainer }]}
                    onPress={() => {
                      setCompletionFilter(option);
                      setIsFilterOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownMenuItemText, { color: theme.text }]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setIsFilterOpen(false);
              }}
              style={[styles.pillButton, styles.pillWithIcon, { borderColor: theme.outline }, !isDesktop && styles.pillCompact]}
            >
              <Text style={[styles.pillButtonText, { color: theme.text }]}>{viewMode}</Text>
              <ChevronDown size={16} color={theme.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            {isDropdownOpen && (
              <View style={[styles.dropdownMenu, { backgroundColor: surface, borderColor: gridLineColor }]}>
                {(['Day', 'Week', '7 Days', 'Month'] as ViewMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.dropdownMenuItem, mode === viewMode && { backgroundColor: theme.surfaceContainer }]}
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
      </View>

      {/* Error Banner */}
      {tasksError && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '22', borderColor: theme.error }]}>
          <CircleAlert size={16} color={theme.error} strokeWidth={2} />
          <Text style={[styles.errorText, { color: theme.error }]}>{tasksError}</Text>
          <TouchableOpacity onPress={() => setTasksError(null)}>
            <X size={16} color={theme.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Carry over last week's unfinished tasks (only on this week's Week view) */}
      {viewMode === 'Week' && dateOffset === 0 && !!user && <RolloverBanner />}

      {/* End-of-day reflection on the Day view, for today and earlier days */}
      {viewMode === 'Day' && !!user && dateOffset <= 0 && <ReflectionCard date={firstDay} />}

      {viewMode === 'Month' ? (
        <SwipeNavigator axis="y" onNext={goToNext} onPrev={goToPrev}>
          <MonthlyGridView
            dates={weekDates}
            currentDate={currentDate}
            tasks={[...visibleTasks, ...visibleAllDayTasks]}
            onDayClick={(date) => {
              if (wasJustSwiped()) return; // the end of a swipe is not a tap
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const target = new Date(date);
              target.setHours(0, 0, 0, 0);
              const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              setDateOffset(diffDays);
              setViewMode('Day');
              setIsDropdownOpen(false);
            }}
            onTaskClick={handleTaskClick}
            streakBands={challenges.filter((c) => c.showOnCalendar)}
          />
        </SwipeNavigator>
      ) : (
        <SwipeNavigator axis="x" onNext={goToNext} onPrev={goToPrev}>
          <ScrollView
            ref={timelineRef}
            style={styles.timelineScroll}
            contentContainerStyle={styles.timelineContent}
            showsVerticalScrollIndicator={isDesktop}
            stickyHeaderIndices={[0]}
          >
            {/* Sticky header: weekday + date, then the all-day row. Lives inside the
                ScrollView so its columns line up exactly with the grid columns below. */}
            <View style={[styles.stickyHeader, { backgroundColor: surface, borderBottomColor: gridLineColor }]}>
              <View style={styles.headerRow}>
                <View style={{ width: gutterWidth }} />
                {weekDates.map((date) => {
                  const today = isToday(date);
                  return (
                    <View key={date.toISOString()} style={[styles.dayHeaderCell, weekDates.length === 1 && styles.dayHeaderCellSingle]}>
                      <Text style={[styles.dayHeaderName, { color: today ? theme.primaryAction : theme.textSecondary }]}>
                        {dayFormatter.format(date).toUpperCase()}
                      </Text>
                      <View style={[styles.dayNumberCircle, !isDesktop && styles.dayNumberCircleMobile, today && { backgroundColor: theme.primaryAction }]}>
                        <Text
                          style={[
                            styles.dayHeaderNumber,
                            !isDesktop && styles.dayHeaderNumberMobile,
                            { color: today ? '#FFFFFF' : theme.text },
                          ]}
                        >
                          {dayNumFormatter.format(date)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* All-day row (always shown so the header height doesn't jump) */}
              <View style={styles.allDayRow}>
                <View style={[styles.allDayGutter, { width: gutterWidth }]}>
                  {visibleAllDayTasks.length > 0 && (
                    <Text style={[styles.allDayLabelText, { color: theme.textMuted }]}>all-day</Text>
                  )}
                </View>
                {weekDates.map((date, dayIdx) => (
                  <View key={`allday-${date.toISOString()}`} style={[styles.allDayColumn, { borderLeftColor: gridLineColor }]}>
                    {visibleAllDayTasks
                      .filter((t) => t.dayIndex === dayIdx)
                      .map((task) => {
                        const isPast = task.originalTaskData.endDate.toDate().getTime() < currentDate.getTime();
                        return (
                          <HoverableTaskCard
                            key={task.id}
                            task={task}
                            style={[styles.allDayChip, getPastEventStyle(isPast, task.colorHex)]}
                            onPress={handleTaskClick}
                          >
                            <Text
                              style={[styles.allDayChipText, task.originalTaskData.completed && styles.completedStrike]}
                              numberOfLines={1}
                            >
                              {task.originalTaskData.completed ? '✓ ' : ''}
                              {task.title}
                            </Text>
                          </HoverableTaskCard>
                        );
                      })}
                  </View>
                ))}
              </View>
            </View>

            {/* Grid body */}
            <View style={styles.gridBody}>
              {/* Hour labels */}
              <View style={{ width: gutterWidth, height: ROW_HEIGHT * 24 }}>
                {hours
                  .filter((h) => h > 0)
                  .map((hour) => (
                    <Text
                      key={`label-${hour}`}
                      style={[styles.timeLabelText, { color: theme.textMuted, top: hour * ROW_HEIGHT - 7 }]}
                    >
                      {formatHourLabel(hour)}
                    </Text>
                  ))}
              </View>

              {/* Day columns */}
              <View style={styles.daysRow}>
                {weekDates.map((date, dayIdx) => (
                  <View key={`${date.toISOString()}-column`} style={[styles.dayColumn, { borderLeftColor: gridLineColor }]}>
                    {hours.map((hour) => (
                      <TouchableOpacity
                        key={`${date.toISOString()}-${hour}`}
                        style={[styles.hourCell, { borderTopColor: gridLineColor, height: ROW_HEIGHT }]}
                        activeOpacity={0.6}
                        onPress={() => {
                          if (!wasJustSwiped()) openNewTaskModal(date, hour);
                        }}
                      />
                    ))}

                    {/* Task blocks for this day */}
                    {visibleTasks
                      .filter((task) => task.dayIndex === dayIdx)
                      .map((task) => {
                        const layout = layoutMap.get(task.id);
                        const col = layout?.col || 0;
                        const maxCols = layout?.maxCols || 1;
                        const height = Math.max(task.durationHours * ROW_HEIGHT - 2, 18);
                        const isPast = task.originalTaskData.endDate.toDate().getTime() < currentDate.getTime();

                        return (
                          <HoverableTaskCard
                            key={task.id}
                            task={task}
                            style={[
                              styles.taskCard,
                              getPastEventStyle(isPast, task.colorHex),
                              {
                                top: task.startHour * ROW_HEIGHT + 1,
                                height,
                                // Overlapping tasks sit side by side instead of covering each other
                                left: `${(col / maxCols) * 100}%`,
                                width: `${100 / maxCols}%`,
                                borderColor: surface,
                                zIndex: col + 1,
                              },
                              height < 34 && styles.taskCardShort,
                            ]}
                            onPress={handleTaskClick}
                          >
                            {renderEventContent(task, height, isPast)}
                          </HoverableTaskCard>
                        );
                      })}

                    {/* Current time indicator */}
                    {isToday(date) && (
                      <View
                        pointerEvents="none"
                        style={[styles.nowLine, { top: (currentDate.getHours() + currentDate.getMinutes() / 60) * ROW_HEIGHT }]}
                      >
                        <View style={styles.nowDot} />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Loading indicator (stale-while-revalidate: doesn't blank existing tasks) */}
              {tasksLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={theme.primaryAction} />
                </View>
              )}
            </View>
          </ScrollView>
        </SwipeNavigator>
      )}

      {!tasksLoading && tasks.length === 0 && allDayTasks.length === 0 && (
        <View style={styles.emptyStateOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.emptyStateContent}
            onPress={() => openNewTaskModal(new Date(), new Date().getHours())}
          >
            <Text style={[styles.emptyStateText, { color: theme.text }]}>No tasks yet</Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.primaryAction }]}>Tap to add one</Text>
          </TouchableOpacity>
        </View>
      )}      

      <TaskPreviewPopover
        visible={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        anchor={popoverAnchor}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        onChanged={refreshTasks}
      />
      
      <ConfirmDialog
        visible={!!deleteConfirmTask}
        title="Delete this task?"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirmTask(null)}
      />

      <RecurringActionDialog
        visible={!!actionTask}
        mode={actionMode}
        isLoading={isActionLoading}
        onConfirm={handleActionConfirm}
        onClose={() => setActionTask(null)}
      />
    </View>
  );
}

/**
 * Styles for the WeeklyGrid component.
 */

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    zIndex: 50,
    gap: 8,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  navGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: RoundedGeometry.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: RoundedGeometry.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillWithIcon: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
  },
  pillCompact: {
    height: 32,
    paddingHorizontal: 8,
  },
  pillButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '500',
  },
  dateLabel: {
    fontFamily: Fonts.headline,
    fontSize: 22,
    fontWeight: '400',
    marginLeft: 4,
  },
  dateLabelMobile: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 0,
  },
  todayIcon: {
    width: 26,
    height: 26,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayIconText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 50,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 42,
    right: 0,
    borderWidth: 1,
    borderRadius: RoundedGeometry.default,
    paddingVertical: 6,
    minWidth: 140,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownMenuItemText: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  // ── Week / day grid ──
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: 24,
  },
  stickyHeader: {
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dayHeaderCellSingle: {
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  dayHeaderName: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  dayNumberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dayNumberCircleMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  dayHeaderNumber: {
    fontFamily: Fonts.body,
    fontSize: 24,
    fontWeight: '400',
  },
  dayHeaderNumberMobile: {
    fontSize: 17,
  },
  allDayRow: {
    flexDirection: 'row',
    minHeight: 8,
  },
  allDayGutter: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  allDayLabelText: {
    fontFamily: Fonts.body,
    fontSize: 10,
  },
  allDayColumn: {
    flex: 1,
    borderLeftWidth: 1,
    paddingHorizontal: 2,
    paddingBottom: 2,
    gap: 2,
  },
  allDayChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  allDayChipText: {
    fontFamily: Fonts.body,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  gridBody: {
    flexDirection: 'row',
    position: 'relative',
  },
  timeLabelText: {
    position: 'absolute',
    right: 8,
    fontFamily: Fonts.body,
    fontSize: 10,
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  dayColumn: {
    flex: 1,
    borderLeftWidth: 1,
    position: 'relative',
  },
  hourCell: {
    borderTopWidth: 1,
  },
  taskCard: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  taskCardShort: {
    paddingVertical: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontFamily: Fonts.body,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },
  eventTitleMobile: {
    fontSize: 10,
    lineHeight: 12,
    // Clip long words on narrow phone columns instead of splitting them mid-word
    ...(Platform.OS === 'web' ? ({ wordBreak: 'keep-all', overflowWrap: 'normal' } as object) : {}),
  },
  eventMeta: {
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  },
  eventCategory: {
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'capitalize',
  },
  repeatIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  completedStrike: {
    textDecorationLine: 'line-through',
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: NOW_LINE_COLOR,
    zIndex: 30,
  },
  nowDot: {
    position: 'absolute',
    left: -6,
    top: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: NOW_LINE_COLOR,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RoundedGeometry.default,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
  },
  // ── Empty State ──
  emptyStateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: RoundedGeometry.default,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emptyStateText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
});
