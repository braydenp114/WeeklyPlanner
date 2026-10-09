import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, EyeOff, Flame } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChallengeWithSummary, useStreaks } from '@/context/StreaksContext';
import { getStreakIcon } from '../streakIcons';
import { SidebarSection } from './SidebarSection';
import { StreakEditorModal } from './StreakEditorModal';

/**
 * Sidebar list of streak challenges. Tap the circle to check in for today,
 * tap the name to edit (icon, colour, show on calendar) or delete.
 */
export function StreakSection() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { challenges, error, addChallenge, updateChallenge, deleteChallenge, toggleToday } = useStreaks();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ChallengeWithSummary | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (challenge: ChallengeWithSummary) => {
    setEditing(challenge);
    setEditorOpen(true);
  };

  return (
    <SidebarSection title="Streaks" onAdd={openNew} addLabel="New streak">
      {!!error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}

      {challenges.length === 0 && (
        <TouchableOpacity onPress={openNew} style={styles.emptyButton}>
          <Text style={[styles.empty, { color: theme.textMuted }]}>Start a streak, like reading or the gym.</Text>
        </TouchableOpacity>
      )}

      {challenges.map((challenge) => {
        const Icon = getStreakIcon(challenge.icon);
        const { current, doneToday, graceLeftThisMonth } = challenge.summary;
        return (
          <View key={challenge.id} style={styles.row}>
            <View style={[styles.badge, { backgroundColor: challenge.colorHex }]}>
              <Icon size={15} color="#FFFFFF" strokeWidth={2.2} />
            </View>

            <TouchableOpacity style={styles.info} onPress={() => openEdit(challenge)} activeOpacity={0.6}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                  {challenge.title}
                </Text>
                {!challenge.showOnCalendar && <EyeOff size={12} color={theme.textMuted} strokeWidth={2} />}
              </View>
              <View style={styles.metaRow}>
                <Flame size={12} color={current > 0 ? '#F97316' : theme.textMuted} strokeWidth={2.2} />
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {current} day{current === 1 ? '' : 's'} · {graceLeftThisMonth} grace left
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleToday(challenge.id)}
              style={[
                styles.checkButton,
                { borderColor: challenge.colorHex },
                doneToday && { backgroundColor: challenge.colorHex },
              ]}
              accessibilityLabel={doneToday ? `Undo today's check-in for ${challenge.title}` : `Check in ${challenge.title} for today`}
            >
              {doneToday && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
            </TouchableOpacity>
          </View>
        );
      })}

      <StreakEditorModal
        visible={editorOpen}
        initial={editing}
        onClose={() => setEditorOpen(false)}
        onSave={(input) => (editing ? updateChallenge(editing.id, input) : addChallenge(input))}
        onDelete={deleteChallenge}
      />
    </SidebarSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 11,
  },
  checkButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    paddingHorizontal: 12,
  },
});
