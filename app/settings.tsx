import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Typography, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference, ThemePreference } from '@/context/ThemePreferenceContext';
import { useTravelSettings } from '@/context/TravelSettingsContext';
import { TravelMode } from '@/services/travelTimeService';

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Match System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const TRAVEL_MODE_OPTIONS: { value: TravelMode; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'DRIVE', label: 'Driving (Traffic-Aware)', icon: 'directions-car' },
  { value: 'TRANSIT', label: 'Public Transit', icon: 'directions-transit' },
  { value: 'WALK', label: 'Walking', icon: 'directions-walk' },
];

const BUFFER_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes (Recommended)' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
];

export default function SettingsScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const { preference, setPreference } = useThemePreference();
  const { travelMode, setTravelMode, comfortBufferMinutes, setComfortBufferMinutes } = useTravelSettings();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[Typography.headlineMobile, { color: theme.text }]}>Settings</Text>
      </View>

      <Text style={[Typography.labelMd, styles.sectionTitle, { color: theme.textSecondary }]}>Appearance</Text>
      <View style={[styles.section, { backgroundColor: theme.surface, borderRadius: RoundedGeometry.default }]}>
        {APPEARANCE_OPTIONS.map((option, index) => {
          const selected = preference === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.row,
                index > 0 && { borderTopWidth: 1, borderTopColor: theme.outlineVariant },
              ]}
              activeOpacity={0.7}
              onPress={() => setPreference(option.value)}
              accessibilityState={{ selected }}
            >
              <Text style={[Typography.bodyMd, { color: theme.text, flex: 1 }]}>{option.label}</Text>
              {selected && <MaterialIcons name="check" size={20} color={theme.primaryAction} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[Typography.labelMd, styles.sectionTitle, { color: theme.textSecondary }]}>Travel & Schedule Feasibility</Text>
      <Text style={[Typography.bodySm, { color: theme.textSecondary, marginLeft: 4, marginTop: -8, fontSize: 13 }]}>
        Used to calculate travel time between location-based tasks and detect scheduling conflicts.
      </Text>
      <View style={[styles.section, { backgroundColor: theme.surface, borderRadius: RoundedGeometry.default }]}>
        {TRAVEL_MODE_OPTIONS.map((option, index) => {
          const selected = travelMode === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.row,
                index > 0 && { borderTopWidth: 1, borderTopColor: theme.outlineVariant },
              ]}
              activeOpacity={0.7}
              onPress={() => setTravelMode(option.value)}
              accessibilityState={{ selected }}
            >
              <MaterialIcons name={option.icon} size={20} color={selected ? theme.primaryAction : theme.textSecondary} />
              <Text style={[Typography.bodyMd, { color: theme.text, flex: 1 }]}>{option.label}</Text>
              {selected && <MaterialIcons name="check" size={20} color={theme.primaryAction} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[Typography.labelMd, styles.sectionTitle, { color: theme.textSecondary }]}>Safety / Comfort Buffer</Text>
      <Text style={[Typography.bodySm, { color: theme.textSecondary, marginLeft: 4, marginTop: -8, fontSize: 13 }]}>
        Minimum buffer time desired between arrival and your next scheduled task.
      </Text>
      <View style={[styles.section, { backgroundColor: theme.surface, borderRadius: RoundedGeometry.default }]}>
        {BUFFER_OPTIONS.map((option, index) => {
          const selected = comfortBufferMinutes === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.row,
                index > 0 && { borderTopWidth: 1, borderTopColor: theme.outlineVariant },
              ]}
              activeOpacity={0.7}
              onPress={() => setComfortBufferMinutes(option.value)}
              accessibilityState={{ selected }}
            >
              <Text style={[Typography.bodyMd, { color: theme.text, flex: 1 }]}>{option.label}</Text>
              {selected && <MaterialIcons name="check" size={20} color={theme.primaryAction} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  sectionTitle: {
    marginTop: 8,
    marginLeft: 4,
  },
  section: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
});
