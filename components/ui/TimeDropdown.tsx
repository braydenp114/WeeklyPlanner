import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TimeDropdownProps {
  visible: boolean;
  onClose: () => void;
  date: Date;
  onChange: (d: Date) => void;
  anchor?: AnchorRect | null;
}

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });

export function TimeDropdown({ visible, onClose, date, onChange, anchor }: TimeDropdownProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Generate 15-minute increments
  const timeSlots: Date[] = [];
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 24 * 4; i++) {
    const slot = new Date(baseDate);
    slot.setMinutes(i * 15);
    timeSlots.push(slot);
  }

  // Find index of current closest time to scroll to
  const currentIndex = timeSlots.findIndex(
    (t) => t.getHours() === date.getHours() && t.getMinutes() >= date.getMinutes()
  );

  useEffect(() => {
    if (visible && scrollViewRef.current && currentIndex > -1) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, currentIndex * 40 - 80), animated: false });
      }, 50);
    }
  }, [visible, currentIndex]);

  const handleSelect = (d: Date) => {
    const newDate = new Date(date);
    newDate.setHours(d.getHours(), d.getMinutes(), 0, 0);
    onChange(newDate);
    onClose();
  };

  if (!visible) return null;

  const POPOVER_WIDTH = 160;
  const POPOVER_HEIGHT = Math.min(280, Math.max(160, windowHeight - 32));

  let popoverPlacementStyle: any = null;
  if (anchor) {
    const spaceBelow = windowHeight - (anchor.y + anchor.height);
    const spaceAbove = anchor.y;

    let top: number;
    if (spaceBelow >= POPOVER_HEIGHT + 8 || spaceBelow >= spaceAbove) {
      // Anchor directly below trigger
      top = anchor.y + anchor.height + 4;
      if (top + POPOVER_HEIGHT > windowHeight - 8) {
        top = Math.max(8, windowHeight - POPOVER_HEIGHT - 8);
      }
    } else {
      // Flip above trigger
      top = Math.max(8, anchor.y - POPOVER_HEIGHT - 4);
    }

    let left = anchor.x;
    if (left + POPOVER_WIDTH > windowWidth - 12) {
      left = anchor.x + anchor.width - POPOVER_WIDTH;
    }
    if (left + POPOVER_WIDTH > windowWidth - 12) {
      left = windowWidth - POPOVER_WIDTH - 12;
    }
    if (left < 12) {
      left = 12;
    }

    popoverPlacementStyle = {
      position: 'absolute' as const,
      top,
      left,
      width: POPOVER_WIDTH,
      height: POPOVER_HEIGHT,
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
          <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {timeSlots.map((slot, i) => {
              const isSelected = slot.getHours() === date.getHours() && slot.getMinutes() === date.getMinutes();
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.timeItem,
                    isSelected && { backgroundColor: theme.primaryAction },
                  ]}
                  onPress={() => handleSelect(slot)}
                >
                  <Text style={[styles.timeText, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                    {timeFmt.format(slot)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    width: 200,
    height: 300,
    borderRadius: RoundedGeometry.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  timeItem: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  timeText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
});
