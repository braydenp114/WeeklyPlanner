import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Circle, CircleCheck, Plus, X } from 'lucide-react-native';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { addTodo, deleteTodo, getTodos, setTodoDone, Todo } from '@/services/todosService';
import { toDayKey } from '@/utils/streakChallenge';
import { SidebarSection } from './SidebarSection';

type DueChoice = 'none' | 'today' | 'tomorrow';

const dueFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/** "Today", "Tomorrow", "Overdue · 3 Oct" or "12 Oct" for a due day key. */
function dueLabel(dueDate: string, todayKey: string, tomorrowKey: string): string {
  if (dueDate === todayKey) return 'Today';
  if (dueDate === tomorrowKey) return 'Tomorrow';
  const [y, m, d] = dueDate.split('-').map(Number);
  const text = dueFormatter.format(new Date(y, m - 1, d));
  return dueDate < todayKey ? `Overdue · ${text}` : text;
}

/**
 * Sidebar to-do list (like Google Tasks): quick add with an optional due day,
 * tick off items, overdue ones float to the top, finished ones fold away.
 */
export function TodoSection() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user, loading: authLoading } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState('');
  const [due, setDue] = useState<DueChoice>('none');
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const todayKey = toDayKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDayKey(tomorrow);

  const reload = useCallback(async () => {
    try {
      setTodos(await getTodos());
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load to-dos');
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.resolve().then(reload);
  }, [authLoading, user, reload]);

  const handleAdd = async () => {
    const title = text.trim();
    if (!title) return;
    const dueDate = due === 'today' ? todayKey : due === 'tomorrow' ? tomorrowKey : null;
    setText('');
    setDue('none');
    try {
      await addTodo(title, dueDate);
      await reload();
    } catch (e: any) {
      setError(e.message || 'Failed to add to-do');
    }
  };

  const handleToggle = async (todo: Todo) => {
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
    try {
      await setTodoDone(todo.id, !todo.done);
    } catch (e: any) {
      setError(e.message || 'Failed to update to-do');
      reload();
    }
  };

  const handleDelete = async (todo: Todo) => {
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    try {
      await deleteTodo(todo.id);
    } catch (e: any) {
      setError(e.message || 'Failed to delete to-do');
      reload();
    }
  };

  // Open items: dated ones first (overdue → today → later), then undated, each by title
  const open = useMemo(
    () =>
      todos
        .filter((t) => !t.done)
        .sort((a, b) => {
          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return a.title.localeCompare(b.title);
        }),
    [todos],
  );
  const done = todos.filter((t) => t.done);

  const renderItem = (todo: Todo) => {
    const overdue = !!todo.dueDate && todo.dueDate < todayKey && !todo.done;
    const Check = todo.done ? CircleCheck : Circle;
    return (
      <View key={todo.id} style={styles.item}>
        <TouchableOpacity onPress={() => handleToggle(todo)} hitSlop={8} accessibilityLabel={todo.done ? 'Mark not done' : 'Mark done'}>
          <Check size={18} color={todo.done ? theme.primaryAction : theme.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.itemText}>
          <Text
            style={[styles.itemTitle, { color: todo.done ? theme.textMuted : theme.text }, todo.done && styles.strike]}
            numberOfLines={2}
          >
            {todo.title}
          </Text>
          {!!todo.dueDate && !todo.done && (
            <Text style={[styles.itemDue, { color: overdue ? theme.error : theme.textSecondary }]}>
              {dueLabel(todo.dueDate, todayKey, tomorrowKey)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => handleDelete(todo)} hitSlop={8} accessibilityLabel="Delete to-do">
          <X size={15} color={theme.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SidebarSection title="To-do">
      <View style={[styles.inputRow, { borderColor: theme.outlineVariant }]}>
        <Plus size={16} color={theme.primaryAction} strokeWidth={2.2} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleAdd}
          placeholder="Add a to-do"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="done"
        />
      </View>
      {text.length > 0 && (
        <View style={styles.chipRow}>
          {(['today', 'tomorrow'] as DueChoice[]).map((choice) => {
            const selected = due === choice;
            return (
              <TouchableOpacity
                key={choice}
                onPress={() => setDue(selected ? 'none' : choice)}
                style={[
                  styles.chip,
                  { borderColor: selected ? theme.primaryAction : theme.outlineVariant },
                  selected && { backgroundColor: theme.primaryAction },
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.textSecondary }]}>
                  {choice === 'today' ? 'Today' : 'Tomorrow'}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={handleAdd} style={[styles.chip, styles.addChip, { backgroundColor: theme.primaryAction }]}>
            <Text style={[styles.chipText, { color: '#FFFFFF' }]}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}

      {open.length === 0 && done.length === 0 && (
        <Text style={[styles.empty, { color: theme.textMuted }]}>Nothing to do yet.</Text>
      )}
      {open.map(renderItem)}

      {done.length > 0 && (
        <TouchableOpacity onPress={() => setShowDone(!showDone)} style={styles.doneToggle}>
          <Text style={[styles.doneToggleText, { color: theme.textSecondary }]}>
            {showDone ? 'Hide' : 'Show'} completed ({done.length})
          </Text>
        </TouchableOpacity>
      )}
      {showDone && done.map(renderItem)}
    </SidebarSection>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: RoundedGeometry.default,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    paddingVertical: 7,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: RoundedGeometry.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  addChip: {
    borderWidth: 0,
    marginLeft: 'auto',
  },
  chipText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '500',
  },
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
  itemDue: {
    fontFamily: Fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  doneToggle: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  doneToggleText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '500',
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    paddingHorizontal: 12,
  },
});
