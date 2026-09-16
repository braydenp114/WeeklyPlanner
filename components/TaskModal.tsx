import React, { useState } from 'react';
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  StyleSheet,
} from 'react-native';

import { useTasks, toDateKey, TaskDraft, TaskItem } from '@/context/TasksContext';
import {
  Colors,
  Fonts,
  Glassmorphism,
  RoundedGeometry,
  TaskCardColors,
  Typography,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAY_ABBREVIATIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MIN_DURATION = 1;
const MAX_DURATION = 12;
const COLOR_KEYS = Object.keys(TaskCardColors) as (keyof typeof TaskCardColors)[];

// The 7 dates (Mon-Sun) of the week that contains `date`.
function getWeekDatesContaining(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d);
  }
  return week;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function TaskModal() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { isModalOpen, modalDraft, selectedTask, addTask, removeTask, closeModal } = useTasks();

  return (
    <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={closeModal}>
      <TouchableWithoutFeedback onPress={closeModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.glassBackground, borderColor: theme.glassBorder, ...Glassmorphism },
              ]}
            >
              {selectedTask ? (
                <TaskDetails task={selectedTask} onDelete={removeTask} onClose={closeModal} />
              ) : modalDraft ? (
                <CreateForm draft={modalDraft} onCreate={addTask} onCancel={closeModal} />
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function CreateForm({
  draft,
  onCreate,
  onCancel,
}: {
  draft: TaskDraft;
  onCreate: (task: Omit<TaskItem, 'id'>) => void;
  onCancel: () => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];

  const weekDates = getWeekDatesContaining(parseDateKey(draft.date));

  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(draft.date);
  const [startHour, setStartHour] = useState(draft.startHour);
  const [durationHours, setDurationHours] = useState(1);
  const [colorKey, setColorKey] = useState<keyof typeof TaskCardColors>(COLOR_KEYS[0]);

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }
    onCreate({
      title: title.trim(),
      date: selectedDate,
      startHour,
      durationHours,
      colorHex: TaskCardColors[colorKey].bg,
      tag: TaskCardColors[colorKey].name,
    });
    onCancel();
  };

  return (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { color: theme.text }]}>New Task</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={[styles.closeText, { color: theme.textSecondary }]}>×</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>TITLE</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surfaceContainer,
            color: theme.text,
            borderColor: theme.outlineVariant,
          },
        ]}
        placeholder="What are you planning?"
        placeholderTextColor={theme.textMuted}
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DAY</Text>
      <View style={styles.dayRow}>
        {weekDates.map((date, idx) => {
          const dateKey = toDateKey(date);
          const isSelected = selectedDate === dateKey;
          return (
            <TouchableOpacity
              key={dateKey}
              onPress={() => setSelectedDate(dateKey)}
              style={[
                styles.dayChip,
                { borderColor: theme.outlineVariant },
                isSelected && { backgroundColor: theme.primaryAction, borderColor: theme.primaryAction },
              ]}
            >
              <Text style={[styles.dayChipText, { color: isSelected ? '#FFFFFF' : theme.textSecondary }]}>
                {DAY_ABBREVIATIONS[idx]} {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.stepperRow}>
        <View style={styles.stepperGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>START</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepperButton, { backgroundColor: theme.surfaceContainer }]}
              onPress={() => setStartHour((h) => (h + 23) % 24)}
            >
              <Text style={[styles.stepperButtonText, { color: theme.text }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: theme.text }]}>
              {String(startHour).padStart(2, '0')}:00
            </Text>
            <TouchableOpacity
              style={[styles.stepperButton, { backgroundColor: theme.surfaceContainer }]}
              onPress={() => setStartHour((h) => (h + 1) % 24)}
            >
              <Text style={[styles.stepperButtonText, { color: theme.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stepperGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DURATION</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepperButton, { backgroundColor: theme.surfaceContainer }]}
              onPress={() => setDurationHours((d) => Math.max(MIN_DURATION, d - 1))}
            >
              <Text style={[styles.stepperButtonText, { color: theme.text }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: theme.text }]}>{durationHours}h</Text>
            <TouchableOpacity
              style={[styles.stepperButton, { backgroundColor: theme.surfaceContainer }]}
              onPress={() => setDurationHours((d) => Math.min(MAX_DURATION, d + 1))}
            >
              <Text style={[styles.stepperButtonText, { color: theme.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>COLOUR</Text>
      <View style={styles.colorRow}>
        {COLOR_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setColorKey(key)}
            style={[
              styles.colorSwatch,
              { backgroundColor: TaskCardColors[key].bg, borderColor: theme.text },
              colorKey === key && styles.colorSwatchSelected,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: theme.primaryAction },
          !title.trim() && styles.primaryButtonDisabled,
        ]}
        activeOpacity={0.85}
        onPress={handleCreate}
        disabled={!title.trim()}
      >
        <Text style={styles.primaryButtonText}>Create Task</Text>
      </TouchableOpacity>
    </>
  );
}

function TaskDetails({
  task,
  onDelete,
  onClose,
}: {
  task: TaskItem;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const date = parseDateKey(task.date);
  const endHour = (task.startHour + task.durationHours) % 24;

  return (
    <>
      <View style={styles.headerRow}>
        <View style={[styles.tagDot, { backgroundColor: task.colorHex }]} />
        <Text style={[styles.headerText, { color: theme.text, flex: 1 }]} numberOfLines={1}>
          {task.title}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.closeText, { color: theme.textSecondary }]}>×</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.detailText, { color: theme.textSecondary }]}>
        {DAY_ABBREVIATIONS[(date.getDay() + 6) % 7]} {date.getDate()} • {String(task.startHour).padStart(2, '0')}:00 –{' '}
        {String(endHour).padStart(2, '0')}:00
      </Text>
      <Text style={[styles.detailText, { color: theme.textMuted, marginBottom: 20 }]}>{task.tag}</Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.error }]}
        activeOpacity={0.85}
        onPress={() => {
          onDelete(task.id);
          onClose();
        }}
      >
        <Text style={styles.primaryButtonText}>Delete Task</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RoundedGeometry.xl,
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineMobile.fontSize,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 24,
    lineHeight: 24,
    marginLeft: 12,
  },
  fieldLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 14,
    borderRadius: RoundedGeometry.default,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RoundedGeometry.default,
    borderWidth: 1,
  },
  dayChipText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stepperGroup: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: RoundedGeometry.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepperValue: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0,
  },
  colorSwatchSelected: {
    borderWidth: 2,
  },
  primaryButton: {
    borderRadius: RoundedGeometry.default,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tagDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  detailText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginBottom: 4,
  },
});
