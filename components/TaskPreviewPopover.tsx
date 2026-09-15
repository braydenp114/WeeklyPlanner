import React, { useEffect, useState } from 'react';
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
import { Colors, Fonts, RoundedGeometry, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { TaskItem } from './WeeklyGrid';
import { AnchorRect } from './ui/TimeDropdown';

interface TaskPreviewPopoverProps {
  visible: boolean;
  onClose: () => void;
  task: TaskItem | null;
  anchor: AnchorRect | null;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
}

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });

function formatTaskTime(task: TaskItem) {
  if (task.isAllDay) return 'All day';
  const start = task.originalTaskData.startDate.toDate();
  const end = task.originalTaskData.endDate.toDate();
  return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

export function TaskPreviewPopover({ visible, onClose, task, anchor, onEdit, onDelete }: TaskPreviewPopoverProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [showFullDesc, setShowFullDesc] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowFullDesc(false);
    }
  }, [visible, task]);

  if (!visible || !task) return null;

  const POPOVER_WIDTH = Math.min(360, windowWidth - 32);
  const POPOVER_HEIGHT_ESTIMATE = 240; // rough estimate

  let popoverPlacementStyle: any = null;
  if (anchor) {
    const spaceBelow = windowHeight - (anchor.y + anchor.height);
    const spaceAbove = anchor.y;

    let top: number;
    // Prefer below if there's enough space, otherwise above, or stick to bottom
    if (spaceBelow >= POPOVER_HEIGHT_ESTIMATE || spaceBelow >= spaceAbove) {
      top = anchor.y + anchor.height + 4;
    } else {
      top = Math.max(8, anchor.y - POPOVER_HEIGHT_ESTIMATE - 4);
    }
    
    // Prevent clipping top/bottom roughly
    if (top + POPOVER_HEIGHT_ESTIMATE > windowHeight - 8) {
        top = Math.max(8, windowHeight - POPOVER_HEIGHT_ESTIMATE - 8);
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
    };
  }

  const tData = task.originalTaskData;
  const ownerName = user?.displayName || user?.email || 'Signed-in User';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.popover,
            { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant },
            popoverPlacementStyle,
            !anchor && styles.centeredFallback,
          ]}
        >
          {/* Action Row */}
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => onEdit(task)} style={styles.iconBtn}>
              <MaterialIcons name="edit" size={20} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(task)} style={styles.iconBtn}>
              <MaterialIcons name="delete" size={20} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <MaterialIcons name="close" size={20} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Header Row: Color Dot + Title */}
          <View style={styles.headerRow}>
            <View style={[styles.colorDot, { backgroundColor: task.colorHex }]} />
            <Text style={[styles.titleText, { color: theme.text }]}>{task.title}</Text>
          </View>

          {/* Time/Date */}
          <View style={styles.row}>
            <View style={styles.iconPlaceholder} />
            <Text style={[styles.timeText, { color: theme.text }]}>
              {formatTaskTime(task)}
            </Text>
          </View>

          {/* Location */}
          {tData.location && (
            <View style={styles.row}>
              <MaterialIcons name="location-on" size={18} color={theme.onSurfaceVariant} style={styles.icon} />
              <Text style={[styles.detailText, { color: theme.text }]}>{tData.location}</Text>
            </View>
          )}

          {/* Description */}
          {tData.description && (
            <View style={styles.row}>
              <MaterialIcons name="notes" size={18} color={theme.onSurfaceVariant} style={styles.icon} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.detailText, { color: theme.text }]}
                  numberOfLines={showFullDesc ? undefined : 3}
                >
                  {tData.description}
                </Text>
                {tData.description.length > 100 && !showFullDesc && (
                  <TouchableOpacity onPress={() => setShowFullDesc(true)}>
                    <Text style={[styles.showMoreText, { color: theme.primaryAction }]}>Show more</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Notification */}
          {tData.notification && (
            <View style={styles.row}>
              <MaterialIcons name="notifications" size={18} color={theme.onSurfaceVariant} style={styles.icon} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                {tData.notification.type}
              </Text>
            </View>
          )}

          {/* Owner */}
          <View style={styles.row}>
            <MaterialIcons name="calendar-today" size={18} color={theme.onSurfaceVariant} style={styles.icon} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              {ownerName}
            </Text>
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
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  popover: {
    borderRadius: RoundedGeometry.default,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    padding: 16,
    paddingTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  centeredFallback: {
    alignSelf: 'center',
    top: '30%',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginTop: 6,
  },
  titleText: {
    fontFamily: Fonts.headline,
    fontSize: 20, // using hardcoded size as headlineSm is not in Typography
    fontWeight: '700',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  icon: {
    marginTop: 2,
    width: 18,
    textAlign: 'center',
  },
  iconPlaceholder: {
    width: 18,
  },
  timeText: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodyMd.fontSize,
  },
  detailText: {
    fontFamily: Fonts.body,
    fontSize: Typography.bodySm.fontSize,
    flex: 1,
    lineHeight: 20,
  },
  showMoreText: {
    fontFamily: Fonts.body,
    fontSize: Typography.labelSm.fontSize,
    fontWeight: '600',
    marginTop: 4,
  },
});
