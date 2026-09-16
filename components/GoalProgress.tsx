import { View, Text, StyleSheet } from 'react-native';
import type { TaskItem } from '@/context/TaskContext';
import { WeeklyGoal, remainingHours } from '@/utils/weekly-goal';

interface Props {
  goal: WeeklyGoal;
  tasks: TaskItem[];
}

export function GoalProgress({ goal, tasks }: Props) {
  const remaining = remainingHours(goal, tasks);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{goal.tag}</Text>
      <Text>{goal.targetHours}h target</Text>
      <Text>{remaining}h pending</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 4 },
  title: { fontWeight: '600' },
});
