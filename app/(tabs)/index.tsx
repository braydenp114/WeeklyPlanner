import WeeklyGrid from "@/components/WeeklyGrid";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Weekly Planner and Beyond</Text>
      <WeeklyGrid />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
});
