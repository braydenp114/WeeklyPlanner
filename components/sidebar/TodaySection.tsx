import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Circle, CircleCheck, Flag } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { getTasksForRange, Task, updateTask } from '@/services/tasksService';
import { PRIORITY_META } from '@/utils/priority';
import { buildTodayList, OVERDUE_LOOKBACK_DAYS } from '@/utils/todayList';
import { formatShortTime } from '../calendar-shared';
import { SidebarSection } from './SidebarSection';

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' });

/**
 * "Today" panel: today's calendar tasks (P1 first, then by time) that can be ticked off
 * from the sidebar, plus unfinished tasks from the last week under "Overdue".
 */
export function TodaySection({ onOpenTask }: { onOpenTask?: () => void }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user, loading: authLoading } = useAuth();
  const { taskRefreshKey, refreshTasks, openEditTaskModal } = useNav();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - OVERDUE_LOOKBACK_DAYS);
    start.setHours(0, 0, 0, 0);
    try {
      setTasks(await getTasksForRange(start, end));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load today');
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.resolve().then(reload);
  }, [authLoading, user, reload, taskRefreshKey]);

  const { today, overdue } = useMemo(() => buildTodayList(tasks), [tasks]);

  const toggle = async (task: Task) => {
    if (!task.id) return;
    const next = !task.completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: next } : t)));
    try {
      await updateTask(task.id, { completed: next });
      refreshTasks(); // the calendar shows the tick too
    } catch (e: any) {
      setError(e.message || 'Failed to update task');
      reload();
    }
  };

  const renderItem = (task: Task, showDay: boolean) => {
    const start = task.startDate.toDate();
    const Check = task.completed ? CircleCheck : Circle;
    const meta = task.priority ? PRIORITY_META[task.priority] : null;
    const when = task.allDay ? 'All day' : formatShortTime(start);
    return (
      <View key={task.id} style={styles.item}>
        <TouchableOpacity
          onPress={() => toggle(task)}
          hitSlop={8}
          accessibilityLabel={task.completed ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
        >
          <Check size={18} color={task.completed ? theme.primaryAction : theme.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.itemText}
          onPress={() => {
            onOpenTask?.();
            openEditTaskModal(task, 'this');
          }}
        >
          <Text
            style={[styles.itemTitle, { color: task.completed ? theme.textMuted : theme.text }, task.completed && styles.strike]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <Text style={[styles.itemMeta, { color: showDay ? theme.error : theme.textSecondary }]}>
            {showDay ? `${dayFormatter.format(start)} · ${when}` : when}
          </Text>
        </TouchableOpacity>
        {meta && <Flag size={14} color={meta.colorHex} fill={meta.colorHex} strokeWidth={2} />}
        <View style={[styles.colorDot, { backgroundColor: task.colorHex }]} />
      </View>
    );
  };

  const openCount = today.filter((t) => !t.completed).length;

  return (
    <SidebarSection title={openCount > 0 ? `Today (${openCount})` : 'Today'}>
      {!!error && <Text style={[styles.note, { color: theme.error }]}>{error}</Text>}
      {today.length === 0 && <Text style={[styles.note, { color: theme.textMuted }]}>Nothing scheduled today.</Text>}
      {today.map((t) => renderItem(t, false))}
      {overdue.length > 0 && (
        <>
          <Text style={[styles.groupLabel, { color: theme.error }]}>Overdue</Text>
          {overdue.map((t) => renderItem(t, true))}
        </>
      )}
    </SidebarSection>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  itemMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  groupLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  note: {
    fontFamily: Fonts.body,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
