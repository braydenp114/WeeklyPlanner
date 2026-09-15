import { View, Text, TextInput, StyleSheet } from 'react-native';

interface Props {
  tag: string;
  targetHours: number;
  onTagChange: (tag: string) => void;
  onTargetChange: (hours: number) => void;
}

export function WeeklyGoalInput({ tag, targetHours, onTagChange, onTargetChange }: Props) {
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.tagInput}
        value={tag}
        onChangeText={onTagChange}
        placeholder="category (e.g. reading)"
      />
      <TextInput
        style={styles.hoursInput}
        keyboardType="numeric"
        value={String(targetHours)}
        onChangeText={(text) => onTargetChange(Number(text) || 0)}
        placeholder="hrs"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  tagInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8 },
  hoursInput: { width: 60, borderWidth: 1, borderRadius: 8, padding: 8, textAlign: 'center' },
});