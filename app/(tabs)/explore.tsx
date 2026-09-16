import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '@/context/TaskContext';
import { WeeklyGoalInput } from '@/components/WeeklyGoalInput';
import { GoalProgress } from '@/components/GoalProgress';
import { WeeklyGoal } from '@/utils/weekly-goal';

export default function ExploreScreen() {
  const { tasks } = useTasks();
  const unscheduled = tasks.filter((t) => t.dayIndex === undefined);

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
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Weekly goals</Text>
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
        <GoalProgress key={goal.id} goal={goal} tasks={tasks} />
      ))}

      <Text style={styles.header}>Unscheduled tasks</Text>
      <FlatList
        data={unscheduled}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskRow}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.taskTag}>{item.tag}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No unscheduled tasks.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  header: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  addButton: { marginVertical: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: '#333', alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600' },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#ddd' },
  taskTitle: { fontWeight: '600' },
  taskTag: { color: '#888' },
  emptyText: { color: '#888', marginTop: 8 },
});
