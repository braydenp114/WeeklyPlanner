import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { CalendarDays, Check, Trash } from 'lucide-react-native';
import { Colors, Fonts, RoundedGeometry, TaskCardColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { StreakChallengeInput } from '@/services/streaksService';
import { GRACE_DAYS_PER_MONTH } from '@/utils/streakChallenge';
import { DEFAULT_STREAK_ICON, STREAK_ICONS } from '../streakIcons';

const COLOR_OPTIONS = Object.values(TaskCardColors).map((c) => c.bg);

interface StreakEditorModalProps {
  visible: boolean;
  /** Existing challenge to edit, or null to create a new one. */
  initial: (StreakChallengeInput & { id: string }) | null;
  onClose: () => void;
  onSave: (input: StreakChallengeInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

/** Create or edit a streak challenge: name, icon, colour and whether it shows on the calendar. */
export function StreakEditorModal({ visible, initial, onClose, onSave, onDelete }: StreakEditorModalProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(DEFAULT_STREAK_ICON);
  const [colorHex, setColorHex] = useState(COLOR_OPTIONS[0]);
  const [showOnCalendar, setShowOnCalendar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset the form each time the modal opens
  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(initial?.title ?? '');
    setIcon(initial?.icon ?? DEFAULT_STREAK_ICON);
    setColorHex(initial?.colorHex ?? COLOR_OPTIONS[0]);
    setShowOnCalendar(initial?.showOnCalendar ?? true);
    setError('');
    setSaving(false);
  }, [visible, initial]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Give your streak a name');
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), icon, colorHex, showOnCalendar });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save streak');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(initial.id);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to delete streak');
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            <Text style={[styles.heading, { color: theme.text }]}>{initial ? 'Edit streak' : 'New streak'}</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Read 20 pages"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.outlineVariant }]}
              autoFocus
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Icon</Text>
            <View style={styles.iconGrid}>
              {Object.entries(STREAK_ICONS).map(([key, Icon]) => {
                const selected = key === icon;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setIcon(key)}
                    style={[
                      styles.iconCell,
                      { borderColor: selected ? colorHex : theme.outlineVariant },
                      selected && { backgroundColor: colorHex },
                    ]}
                    accessibilityLabel={`Icon ${key}`}
                  >
                    <Icon size={20} color={selected ? '#FFFFFF' : theme.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Colour</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  onPress={() => setColorHex(hex)}
                  style={[styles.colorDot, { backgroundColor: hex }]}
                  accessibilityLabel={`Colour ${hex}`}
                >
                  {hex === colorHex && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <CalendarDays size={18} color={theme.textSecondary} strokeWidth={2} />
              <Text style={[styles.switchLabel, { color: theme.text }]}>Show on calendar</Text>
              <Switch
                value={showOnCalendar}
                onValueChange={setShowOnCalendar}
                trackColor={{ true: theme.primaryAction, false: theme.outlineVariant }}
              />
            </View>

            <Text style={[styles.rules, { color: theme.textSecondary, backgroundColor: theme.surfaceContainer }]}>
              Check in once a day. Missing one day uses a grace day ({GRACE_DAYS_PER_MONTH} per month, they reset
              every month). Missing two days in a row resets the streak.
            </Text>

            {!!error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}

            <View style={styles.buttonRow}>
              {initial && onDelete && (
                <TouchableOpacity onPress={handleDelete} disabled={saving} style={styles.deleteButton}>
                  <Trash size={16} color={theme.error} strokeWidth={2} />
                  <Text style={[styles.deleteText, { color: theme.error }]}>Delete</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={onClose} style={styles.textButton}>
                <Text style={[styles.textButtonLabel, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.saveButton, { backgroundColor: theme.primaryAction, opacity: saving ? 0.6 : 1 }]}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: RoundedGeometry.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
    gap: 10,
  },
  heading: {
    fontFamily: Fonts.headline,
    fontSize: 20,
    fontWeight: '600',
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: RoundedGeometry.default,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  switchLabel: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  rules: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
    padding: 10,
    borderRadius: RoundedGeometry.default,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  deleteText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '500',
  },
  textButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textButtonLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: RoundedGeometry.full,
  },
  saveText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
