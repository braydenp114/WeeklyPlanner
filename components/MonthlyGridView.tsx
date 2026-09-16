import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TaskItem, HoverableTaskCard, getPastEventStyle } from '@/components/WeeklyGrid';
import { AnchorRect } from './ui/TimeDropdown';

interface MonthlyGridViewProps {
  dates: Date[]; // Should be a flat array of 35 or 42 dates covering the month
  currentDate: Date;
  tasks: TaskItem[];
  onDayClick: (date: Date) => void;
  onTaskClick?: (task: TaskItem, anchor: AnchorRect) => void;
}

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
const dayNumFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric' });

// A helper to determine if a date is in the same month as the primary month we're viewing
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

function isToday(date: Date, currentDate: Date) {
  return (
    date.getDate() === currentDate.getDate() &&
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear()
  );
}

/**
 * Formats a fractional startHour into a human-readable time string (e.g. "9:30a").
 */
function formatHourLabel(startHour: number): string {
  const h = Math.floor(startHour);
  const m = Math.round((startHour % 1) * 60);
  const period = h >= 12 ? 'p' : 'a';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m > 0 ? `${displayH}:${String(m).padStart(2, '0')}${period}` : `${displayH}${period}`;
}

export default function MonthlyGridView({ dates, currentDate, tasks, onDayClick, onTaskClick }: MonthlyGridViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];

  if (!dates || dates.length === 0) return null;

  // The 'primary' month is usually the month of the middle date in our grid
  const primaryMonthDate = dates[Math.floor(dates.length / 2)];

  // Group dates into weeks (rows)
  const weeks: Date[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  // Get headers from the first week
  const headers = weeks[0].map((date) => dayFormatter.format(date).toUpperCase());

  // Function to filter and sort tasks for a specific date using actual calendar date matching
  const getTasksForDate = (date: Date) => {
    const dayTasks = tasks.filter(t => isSameDay(t.actualDate, date));
    // Sort: all-day tasks first, then by startHour
    return dayTasks.sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return a.startHour - b.startHour;
    });
  };

  return (
    <View style={styles.container}>
      {/* Header Row (MON - SUN) */}
      <View style={[styles.headerRow, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
        {headers.map((header, idx) => (
          <View key={idx} style={[styles.headerCell, { borderColor: theme.outlineVariant }, idx === headers.length - 1 && { borderRightWidth: 0 }]}>
            <Text style={[styles.headerText, { color: theme.textSecondary }]}>{header}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <ScrollView style={[styles.gridScroll, { backgroundColor: theme.background }]} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.gridBody}>
          {weeks.map((week, weekIdx) => (
            <View key={weekIdx} style={[styles.weekRow, { borderColor: theme.outlineVariant }, weekIdx === 0 && { borderTopWidth: 1 }]}>
              {week.map((date, dayIdx) => {
                const isCurrentMonth = isSameMonth(date, primaryMonthDate);
                const isDayToday = isToday(date, currentDate);
                const dayTasks = getTasksForDate(date);
                
                // Cap visible events
                const MAX_VISIBLE_EVENTS = 4;
                const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_EVENTS);
                const overflowCount = dayTasks.length - MAX_VISIBLE_EVENTS;

                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    activeOpacity={0.7}
                    onPress={() => onDayClick(date)}
                    style={[
                      styles.dayCell,
                      { borderColor: theme.outlineVariant },
                      dayIdx === 0 && { borderLeftWidth: 1 },
                      isDayToday && { backgroundColor: theme.surfaceContainerHighest },
                    ]}
                  >
                    <View style={styles.dayCellHeader}>
                      <View
                        style={[
                          styles.dateBadge,
                          isDayToday && { backgroundColor: theme.primaryAction },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateText,
                            { color: isDayToday ? '#FFFFFF' : (isCurrentMonth ? theme.text : theme.textMuted) },
                          ]}
                        >
                          {dayNumFormatter.format(date)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.eventsContainer}>
                      {visibleTasks.map(task => {
                        const isPast = task.originalTaskData.endDate.toDate().getTime() < currentDate.getTime();
                        const pastDotStyle = getPastEventStyle(isPast, task.colorHex);
                        
                        return (
                          <HoverableTaskCard 
                            key={task.id} 
                            task={task}
                            style={styles.eventRow}
                            onPress={(t, rect) => {
                              onTaskClick?.(t, rect);
                            }}
                          >
                            <View style={[styles.eventDot, pastDotStyle]} />
                            {task.isAllDay ? (
                              <Text style={[styles.eventTitle, { color: isCurrentMonth ? (isPast ? theme.textMuted : theme.text) : theme.textMuted }]} numberOfLines={1}>
                                {task.title}
                              </Text>
                            ) : (
                              <>
                                <Text style={[styles.eventTime, { color: isCurrentMonth ? (isPast ? 'rgba(118,117,134,0.5)' : theme.textMuted) : 'rgba(118,117,134,0.5)' }]} numberOfLines={1}>
                                  {formatHourLabel(task.startHour)}
                                </Text>
                                <Text style={[styles.eventTitle, { color: isCurrentMonth ? (isPast ? theme.textMuted : theme.text) : theme.textMuted }]} numberOfLines={1}>
                                  {task.title}
                                </Text>
                              </>
                            )}
                          </HoverableTaskCard>
                        );
                      })}
                      {overflowCount > 0 && (
                        <Text style={[styles.overflowText, { color: theme.textMuted }]}>
                          +{overflowCount} more
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

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
    minWidth: 700, // Ensure it doesn't squish too much, forces horizontal scroll if needed
  },
  headerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: RoundedGeometry.default,
    overflow: 'hidden',
    marginBottom: 4,
  },
  headerCell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  headerText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  gridScroll: {
    flex: 1,
  },
  gridBody: {
    flex: 1,
    borderColor: 'transparent',
  },
  weekRow: {
    flexDirection: 'row',
    flex: 1,
    minHeight: 120, // fixed minimum height for week rows
  },
  dayCell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    padding: 6,
    overflow: 'hidden', // prevent events from spilling out
  },
  dayCellHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  dateBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontFamily: Fonts.headline,
    fontSize: 14,
    fontWeight: '600',
  },
  eventsContainer: {
    flex: 1,
    gap: 3,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventTime: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    width: 28,
  },
  eventTitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    flex: 1,
  },
  overflowText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
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