import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Fonts, TaskCardColors } from '@/constants/theme';
import { useNav } from '@/context/NavContext';

/** Same default color new tasks start with, so the ghost previews honestly. */
const GHOST_COLOR = TaskCardColors.indigo;

/**
 * Floating preview that follows the pointer while a to-do is being dragged from the
 * sidebar toward the weekly grid, styled like the real task cards it's about to become.
 * Sits above everything else and never intercepts touches, so it doesn't interfere
 * with the drag itself.
 */
export function DragGhost() {
  const { draggingTodo, dragPosition } = useNav();

  if (!draggingTodo || !dragPosition) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.ghost,
        {
          left: dragPosition.x + 14,
          top: dragPosition.y + 14,
          backgroundColor: GHOST_COLOR.bg,
        },
      ]}
    >
      <Text style={[styles.text, { color: GHOST_COLOR.text }]} numberOfLines={1}>
        {draggingTodo.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    zIndex: 1000,
    maxWidth: 200,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    transform: [{ rotate: '-3deg' }],
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },
});
