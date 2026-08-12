import React, { useState } from 'react';
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
const rowHeight = 52;

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
const dayNumFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric' });
const monthDayFormatter = new Intl.DateTimeFormat(locale, {
  month: 'short',
  day: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat(locale, {
  hour: 'numeric',
  minute: '2-digit',
});

function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getWeekDates() {
  const today = new Date();
  const start = getStartOfWeek(today);

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
}

export type TaskItem = {
  id: string;
  title: string;
  dayIndex: number; // 0 to 6 (Mon to Sun)
  startHour: number;
  durationHours: number;
  colorHex: string;
  tag: string;
};

const initialSampleTasks: TaskItem[] = [];

export default function WeeklyGrid() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user, signOutUser } = useAuth();
  const { isDesktop, setIsMobileMenuOpen } = useNav();
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const currentDate = new Date();
  const weekDates = getWeekDates();
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
            style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer }]}
          >
            <Text style={[styles.arrowText, { color: theme.text }]}>‹</Text>
          </TouchableOpacity>

          <Text style={[styles.dateLabel, { color: theme.text }]}>
            {monthDayFormatter.format(firstDay)} — {monthDayFormatter.format(lastDay)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer }]}
          >
            <Text style={[styles.arrowText, { color: theme.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightHeaderGroup}>
          <View
            style={[
              styles.timePill,
              {
                backgroundColor: theme.surfaceContainerHigh,
                borderColor: theme.outlineVariant,
              },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: theme.primaryAction }]} />
            <Text style={[styles.timePillText, { color: theme.text }]}>
              {timeFormatter.format(currentDate)} • {timeZone}
            </Text>
          </View>

          {user ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSignOut}
              style={[
                styles.authPill,
                {
                  backgroundColor: theme.surfaceContainer,
                  borderColor: theme.outlineVariant,
                },
              ]}
            >
              <Text style={[styles.userEmailText, { color: theme.text }]} numberOfLines={1}>
                {user.email || 'User'}
              </Text>
              <Text style={[styles.signOutText, { color: theme.primaryAction }]}>Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/login')}
              style={[
                styles.authPill,
                {
                  backgroundColor: theme.primaryAction,
                  borderColor: 'transparent',
                },
              ]}
            >
              <Text style={[styles.signOutText, { color: '#FFFFFF' }]}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Task Card Spectrum Palette Selector Bar */}
      <View style={styles.paletteFilterRow}>
        <Text style={[styles.paletteLabel, { color: theme.textSecondary }]}>CARD THEMES:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setSelectedTagFilter(null)}
            style={[
              styles.paletteChip,
              {
                backgroundColor:
                  selectedTagFilter === null ? theme.primaryAction : theme.surfaceContainer,
                borderColor: theme.outlineVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.paletteChipText,
                { color: selectedTagFilter === null ? '#FFFFFF' : theme.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {Object.values(TaskCardColors).map((cardColor) => {
            const isSelected = selectedTagFilter === cardColor.bg;
            return (
              <TouchableOpacity
                key={cardColor.name}
                onPress={() => setSelectedTagFilter(isSelected ? null : cardColor.bg)}
                style={[
                  styles.paletteChip,
                  {
                    backgroundColor: cardColor.bg,
                    borderColor: isSelected ? theme.text : 'transparent',
                    borderWidth: isSelected ? 2 : 0,
                  },
                ]}
              >
                <Text style={styles.paletteChipTextWhite}>{cardColor.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
      <ScrollView
        style={[styles.timelineScroll, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
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
            {hours.map((hour) => (
              <View key={hour} style={styles.timeSlot}>
                <Text style={[styles.timeLabelText, { color: theme.textMuted }]}>
                  {String(hour).padStart(2, '0')}:00
                </Text>
              </View>
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
                    style={[styles.hourCell, { borderColor: theme.outlineVariant }]}
                  />
                ))}

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
      </ScrollView>
    </View>
  );
}

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
  dateLabel: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineMobile.fontSize - 6,
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
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dayHeaderNumber: {
    fontFamily: Fonts.headline,
    fontSize: 14,
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
    minHeight: 24 * rowHeight,
  },
  timeColumn: {
    width: 54,
    borderRightWidth: 1,
  },
  timeSlot: {
    height: rowHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeLabelText: {
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
    height: rowHeight,
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
});
