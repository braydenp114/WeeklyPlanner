import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { CalendarArrowUp, Circle, CircleCheck, X } from 'lucide-react-native';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { getTasksForRange, Task, updateTask } from '@/services/tasksService';
import { findUnfinishedFromLastWeek, rolloverTarget, startOfWeek, weekKey } from '@/utils/rollover';
import { formatShortTime } from './calendar-shared';

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const storageKey = (now: Date) => `rollover-dismissed-${weekKey(now)}`;

/**
 * Shown at the top of this week's Week view when last week left unfinished one-off tasks.
 * The user picks which ones to carry over; they move to the same weekday this week,
 * or to today if that day has already passed. Answering hides the banner for the week.
 */
export function RolloverBanner() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user, loading: authLoading } = useAuth();
  const { taskRefreshKey, refreshTasks } = useNav();
  const [unfinished, setUnfinished] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    const load = async () => {
      const now = new Date();
      if (await AsyncStorage.getItem(storageKey(now)).catch(() => null)) return [];
      const thisWeek = startOfWeek(now);
      const lastWeek = new Date(thisWeek);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const tasks = await getTasksForRange(lastWeek, new Date(thisWeek.getTime() - 1));
      return findUnfinishedFromLastWeek(tasks, now);
    };
    load()
      .then((list) => {
        if (cancelled) return;
        setUnfinished(list);
        setSelected(new Set(list.map((t) => t.id!).filter(Boolean)));
      })
      .catch(() => {
        // The banner is a helper; if loading fails the calendar still works
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, taskRefreshKey]);

  if (unfinished.length === 0) return null;

  const dismiss = async () => {
    setOpen(false);
    setUnfinished([]);
    await AsyncStorage.setItem(storageKey(new Date()), '1').catch(() => {});
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moveSelected = async () => {
    setBusy(true);
    setError(null);
    try {
      const now = new Date();
      for (const task of unfinished) {
        if (!task.id || !selected.has(task.id)) continue;
        const start = task.startDate.toDate();
        const duration = task.endDate.toDate().getTime() - start.getTime();
        const newStart = rolloverTarget(start, now);
        await updateTask(task.id, {
          startDate: Timestamp.fromDate(newStart),
          endDate: Timestamp.fromDate(new Date(newStart.getTime() + duration)),
        });
      }
      await dismiss(); // remember the answer before the refresh reloads the banner
      refreshTasks();
    } catch (e: any) {
      setError(e.message || 'Failed to move tasks');
    } finally {
      setBusy(false);
    }
  };

  const count = unfinished.length;

  return (
    <>
      <View style={[styles.banner, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}>
        <CalendarArrowUp size={18} color={theme.primaryAction} strokeWidth={2} />
        <Text style={[styles.bannerText, { color: theme.text }]} numberOfLines={2}>
          {count === 1 ? '1 unfinished task from last week' : `${count} unfinished tasks from last week`}
        </Text>
        <TouchableOpacity onPress={() => setOpen(true)} style={[styles.reviewButton, { backgroundColor: theme.primaryAction }]}>
          <Text style={styles.reviewText}>Review</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={dismiss} hitSlop={8} accessibilityLabel="Dismiss carry-over">
          <X size={16} color={theme.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => setOpen(false)}>
            <View style={styles.scrim} />
          </TouchableWithoutFeedback>
          <View style={[styles.sheet, { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Carry over to this week</Text>
            <Text style={[styles.sheetHint, { color: theme.textSecondary }]}>
              Same day and time this week, or today if that day has passed.
            </Text>
            <ScrollView style={styles.list}>
              {unfinished.map((task) => {
                const checked = !!task.id && selected.has(task.id);
                const Check = checked ? CircleCheck : Circle;
                const start = task.startDate.toDate();
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.item}
                    onPress={() => task.id && toggle(task.id)}
                    accessibilityLabel={`Carry over ${task.title}`}
                  >
                    <Check size={18} color={checked ? theme.primaryAction : theme.textSecondary} strokeWidth={2} />
                    <View style={[styles.dot, { backgroundColor: task.colorHex }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
                        {task.title}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                        {dayFormatter.format(start)}
                        {task.allDay ? '' : ` · ${formatShortTime(start)}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {!!error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity onPress={dismiss} style={styles.textButton}>
                <Text style={[styles.textButtonLabel, { color: theme.textSecondary }]}>Leave them</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={moveSelected}
                disabled={busy || selected.size === 0}
                style={[
                  styles.reviewButton,
                  { backgroundColor: theme.primaryAction, opacity: busy || selected.size === 0 ? 0.5 : 1 },
                ]}
              >
                <Text style={styles.reviewText}>
                  {selected.size === 0 ? 'Move to this week' : `Move ${selected.size} to this week`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: RoundedGeometry.default,
  },
  bannerText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
  },
  reviewButton: {
    borderRadius: RoundedGeometry.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  reviewText: {
    color: '#FFFFFF',
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: RoundedGeometry.lg,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  sheetTitle: {
    fontFamily: Fonts.headline,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  list: {
    marginVertical: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  itemTitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  itemMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    marginTop: 1,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  textButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  textButtonLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
});
