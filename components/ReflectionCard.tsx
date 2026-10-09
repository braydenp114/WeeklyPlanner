import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { getReflections, saveReflection } from '@/services/reflectionsService';
import { DailyReflection, Mood, MOOD_LABELS } from '@/utils/reflection';
import { toDayKey } from '@/utils/streakChallenge';
import { MOOD_COLORS, MOOD_ICONS, MOODS } from './moodIcons';

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

/**
 * End-of-day reflection shown on the Day view (today or earlier):
 * pick a mood from 1 to 5 and write one line about the day.
 * The weekly review in Analytics shows these for the week.
 */
export function ReflectionCard({ date }: { date: Date }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { user, loading: authLoading } = useAuth();
  const day = toDayKey(date);
  const isToday = day === toDayKey(new Date());

  const [saved, setSaved] = useState<DailyReflection | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => getReflections(day, day))
      .then((list) => {
        if (cancelled) return;
        const found = list[0] ?? null;
        setSaved(found);
        setMood(found?.mood ?? null);
        setNote(found?.note ?? '');
        setEditing(false);
        setError(null);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e.message || 'Failed to load reflection');
      });
    return () => {
      cancelled = true;
    };
  }, [day, authLoading, user]);

  const handleSave = async () => {
    if (!mood) return;
    setBusy(true);
    try {
      await saveReflection(day, mood, note);
      setSaved({ day, mood, note: note.trim() });
      setEditing(false);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to save reflection');
    } finally {
      setBusy(false);
    }
  };

  const question = isToday ? 'How did today go?' : `How did ${dayFormatter.format(date)} go?`;
  const cardStyle = [styles.card, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }];

  // Saved and not being edited: one compact line
  if (saved && !editing) {
    const Icon = MOOD_ICONS[saved.mood];
    return (
      <View style={[cardStyle, styles.savedRow]}>
        <Icon size={20} color={MOOD_COLORS[saved.mood]} strokeWidth={2} />
        <Text style={[styles.savedText, { color: theme.text }]} numberOfLines={2}>
          <Text style={styles.savedMood}>{MOOD_LABELS[saved.mood]}</Text>
          {saved.note ? ` · ${saved.note}` : ''}
        </Text>
        <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8} accessibilityLabel="Edit reflection">
          <Pencil size={16} color={theme.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <View style={styles.topRow}>
        <Text style={[styles.question, { color: theme.text }]}>{question}</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m) => {
            const Icon = MOOD_ICONS[m];
            const selected = mood === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMood(m)}
                accessibilityLabel={`Mood ${m}: ${MOOD_LABELS[m]}`}
                style={[styles.moodButton, selected && { backgroundColor: MOOD_COLORS[m] + '26' }]}
              >
                <Icon size={22} color={selected ? MOOD_COLORS[m] : theme.textSecondary} strokeWidth={selected ? 2.4 : 1.8} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {mood !== null && (
        <View style={styles.noteRow}>
          <TextInput
            value={note}
            onChangeText={setNote}
            onSubmitEditing={handleSave}
            placeholder="One line about the day (optional)"
            placeholderTextColor={theme.textMuted}
            maxLength={140}
            style={[styles.input, { color: theme.text, borderColor: theme.outlineVariant }]}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={handleSave}
            disabled={busy}
            style={[styles.saveButton, { backgroundColor: theme.primaryAction, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: RoundedGeometry.default,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  question: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600',
  },
  moodRow: {
    flexDirection: 'row',
    gap: 4,
  },
  moodButton: {
    padding: 6,
    borderRadius: RoundedGeometry.full,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RoundedGeometry.default,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  saveButton: {
    borderRadius: RoundedGeometry.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  saveText: {
    color: '#FFFFFF',
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  savedMood: {
    fontWeight: '600',
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
});
