import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { Task } from '@/services/tasksService';
import { AnchorRect } from './ui/TimeDropdown';

/*
 * Shared calendar pieces used by both WeeklyGrid and MonthlyGridView.
 * Kept in their own file so the two views don't import each other (that caused a require cycle).
 */

// ─── TaskItem: grid-local rendering format ──────────────────────────────────

export type TaskItem = {
  id: string;
  title: string;
  dayIndex: number;
  startHour: number;
  durationHours: number;
  colorHex: string;
  /** The task's category (e.g. study/workout/work/personal), shown as a small pill on the card. */
  category: string;
  /** The actual calendar date this occurrence falls on, for month view matching. */
  actualDate: Date;
  /** The original Firestore document ID, for edit/delete operations. */
  originalTaskId: string;
  /** Whether this is part of a recurring series. */
  isRecurrenceInstance: boolean;
  /** Whether this is an all-day event. */
  isAllDay: boolean;
  /** The full task data, used for popovers and edit functionality. */
  originalTaskData: Task;
};

export function getPastColor(hex: string) {
  if (!hex || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Blend 50% with dark gray (80,80,80)
  const nr = Math.floor(r * 0.5 + 80 * 0.5);
  const ng = Math.floor(g * 0.5 + 80 * 0.5);
  const nb = Math.floor(b * 0.5 + 80 * 0.5);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * Past events keep their colour but fade out (like Google Calendar),
 * so they are still recognisable but clearly finished.
 */
export function getPastEventStyle(isPast: boolean, baseHex: string) {
  return { backgroundColor: baseHex, opacity: isPast ? 0.55 : 1 };
}

export const HoverableTaskCard = ({
  task,
  style,
  children,
  onPress,
}: {
  task: TaskItem;
  style: any;
  children: React.ReactNode;
  onPress: (task: TaskItem, anchor: AnchorRect) => void;
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const ref = React.useRef<any>(null);

  const handlePress = () => {
    if (ref.current) {
      if (Platform.OS === 'web' && typeof ref.current.getBoundingClientRect === 'function') {
        const rect = ref.current.getBoundingClientRect();
        onPress(task, { x: rect.left, y: rect.top, width: rect.width, height: rect.height });
      } else if (typeof ref.current.measureInWindow === 'function') {
        ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
          onPress(task, { x, y, width, height });
        });
      } else if (typeof ref.current.measure === 'function') {
        ref.current.measure((_fx: number, _fy: number, width: number, height: number, px: number, py: number) => {
          onPress(task, { x: px, y: py, width, height });
        });
      }
    }
  };

  const hoverStyle = Platform.OS === 'web'
    ? ({
        transition: 'box-shadow 150ms ease',
        ...(isHovered ? { boxShadow: '0 2px 6px rgba(0,0,0,0.25)', zIndex: 100 } : {}),
      } as any)
    : {};

  const bind = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  return (
    <TouchableOpacity
      ref={ref}
      activeOpacity={0.85}
      style={[style, hoverStyle]}
      onPress={handlePress}
      {...bind as any}
    >
      {children}
    </TouchableOpacity>
  );
};

const timeFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true });

/** "10am", "10:30am", "4pm": short times like Google Calendar uses. */
export function formatShortTime(date: Date): string {
  const parts = timeFmt.formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const period = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toLowerCase().replace(/\./g, '').replace(/\s/g, '');
  return minute === '00' ? `${hour}${period}` : `${hour}:${minute}${period}`;
}

/** "10 – 11:30am" or "11am – 1pm": the time range shown on an event block. */
export function formatTimeRange(start: Date, end: Date): string {
  const s = formatShortTime(start);
  const e = formatShortTime(end);
  const samePeriod = (start.getHours() < 12) === (end.getHours() < 12);
  return samePeriod ? `${s.replace(/(am|pm)$/, '')} – ${e}` : `${s} – ${e}`;
}

/** "1 AM", "12 PM": labels for the hour lines on the left of the week grid. */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return '';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Google Calendar's red "now" line. */
export const NOW_LINE_COLOR = '#EA4335';
