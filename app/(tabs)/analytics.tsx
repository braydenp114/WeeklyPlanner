import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Fonts, RoundedGeometry, Typography } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/AuthContext";
import {
  getTasksForRange,
  calculateWeeklyReview,
  CategoryReviewStats,
} from "@/services/tasksService";

function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export default function AnalyticsScreen() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = Colors[scheme];
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<CategoryReviewStats[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReview = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const start = getStartOfWeek(now);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const tasks = await getTasksForRange(start, end);
      setStats(calculateWeeklyReview(tasks));
    } catch (e) {
      console.error("[AnalyticsScreen] Failed to load review:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) loadReview();
  }, [authLoading, loadReview]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          This Week's Review
        </Text>

        {loading && (
          <ActivityIndicator
            color={theme.primaryAction}
            style={{ marginTop: 20 }}
          />
        )}

        {!loading && stats.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No tasks scheduled this week yet.
          </Text>
        )}

        {!loading &&
          stats.map((s) => (
            <View
              key={s.category}
              style={[
                styles.card,
                {
                  backgroundColor: theme.surfaceContainer,
                  borderColor: theme.outlineVariant,
                },
              ]}
            >
              <Text style={[styles.categoryName, { color: theme.text }]}>
                {s.category}
              </Text>
              <Text style={[styles.statLine, { color: theme.textSecondary }]}>
                Planned: {s.plannedHours.toFixed(1)}h
              </Text>
              <Text style={[styles.statLine, { color: theme.textSecondary }]}>
                Completed as planned: {s.completedAsPlannedHours.toFixed(1)}h
                {s.plannedHours > 0 &&
                  ` (${Math.round((s.completedAsPlannedHours / s.plannedHours) * 100)}%)`}
              </Text>
              <Text style={[styles.statLine, { color: theme.textSecondary }]}>
                Substituted: {s.substitutedCount}
              </Text>
              <Text style={[styles.statLine, { color: theme.textSecondary }]}>
                Not yet logged: {s.unloggedCount}
              </Text>
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineMobile.fontSize,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 20,
  },
  card: {
    borderRadius: RoundedGeometry.default,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  categoryName: {
    fontFamily: Fonts.headline,
    fontSize: 16,
    fontWeight: "700",
    textTransform: "capitalize",
    marginBottom: 4,
  },
  statLine: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
});
