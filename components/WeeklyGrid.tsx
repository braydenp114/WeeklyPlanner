import React, { useState, useEffect } from 'react';
import {
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
import {
  Colors,
  Fonts,
  Glassmorphism,
  RoundedGeometry,
  TaskCardColors,
  Typography,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

function getWeekDates(offsetWeeks = 0) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + offsetWeeks * 7);
  const start = getStartOfWeek(targetDate);

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
}

export type TaskItem = {
  id: string;
  title: string;
  dayIndex: number;
  startHour: number;
  durationHours: number;
  colorHex: string;
  tag: string;
};

const initialSampleTasks: TaskItem[] = [];

/**
 * The main grid component displaying a weekly view of tasks.
 * It features a scrollable hourly timeline and date headers.
 */
export default function WeeklyGrid() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user, signOutUser } = useAuth();
  const { isDesktop, setIsMobileMenuOpen } = useNav();
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [weekOffset, setWeekOffset] = useState(0);

  const [gridHeight, setGridHeight] = useState(0);

  const rowHeight = gridHeight > 0 ? gridHeight / 24 : 52;

  useEffect(() => {
    // Update the current time every minute to keep the "current time" line accurate
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  const weekDates = getWeekDates(weekOffset);
  const firstDay = weekDates[0];
  const lastDay = weekDates[6];

  const filteredTasks = selectedTagFilter
    ? initialSampleTasks.filter((t) => t.colorHex === selectedTagFilter)
    : initialSampleTasks;

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
            onPress={() => setWeekOffset(0)}
            style={[styles.todayButton, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
          >
            <Text style={[styles.todayText, { color: theme.text }]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setWeekOffset(prev => prev - 1)}
            style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer }]}
          >
            <Text style={[styles.arrowText, { color: theme.text }]}>‹</Text>
          </TouchableOpacity>

          <Text style={[styles.dateLabel, { color: theme.text }]}>
            {monthYearFormatter.format(firstDay)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setWeekOffset(prev => prev + 1)}
            style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer }]}
          >
            <Text style={[styles.arrowText, { color: theme.text }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Days Header Row */}
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

      {/* Scrollable Hourly Timeline */}
      <View
        style={[styles.timelineScroll, { backgroundColor: theme.background }]}
        onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}
      >
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
                  <View
                    key={`${date.toISOString()}-${hour}`}
                    style={[styles.hourCell, { borderColor: theme.outlineVariant, height: rowHeight }]}
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
                {filteredTasks
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
                            {String(task.startHour).padStart(2, '0')}:00
                          </Text>
                        </View>

                        <Text style={styles.taskTitleText} numberOfLines={2}>
                          {task.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            ))}
          </View>
        </View>
      </View>
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
  paletteFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  paletteLabel: {
    fontFamily: Fonts.mono,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  paletteChip: {
    borderRadius: RoundedGeometry.default, // 8px base radius
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteChipText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '500',
  },
  paletteChipTextWhite: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  },
  dayHeaderCell: {
    flex: 1,
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
  timelineContent: {
    paddingBottom: 24,
  },
  gridBody: {
    flexDirection: 'row',
    flex: 1,
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
});
