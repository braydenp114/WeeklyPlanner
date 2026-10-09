import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TaskItem, HoverableTaskCard, getPastEventStyle, formatShortTime } from './calendar-shared';
import { AnchorRect } from './ui/TimeDropdown';
import { getStreakIcon } from './streakIcons';
import type { ChallengeWithSummary } from '@/context/StreaksContext';
import { StreakDayStatus, toDayKey } from '@/utils/streakChallenge';

interface MonthlyGridViewProps {
  dates: Date[]; // Should be a flat array of 35 or 42 dates covering the month
  currentDate: Date;
  tasks: TaskItem[];
  onDayClick: (date: Date) => void;
  onTaskClick?: (task: TaskItem, anchor: AnchorRect) => void;
  /** Streak challenges to draw as Duolingo-style bands (only those set to show on the calendar). */
  streakBands?: ChallengeWithSummary[];
}

/** One run of consecutive streak days inside a week row. */
interface BandSegment {
  start: number; // column index 0-6
  statuses: StreakDayStatus[]; // 'done' or 'grace' for each day in the run
}

/** Splits a week into runs of days that are part of the streak (checked in or held by grace). */
function getBandSegments(week: Date[], days: Record<string, StreakDayStatus>): BandSegment[] {
  const segments: BandSegment[] = [];
  let current: BandSegment | null = null;
  week.forEach((date, idx) => {
    const status = days[toDayKey(date)];
    if (status === 'done' || status === 'grace') {
      if (!current) {
        current = { start: idx, statuses: [] };
        segments.push(current);
      }
      current.statuses.push(status);
    } else {
      current = null;
    }
  });
  return segments;
}

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
const dayNumFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric' });
const dayMonthFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

/** Space taken by the date number at the top of each cell, and by one event row. */
const CELL_HEADER_HEIGHT = 28;
const EVENT_ROW_HEIGHT = 20;
/** Below this cell width, events are shown as compact coloured bars (phone screens). */
const COMPACT_CELL_WIDTH = 90;

function isSameMonth(date1: Date, date2: Date) {
  return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Month view styled like Google Calendar: weekday names sit inside the grid so they line up
 * with the columns, every week row shares the available height, all-day tasks are coloured
 * bars and timed tasks are a dot + time + title. Extra tasks collapse into "+N more".
 */
export default function MonthlyGridView({ dates, currentDate, tasks, onDayClick, onTaskClick, streakBands = [] }: MonthlyGridViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  if (!dates || dates.length === 0) return null;

  // The 'primary' month is the month of the middle date in our grid
  const primaryMonthDate = dates[Math.floor(dates.length / 2)];
  const gridLineColor = theme.outlineVariant + '80';

  // Group dates into weeks (rows)
  const weeks: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  const cellWidth = gridSize.width / 7;
  const rowHeight = gridSize.height / weeks.length;
  const isCompact = cellWidth > 0 && cellWidth < COMPACT_CELL_WIDTH;
  const rowSize = isCompact ? 16 : EVENT_ROW_HEIGHT;
  const bandHeight = isCompact ? 14 : 20;
  const bandsHeight = streakBands.length * bandHeight;
  // How many task rows fit in a cell under the date and the streak bands (at least one)
  const maxRows =
    rowHeight > 0 ? Math.max(1, Math.floor((rowHeight - CELL_HEADER_HEIGHT - bandsHeight) / rowSize)) : 3;
  const dotSize = isCompact ? 10 : 16;

  const getTasksForDate = (date: Date) =>
    tasks
      .filter((t) => isSameDay(t.actualDate, date))
      .sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        return a.startHour - b.startHour;
      });

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceContainerLowest }]}>
      {/* Weekday names, using the same flex columns as the grid so they line up */}
      <View style={styles.headerRow}>
        {weeks[0].map((date, idx) => (
          <View key={idx} style={[styles.headerCell, { borderLeftColor: gridLineColor }, idx === 0 && styles.firstColumn]}>
            <Text style={[styles.headerText, { color: theme.textSecondary }]}>
              {dayFormatter.format(date).toUpperCase()}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={styles.gridBody}
        onLayout={(e) => setGridSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {weeks.map((week, weekIdx) => (
          <View key={weekIdx} style={[styles.weekRow, { borderBottomColor: gridLineColor }]}>
            {week.map((date, dayIdx) => {
              const isCurrentMonth = isSameMonth(date, primaryMonthDate);
              const isDayToday = isSameDay(date, currentDate);
              const dayTasks = getTasksForDate(date);
              // If not everything fits, keep the last row for the "+N more" link
              const visibleCount = dayTasks.length > maxRows ? Math.max(maxRows - 1, 0) : dayTasks.length;
              const visibleTasks = dayTasks.slice(0, visibleCount);
              const overflowCount = dayTasks.length - visibleCount;
              const label = date.getDate() === 1 && !isCompact ? dayMonthFormatter.format(date) : dayNumFormatter.format(date);

              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  activeOpacity={0.7}
                  onPress={() => onDayClick(date)}
                  style={[styles.dayCell, { borderLeftColor: gridLineColor }, dayIdx === 0 && styles.firstColumn]}
                >
                  <View style={styles.dayCellHeader}>
                    <View style={[styles.dateBadge, isDayToday && { backgroundColor: theme.primaryAction }, label.length > 2 && styles.dateBadgeWide]}>
                      <Text
                        style={[
                          styles.dateText,
                          { color: isDayToday ? '#FFFFFF' : isCurrentMonth ? theme.text : theme.textMuted },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  </View>

                  {/* Room for the streak bands drawn over this row */}
                  {bandsHeight > 0 && <View style={{ height: bandsHeight }} />}

                  {visibleTasks.map((task) => {
                    const isPast = task.originalTaskData.endDate.toDate().getTime() < currentDate.getTime();
                    const completed = !!task.originalTaskData.completed;
                    const asBar = task.isAllDay || isCompact;

                    return (
                      <HoverableTaskCard
                        key={task.id}
                        task={task}
                        style={[
                          styles.eventRow,
                          { height: rowSize - 2 },
                          asBar && getPastEventStyle(isPast, task.colorHex),
                          asBar && styles.eventBar,
                          !asBar && isPast && { opacity: 0.6 },
                        ]}
                        onPress={(t, rect) => onTaskClick?.(t, rect)}
                      >
                        {!asBar && <View style={[styles.eventDot, { backgroundColor: task.colorHex }]} />}
                        {!asBar && (
                          <Text style={[styles.eventTime, { color: theme.textSecondary }]} numberOfLines={1}>
                            {formatShortTime(task.originalTaskData.startDate.toDate())}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.eventTitle,
                            { color: asBar ? '#FFFFFF' : theme.text },
                            isCompact && styles.eventTitleCompact,
                            completed && styles.completedStrike,
                          ]}
                          numberOfLines={1}
                        >
                          {completed ? '✓ ' : ''}
                          {task.title}
                        </Text>
                      </HoverableTaskCard>
                    );
                  })}

                  {overflowCount > 0 && (
                    <Text style={[styles.overflowText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {isCompact ? `+${overflowCount}` : `${overflowCount} more`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Streak bands: a soft strip over consecutive streak days, a filled dot with the
                challenge icon on check-in days, and a dashed dot on grace days */}
            {streakBands.length > 0 && (
              <View pointerEvents="none" style={[styles.bandLayer, { top: CELL_HEADER_HEIGHT }]}>
                {streakBands.map((challenge, bandIdx) => {
                  const Icon = getStreakIcon(challenge.icon);
                  return getBandSegments(week, challenge.summary.days).map((segment) => (
                    <View
                      key={`${challenge.id}-${segment.start}`}
                      style={[
                        styles.band,
                        {
                          top: bandIdx * bandHeight,
                          height: bandHeight - 2,
                          left: `${(segment.start / 7) * 100}%`,
                          width: `${(segment.statuses.length / 7) * 100}%`,
                        },
                      ]}
                    >
                      <View style={[styles.bandStrip, { backgroundColor: challenge.colorHex + '2E' }]}>
                        {segment.statuses.map((status, i) => (
                          <View key={i} style={styles.bandDay}>
                            {status === 'done' ? (
                              <View
                                style={[
                                  styles.bandDot,
                                  { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: challenge.colorHex },
                                ]}
                              >
                                {!isCompact && <Icon size={10} color="#FFFFFF" strokeWidth={2.5} />}
                              </View>
                            ) : (
                              <View
                                style={[
                                  styles.bandDot,
                                  styles.graceDot,
                                  { width: dotSize, height: dotSize, borderRadius: dotSize / 2, borderColor: challenge.colorHex },
                                ]}
                              />
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  ));
                })}
              </View>
            )}
          </View>
        ))}
      </View>

      {tasks.length === 0 && (
        <View style={styles.emptyStateOverlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.emptyStateContent} onPress={() => onDayClick(currentDate)}>
            <Text style={[styles.emptyStateText, { color: theme.text }]}>No tasks yet</Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.primaryAction }]}>Tap a day to add one</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
  },
  headerCell: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 2,
    alignItems: 'center',
    borderLeftWidth: 1,
  },
  firstColumn: {
    borderLeftWidth: 0,
  },
  headerText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  gridBody: {
    flex: 1,
  },
  weekRow: {
    flex: 1,
    flexDirection: 'row',
    borderBottomWidth: 1,
    minHeight: 64,
  },
  dayCell: {
    flex: 1,
    borderLeftWidth: 1,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  dayCellHeader: {
    height: CELL_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dateBadgeWide: {
    paddingHorizontal: 8,
  },
  dateText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '500',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  eventBar: {
    paddingHorizontal: 6,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventTime: {
    fontFamily: Fonts.body,
    fontSize: 11,
  },
  eventTitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  eventTitleCompact: {
    fontSize: 10,
  },
  completedStrike: {
    textDecorationLine: 'line-through',
  },
  overflowText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  bandLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  band: {
    position: 'absolute',
    paddingHorizontal: 3,
  },
  bandStrip: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 999,
  },
  bandDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandDot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  graceDot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
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
