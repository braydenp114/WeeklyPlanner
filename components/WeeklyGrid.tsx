import { ScrollView, StyleSheet, Text, View } from "react-native";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

export default function WeeklyGrid() {
  return (
    <ScrollView horizontal>
      <View>
        {/* Day headers */}
        <View style={styles.headerRow}>
          <View style={styles.timeLabelSpace} />
          {days.map((day) => (
            <View key={day} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Time rows */}
        <ScrollView>
          {hours.map((hour) => (
            <View key={hour} style={styles.row}>
              <View style={styles.timeLabelSpace}>
                <Text style={styles.timeLabelText}>{hour}:00</Text>
              </View>
              {days.map((day) => (
                <View key={`${day}-${hour}`} style={styles.cell} />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
  },
  timeLabelSpace: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  timeLabelText: {
    fontSize: 12,
    color: "#666",
  },
  dayHeader: {
    width: 100,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  dayHeaderText: {
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 100,
    height: 50,
    borderWidth: 0.5,
    borderColor: "#eee",
  },
});
