import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
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
import { calculateGoalGap } from "@/utils/weekly-goal";
import { getReflections } from "@/services/reflectionsService";
import { averageMood, DailyReflection, MOOD_LABELS } from "@/utils/reflection";
import { toDayKey } from "@/utils/streakChallenge";
import { MOOD_COLORS, MOOD_ICONS } from "@/components/moodIcons";

const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });

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
  const [goalTargets, setGoalTargets] = useState<Record<string, string>>({});
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [reflections, setReflections] = useState<DailyReflection[]>([]);

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

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
      setWeekDays(days);
      // Reflections are optional: the review still shows if they fail to load
      try {
        setReflections(await getReflections(toDayKey(days[0]), toDayKey(days[6])));
      } catch (e) {
        console.error("[AnalyticsScreen] Failed to load reflections:", e);
        setReflections([]);
      }
    } catch (e) {
      console.error("[AnalyticsScreen] Failed to load review:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

    useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!authLoading) loadReview();
  }, [authLoading, loadReview]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>This Week&apos;s Review</Text>

        {loading && (
          <ActivityIndicator
            color={theme.primaryAction}
            style={{ marginTop: 20 }}
          />
        )}

        {/* Mood across the week, from the end-of-day reflections on the Day view */}
        {!loading && weekDays.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant },
            ]}
          >
            <Text style={[styles.categoryName, { color: theme.text }]}>Mood this week</Text>
            <View style={styles.moodWeekRow}>
              {weekDays.map((d) => {
                const r = reflections.find((x) => x.day === toDayKey(d));
                const Icon = r ? MOOD_ICONS[r.mood] : null;
                return (
                  <View key={d.toISOString()} style={styles.moodDay}>
                    <Text style={[styles.moodDayName, { color: theme.textSecondary }]}>
                      {weekdayFmt.format(d)}
                    </Text>
                    {Icon && r ? (
                      <Icon size={22} color={MOOD_COLORS[r.mood]} strokeWidth={2} />
                    ) : (
                      <View style={[styles.moodEmpty, { borderColor: theme.outlineVariant }]} />
                    )}
                  </View>
                );
              })}
            </View>
            {reflections.length === 0 ? (
              <Text style={[styles.statLine, { color: theme.textMuted }]}>
                No reflections yet. Open a day in Day view to add one.
              </Text>
            ) : (
              <>
                <Text style={[styles.statLine, { color: theme.textSecondary }]}>
                  Average mood: {averageMood(reflections)?.toFixed(1)} / 5
                </Text>
                {reflections
                  .filter((r) => r.note)
                  .map((r) => {
                    const [y, m, dd] = r.day.split("-").map(Number);
                    return (
                      <Text key={r.day} style={[styles.statLine, { color: theme.textSecondary }]}>
                        {`${weekdayFmt.format(new Date(y, m - 1, dd))} · ${MOOD_LABELS[r.mood]}: ${r.note}`}
                      </Text>
                    );
                  })}
              </>
            )}
          </View>
        )}

        {!loading && stats.length === 0 && (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No tasks scheduled this week yet.
          </Text>
        )}

        {!loading &&
          stats.map((s) => {
            const targetText = goalTargets[s.category] ?? "";
            const gap = calculateGoalGap(parseFloat(targetText), s.plannedHours);

            return (
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
                  Focused: {s.focusedHours.toFixed(1)}h
                </Text>
                <Text style={[styles.statLine, { color: theme.textSecondary }]}>
                  Substituted: {s.substitutedCount}
                </Text>
                <Text style={[styles.statLine, { color: theme.textSecondary }]}>
                  Not yet logged: {s.unloggedCount}
                </Text>

                <View style={styles.goalRow}>
                  <Text style={[styles.goalLabel, { color: theme.textSecondary }]}>
                    Weekly goal (hours)
                  </Text>
                  <TextInput
                    style={[styles.goalInput, { color: theme.text, borderColor: theme.outlineVariant }]}
                    keyboardType="numeric"
                    value={targetText}
                    onChangeText={(text) =>
                      setGoalTargets((prev) => ({ ...prev, [s.category]: text }))
                    }
                    placeholder="e.g. 5"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                {gap !== null && gap > 0 && (
                  <Text style={[styles.pendingText, { color: theme.error }]}>
                    {gap.toFixed(1)}h gap: schedule more time for this category
                  </Text>
                )}
                {gap === 0 && (
                  <Text style={[styles.pendingText, { color: theme.tertiary }]}>
                    Goal covered
                  </Text>
                )}
              </View>
            );
          })}
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
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  goalLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: RoundedGeometry.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
    textAlign: "center",
  },
  moodWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  moodDay: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  moodDayName: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  moodEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  pendingText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
});
