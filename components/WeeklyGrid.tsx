import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Pressable,
  PanResponder,
} from 'react-native';

import { useNav } from '@/context/NavContext';
import { useTasks } from '@/context/TaskContext';
import { NavIcon } from '@/components/NavIcon';
import {
  Colors,
  Fonts,
  Glassmorphism,
  RoundedGeometry,
  Typography,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const hours = Array.from({ length: 24 }, (_, i) => i);
const rowHeight = 52;

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
const dayNumFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric' });
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

function GridCell({
  dayIndex,
  hour,
  borderColor,
  onLongPressComplete,
}: {
  dayIndex: number;
  hour: number;
  borderColor: string;
  onLongPressComplete: (dayIndex: number, hour: number, durationHours: number) => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressing = useRef(false);
  const startY = useRef(0);

  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- PanResponder handlers only run as event callbacks, never during render
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          isLongPressing.current = false;
          startY.current = evt.nativeEvent.pageY;
          pressTimer.current = setTimeout(() => {
            isLongPressing.current = true;
          }, 350);
        },
        onPanResponderRelease: (evt) => {
          if (pressTimer.current) clearTimeout(pressTimer.current);
          if (isLongPressing.current) {
            const dy = evt.nativeEvent.pageY - startY.current;
            const extraHours = Math.max(0, Math.round(dy / rowHeight));
            onLongPressComplete(dayIndex, hour, 1 + extraHours);
          }
        },
        onPanResponderTerminate: () => {
          if (pressTimer.current) clearTimeout(pressTimer.current);
        },
      }),
    [dayIndex, hour, onLongPressComplete]
  );

  return <View {...panResponder.panHandlers} style={[styles.hourCell, { borderColor }]} />;
}

export default function WeeklyGrid() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { isDesktop, setIsMobileMenuOpen } = useNav();
  const { tasks, addTask, updateTask } = useTasks();
  const [selectedTagFilter] = useState<string | null>(null);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pendingDayIndex, setPendingDayIndex] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('study');
  const [tagOptions, setTagOptions] = useState(['study', 'workout', 'work', 'personal']);
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [customTagText, setCustomTagText] = useState('');
  const [newStartHour, setNewStartHour] = useState(9);
  const [newDurationMinutes, setNewDurationMinutes] = useState(60);
  const [taskMode, setTaskMode] = useState<'new' | 'existing'>('new');
  const [selectedExistingTaskId, setSelectedExistingTaskId] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const weekDates = getWeekDates(weekOffset);
  const firstDay = weekDates[0];

  const filteredTasks = selectedTagFilter
    ? tasks.filter((t) => t.colorHex === selectedTagFilter)
    : tasks;

  const unscheduledTasks = tasks.filter((t) => t.dayIndex === undefined);

  const openAddModal = (dayIndex: number, hour: number, duration: number) => {
    setPendingDayIndex(dayIndex);
    setNewTitle('');
    setNewTag('study');
    setShowCustomTagInput(false);
    setCustomTagText('');
    setNewStartHour(hour);
    setNewDurationMinutes(Math.max(15, Math.round((duration * 60) / 15) * 15));
    setTaskMode('new');
    setSelectedExistingTaskId(null);
    setAddModalVisible(true);
  };

  const confirmCustomTag = () => {
    if (!customTagText) return;
    setTagOptions((prev) => [...prev, customTagText]);
    setNewTag(customTagText);
    setCustomTagText('');
    setShowCustomTagInput(false);
  };

  const confirmAddTask = () => {
    if (pendingDayIndex === null) return;
    const duration = newDurationMinutes / 60;

    if (taskMode === 'existing') {
      if (!selectedExistingTaskId) return;
      updateTask(selectedExistingTaskId, {
        dayIndex: pendingDayIndex,
        startHour: newStartHour,
        durationHours: duration,
      });
    } else {
      if (!newTitle) return;
      addTask({
        title: newTitle,
        dayIndex: pendingDayIndex,
        startHour: newStartHour,
        durationHours: duration,
        colorHex: '#4A90D9',
        tag: newTag,
      });
    }
    setAddModalVisible(false);
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.topBar,
          { backgroundColor: theme.glassBackground, borderColor: theme.glassBorder },
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
            onPress={() => setWeekOffset((prev) => prev - 1)}
            style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer }]}
          >
            <Text style={[styles.arrowText, { color: theme.text }]}>‹</Text>
          </TouchableOpacity>

          <Text style={[styles.dateLabel, { color: theme.text }]}>
            {monthYearFormatter.format(firstDay)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setWeekOffset((prev) => prev + 1)}
            style={[styles.arrowButton, { backgroundColor: theme.surfaceContainer }]}
          >
            <Text style={[styles.arrowText, { color: theme.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightHeaderGroup}>
          <View
            style={[
              styles.timePill,
              { backgroundColor: theme.surfaceContainerHigh, borderColor: theme.outlineVariant },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: theme.primaryAction }]} />
            <Text style={[styles.timePillText, { color: theme.text }]}>
              {timeFormatter.format(currentDate)} • {timeZone}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.headerRowContainer,
          { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant },
        ]}
      >
        <View style={[styles.timeColumnHeaderSpacer, { borderColor: theme.outlineVariant }]} />
        <View style={styles.dayHeaderRow}>
          {weekDates.map((date) => {
            const isTodayDate = date.toDateString() === currentDate.toDateString();
            return (
              <View
                key={date.toISOString()}
                style={[
                  styles.dayHeaderCell,
                  { borderColor: theme.outlineVariant },
                  isTodayDate && { backgroundColor: theme.surfaceContainerHighest },
                ]}
              >
                <Text style={[styles.dayHeaderName, { color: theme.textSecondary }]}>
                  {dayFormatter.format(date).toUpperCase()}
                </Text>
                <View style={[styles.dayNumberBadge, isTodayDate && { backgroundColor: theme.primaryAction }]}>
                  <Text style={[styles.dayHeaderNumber, { color: isTodayDate ? '#FFFFFF' : theme.text }]}>
                    {dayNumFormatter.format(date)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={[styles.timelineScroll, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
      >
        <View style={styles.gridBody}>
          <View
            style={[styles.timeColumn, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}
          >
            {hours.map((hour) => (
              <View key={hour} style={styles.timeSlot}>
                <Text style={[styles.timeLabelText, { color: theme.textMuted }]}>
                  {String(hour).padStart(2, '0')}:00
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.daysRow}>
            {weekDates.map((date, dayIdx) => (
              <View key={`${date.toISOString()}-column`} style={[styles.dayColumn, { borderColor: theme.outlineVariant }]}>
                {hours.map((hour) => (
                  <GridCell
                    key={`${date.toISOString()}-${hour}`}
                    dayIndex={dayIdx}
                    hour={hour}
                    borderColor={theme.outlineVariant}
                    onLongPressComplete={openAddModal}
                  />
                ))}

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

                {filteredTasks
                  .filter((task) => task.dayIndex === dayIdx)
                  .map((task) => {
                    const topOffset = (task.startHour ?? 0) * rowHeight;
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

      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.background }]} onPress={() => {}}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.backButton}>
                <Text style={[styles.backButtonText, { color: theme.primaryAction }]}>‹ Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Schedule task</Text>
              <View style={styles.backButtonSpacer} />
            </View>

            <View style={styles.modeRow}>
              <TouchableOpacity
                onPress={() => setTaskMode('new')}
                style={[
                  styles.modeChip,
                  { borderColor: theme.outlineVariant },
                  taskMode === 'new' && { backgroundColor: theme.primaryAction },
                ]}
              >
                <Text style={{ color: taskMode === 'new' ? '#FFFFFF' : theme.text }}>New task</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTaskMode('existing')}
                style={[
                  styles.modeChip,
                  { borderColor: theme.outlineVariant },
                  taskMode === 'existing' && { backgroundColor: theme.primaryAction },
                ]}
              >
                <Text style={{ color: taskMode === 'existing' ? '#FFFFFF' : theme.text }}>Existing task</Text>
              </TouchableOpacity>
            </View>

            {taskMode === 'new' ? (
              <>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.outlineVariant }]}
                  placeholder="Task title"
                  placeholderTextColor={theme.textMuted}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Category</Text>
                <View style={styles.tagRow}>
                  {tagOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setNewTag(option)}
                      style={[
                        styles.tagChip,
                        { borderColor: theme.outlineVariant },
                        newTag === option && { backgroundColor: theme.primaryAction },
                      ]}
                    >
                      <Text style={{ color: newTag === option ? '#FFFFFF' : theme.text }}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => setShowCustomTagInput(true)}
                    style={[styles.tagChip, { borderColor: theme.outlineVariant }]}
                  >
                    <Text style={{ color: theme.text }}>+</Text>
                  </TouchableOpacity>
                </View>

                {showCustomTagInput && (
                  <View style={styles.customTagRow}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, color: theme.text, borderColor: theme.outlineVariant }]}
                      placeholder="New category"
                      placeholderTextColor={theme.textMuted}
                      value={customTagText}
                      onChangeText={setCustomTagText}
                    />
                    <TouchableOpacity onPress={confirmCustomTag} style={styles.smallConfirmButton}>
                      <Text style={{ color: '#FFFFFF' }}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.existingList}>
                {unscheduledTasks.length === 0 ? (
                  <Text style={{ color: theme.textMuted }}>No unscheduled tasks to assign.</Text>
                ) : (
                  unscheduledTasks.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setSelectedExistingTaskId(t.id)}
                      style={[
                        styles.existingRow,
                        { borderColor: theme.outlineVariant },
                        selectedExistingTaskId === t.id && { backgroundColor: theme.primaryAction },
                      ]}
                    >
                      <Text style={{ color: selectedExistingTaskId === t.id ? '#FFFFFF' : theme.text }}>
                        {t.title} ({t.tag})
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Start hour</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.outlineVariant }]}
              keyboardType="numeric"
              value={String(newStartHour)}
              onChangeText={(text) => setNewStartHour(Number(text) || 0)}
            />

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Duration</Text>
            <View style={styles.durationRow}>
              <TouchableOpacity
                onPress={() => setNewDurationMinutes((m) => Math.max(15, m - 15))}
                style={[styles.stepperButton, { borderColor: theme.outlineVariant }]}
              >
                <Text style={[styles.stepperButtonText, { color: theme.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.durationText, { color: theme.text }]}>
                {Math.floor(newDurationMinutes / 60)}h {newDurationMinutes % 60}m
              </Text>
              <TouchableOpacity
                onPress={() => setNewDurationMinutes((m) => m + 15)}
                style={[styles.stepperButton, { borderColor: theme.outlineVariant }]}
              >
                <Text style={[styles.stepperButtonText, { color: theme.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={confirmAddTask} style={[styles.confirmButton, { backgroundColor: theme.primaryAction }]}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RoundedGeometry.default,
    borderWidth: 1,
    marginBottom: 8,
    ...Glassmorphism,
  },
  navGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrowButton: { width: 28, height: 28, borderRadius: RoundedGeometry.sm, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: Fonts.mono, fontSize: 18, fontWeight: '600', lineHeight: 20 },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RoundedGeometry.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  todayText: { fontFamily: Fonts.mono, fontSize: 12, fontWeight: '600' },
  dateLabel: { fontFamily: Fonts.headline, fontSize: Typography.headlineMobile.fontSize, fontWeight: '600' },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RoundedGeometry.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  timePillText: { fontFamily: Fonts.mono, fontSize: Typography.labelSm.fontSize, fontWeight: '500' },
  rightHeaderGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRowContainer: { flexDirection: 'row', borderWidth: 1, borderRadius: RoundedGeometry.default, overflow: 'hidden' },
  timeColumnHeaderSpacer: { width: 54, borderRightWidth: 1 },
  dayHeaderRow: { flex: 1, flexDirection: 'row' },
  dayHeaderCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRightWidth: 1 },
  dayHeaderName: { fontFamily: Fonts.mono, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  dayNumberBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dayHeaderNumber: { fontFamily: Fonts.headline, fontSize: 22, fontWeight: '700' },
  timelineScroll: { flex: 1, marginTop: 4 },
  timelineContent: { paddingBottom: 24 },
  gridBody: { flexDirection: 'row', minHeight: 24 * rowHeight },
  timeColumn: { width: 54, borderRightWidth: 1 },
  timeSlot: { height: rowHeight, justifyContent: 'center', alignItems: 'center' },
  timeLabelText: { fontFamily: Fonts.mono, fontSize: Typography.labelSm.fontSize },
  daysRow: { flex: 1, flexDirection: 'row', position: 'relative' },
  dayColumn: { flex: 1, borderRightWidth: 1, position: 'relative' },
  hourCell: { height: rowHeight, borderBottomWidth: 1 },
  taskCard: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: RoundedGeometry.default,
    padding: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'space-between',
  },
  taskCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  taskTimeText: { fontFamily: Fonts.mono, fontSize: 10, fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)' },
  taskTitleText: { fontFamily: Fonts.body, fontSize: Typography.bodySm.fontSize, fontWeight: '600', color: '#FFFFFF', marginTop: 4 },
  currentTimeLine: { position: 'absolute', left: 0, right: 0, height: 2, zIndex: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { minWidth: 60 },
  backButtonText: { fontSize: 16, fontWeight: '600' },
  backButtonSpacer: { minWidth: 60 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalLabel: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  customTagRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  smallConfirmButton: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  existingList: { gap: 8, marginBottom: 8 },
  existingRow: { borderWidth: 1, borderRadius: 8, padding: 10 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperButtonText: { fontSize: 20, fontWeight: '600' },
  durationText: { fontSize: 16, fontWeight: '600', minWidth: 70, textAlign: 'center' },
  confirmButton: { marginTop: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontWeight: '600' },
});
