import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  date: Date;
  onChange: (d: Date) => void;
  anchor?: AnchorRect | null;
}

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const monthYearFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });

function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function CalendarPicker({ visible, onClose, date, onChange, anchor }: CalendarPickerProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // We manage an internal viewDate to allow navigating months without changing the actual selected date yet
  const [viewDate, setViewDate] = useState(new Date(date.getFullYear(), date.getMonth(), 1));

  const navigateMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleSelect = (d: Date) => {
    // Preserve the hour/minute of the original date, just change the year/month/day
    const newDate = new Date(date);
    newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    onChange(newDate);
    onClose();
  };

  // Generate grid dates (42 days to ensure 6 rows)
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startGrid = getStartOfWeek(firstDayOfMonth);
  const gridDates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startGrid);
    d.setDate(startGrid.getDate() + i);
    gridDates.push(d);
  }

  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  if (!visible) return null;

  const CALENDAR_WIDTH = Math.min(280, windowWidth - 24);
  const CALENDAR_HEIGHT = 320;

  let popoverPlacementStyle: any = null;
  if (anchor) {
    const spaceBelow = windowHeight - (anchor.y + anchor.height);
    const spaceAbove = anchor.y;

    let top: number;
    if (spaceBelow >= CALENDAR_HEIGHT + 8 || spaceBelow >= spaceAbove) {
      // Place below
      top = anchor.y + anchor.height + 4;
      if (top + CALENDAR_HEIGHT > windowHeight - 8) {
        top = Math.max(8, windowHeight - CALENDAR_HEIGHT - 8);
      }
    } else {
      // Flip above
      top = Math.max(8, anchor.y - CALENDAR_HEIGHT - 4);
    }

    let left = anchor.x;
    if (left + CALENDAR_WIDTH > windowWidth - 12) {
      left = anchor.x + anchor.width - CALENDAR_WIDTH;
    }
    if (left + CALENDAR_WIDTH > windowWidth - 12) {
      left = windowWidth - CALENDAR_WIDTH - 12;
    }
    if (left < 12) {
      left = 12;
    }

    popoverPlacementStyle = {
      position: 'absolute' as const,
      top,
      left,
      width: CALENDAR_WIDTH,
    };
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, !anchor && styles.centeredOverlay]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.popover,
            { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant },
            popoverPlacementStyle,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navBtn}>
              <MaterialIcons name="chevron-left" size={20} color={theme.onSurface} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: theme.text }]}>
              {monthYearFmt.format(viewDate)}
            </Text>
            <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navBtn}>
              <MaterialIcons name="chevron-right" size={20} color={theme.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekRow}>
            {weekdays.map((wd, i) => (
              <Text key={i} style={[styles.weekdayText, { color: theme.textMuted }]}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {gridDates.map((d, i) => {
              const isCurrentMonth = d.getMonth() === viewDate.getMonth();
              const isSelected =
                d.getDate() === date.getDate() &&
                d.getMonth() === date.getMonth() &&
                d.getFullYear() === date.getFullYear();

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: theme.primaryAction },
                  ]}
                  onPress={() => handleSelect(d)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : isCurrentMonth ? theme.text : theme.textMuted },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  centeredOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  popover: {
    width: 280,
    padding: 16,
    borderRadius: RoundedGeometry.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
  },
  navText: {
    fontSize: 14,
  },
  monthText: {
    fontFamily: Fonts.headline,
    fontSize: 16,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.headline,
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100 / 7
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RoundedGeometry.full,
  },
  dayText: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
});
