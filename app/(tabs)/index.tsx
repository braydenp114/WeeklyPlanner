import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WeeklyGrid from "@/components/WeeklyGrid";
import { WeeklyGoalInput } from "@/components/WeeklyGoalInput";
import { GoalProgress } from "@/components/GoalProgress";
import { WeeklyGoal } from "@/utils/weekly-goal";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function HomeScreen() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = Colors[scheme];

  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newTarget, setNewTarget] = useState(0);

  const addGoal = () => {
    if (!newTag || newTarget <= 0) return;
    setGoals((prev) => [
      ...prev,
      { id: Date.now().toString(), tag: newTag, targetHours: newTarget, weekStart: new Date() },
    ]);
    setNewTag('');
    setNewTarget(0);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <WeeklyGoalInput
        tag={newTag}
        targetHours={newTarget}
        onTagChange={setNewTag}
        onTargetChange={setNewTarget}
      />
      <TouchableOpacity onPress={addGoal} style={styles.addButton}>
        <Text style={styles.addButtonText}>Add goal</Text>
      </TouchableOpacity>

      {goals.map((goal) => (
        <GoalProgress key={goal.id} goal={goal} tasks={[]} />
      ))}

      <WeeklyGrid />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addButton: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
});