import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const OPTIONS = [5, 10, 15, 30];

type Props = {
  value: number | null;
  onChange: (minutes: number | null) => void;
};

export function ReminderToggle({ value, onChange }: Props) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const enabled = value !== null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={{ color: theme.text }}>Remind me before this task</Text>
        <Switch
          value={enabled}
          onValueChange={(v) => onChange(v ? 10 : null)}
        />
      </View>

      {enabled && (
        <View style={styles.optionsRow}>
          {OPTIONS.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              onPress={() => onChange(minutes)}
              style={[
                styles.option,
                {
                  backgroundColor: value === minutes ? theme.primaryAction : theme.surfaceContainer,
                },
              ]}
            >
              <Text style={{ color: value === minutes ? '#fff' : theme.text }}>
                {minutes}min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionsRow: { flexDirection: 'row', gap: 8 },
  option: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
});