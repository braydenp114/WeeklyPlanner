import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, Timer, X } from 'lucide-react-native';
import { Colors, Fonts, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocus } from '@/context/FocusContext';
import { formatElapsed } from '@/utils/focus';

/** Floating bar shown while a focus session is running: task, live clock, save or discard. */
export function FocusBar({ bottomOffset = 24 }: { bottomOffset?: number }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { session, stop } = useFocus();
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);

  if (!session) return null;

  const elapsed = Math.max(0, now - session.startedAt);
  const targetMs = session.targetMinutes * 60000;
  const progress = Math.min(1, elapsed / targetMs);
  const done = elapsed >= targetMs;

  const handleStop = async (save: boolean) => {
    setSaving(true);
    try {
      await stop(save);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View style={[styles.bar, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
        <View style={[styles.iconBadge, { backgroundColor: session.colorHex }]}>
          <Timer size={16} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={[styles.clock, { color: done ? '#16A34A' : theme.textSecondary }]}>
            {done ? "Time's up · " : ''}
            {formatElapsed(elapsed)} / {session.targetMinutes}:00
          </Text>
          <View style={[styles.track, { backgroundColor: theme.surfaceContainer }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: session.colorHex }]} />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleStop(true)}
          disabled={saving}
          style={[styles.button, { backgroundColor: session.colorHex }]}
          accessibilityLabel="Stop and save focus time"
        >
          <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleStop(false)}
          disabled={saving}
          style={styles.discard}
          accessibilityLabel="Discard focus session"
        >
          <X size={18} color={theme.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 340,
    maxWidth: '92%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RoundedGeometry.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
  clock: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discard: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
