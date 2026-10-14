import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import { Circle, CircleCheck, GripVertical, X } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNav } from '@/context/NavContext';
import { Todo } from '@/services/todosService';

interface DraggableTodoRowProps {
  todo: Todo;
  overdue: boolean;
  dueText: string | null;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

/** How far (px) a press has to move before it counts as a drag rather than a tap on Check/Delete. */
const DRAG_THRESHOLD = 10;

/**
 * A to-do row that can be tapped (to toggle/delete, as before) or pressed and dragged
 * toward the weekly grid to schedule it. Reports the live drag to NavContext, which
 * WeeklyGrid and DragGhost both read from.
 */
export function DraggableTodoRow({ todo, overdue, dueText, onToggle, onDelete }: DraggableTodoRowProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { startTodoDrag, updateTodoDragPosition, endTodoDrag } = useNav();
  const [isDragging, setIsDragging] = useState(false);
  const rowRef = useRef<View>(null);

  // Gesture handlers below are created once; this ref keeps them seeing fresh props/context.
  const latest = useRef({ todo, startTodoDrag, updateTodoDragPosition, endTodoDrag });
  useEffect(() => {
    latest.current = { todo, startTodoDrag, updateTodoDragPosition, endTodoDrag };
  });

  // Native: only start capturing once the press has actually moved, so a plain tap on
  // the Check or Delete buttons (which never move) is left alone.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: (e) => {
        setIsDragging(true);
        const { pageX, pageY } = e.nativeEvent;
        latest.current.startTodoDrag(latest.current.todo, { x: pageX, y: pageY });
      },
      onPanResponderMove: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        latest.current.updateTodoDragPosition({ x: pageX, y: pageY });
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        latest.current.endTodoDrag();
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        latest.current.endTodoDrag();
      },
    }),
  );

  // Web: pointerdown starts on the handle itself, but move/up are tracked on the whole
  // window from then on. The handle is small, and relying on the browser to keep routing
  // events to it (via setPointerCapture) turned out unreliable once the cursor moved off
  // it — which is the entire point of a drag. Listening on window sidesteps that: it
  // doesn't matter where the cursor physically is once the drag has started.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = rowRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    const onWindowPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        dragging = true;
        setIsDragging(true);
        latest.current.startTodoDrag(latest.current.todo, { x: e.clientX, y: e.clientY });
      }
      latest.current.updateTodoDragPosition({ x: e.clientX, y: e.clientY });
    };

    const stopTracking = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', stopTracking);
      window.removeEventListener('pointercancel', stopTracking);
      if (dragging) {
        setIsDragging(false);
        latest.current.endTodoDrag();
      }
      dragging = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      // Stop the browser's own "drag to select text" from racing our threshold below —
      // without this it can win on a slow or diagonal press, which is what was happening.
      e.preventDefault();
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragging = false;
      window.addEventListener('pointermove', onWindowPointerMove);
      window.addEventListener('pointerup', stopTracking);
      window.addEventListener('pointercancel', stopTracking);
    };

    node.addEventListener('pointerdown', onPointerDown);
    return () => {
      node.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', stopTracking);
      window.removeEventListener('pointercancel', stopTracking);
    };
  }, []);

  const Check = todo.done ? CircleCheck : Circle;

  return (
    <View
      style={[
        styles.item,
        isDragging && styles.dragging,
        Platform.OS === 'web' && ({ userSelect: 'none' } as object),
      ]}
    >
      {!todo.done && (
        <View
          ref={rowRef}
          style={[styles.handle, Platform.OS === 'web' && ({ cursor: 'grab' } as object)]}
          accessibilityLabel="Drag to schedule"
          {...(Platform.OS === 'web' ? {} : panResponder.panHandlers)}
        >
          <GripVertical size={14} color={theme.textMuted} strokeWidth={2} />
        </View>
      )}
      <TouchableOpacity onPress={() => onToggle(todo)} hitSlop={8} accessibilityLabel={todo.done ? 'Mark not done' : 'Mark done'}>
        <Check size={18} color={todo.done ? theme.primaryAction : theme.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
      <View style={styles.itemText}>
        <Text
          style={[styles.itemTitle, { color: todo.done ? theme.textMuted : theme.text }, todo.done && styles.strike]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        {!!dueText && !todo.done && (
          <Text style={[styles.itemDue, { color: overdue ? theme.error : theme.textSecondary }]}>{dueText}</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => onDelete(todo)} hitSlop={8} accessibilityLabel="Delete to-do">
        <X size={15} color={theme.textMuted} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  handle: {
    paddingTop: 2,
    paddingRight: 2,
  },
  dragging: {
    opacity: 0.4,
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
});
