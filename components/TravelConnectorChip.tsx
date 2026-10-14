import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts, RoundedGeometry, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TaskItem } from './calendar-shared';
import {
  TravelMode,
  TravelEstimate,
  getTravelTimeEstimate,
} from '@/services/travelTimeService';
import {
  calculateFeasibility,
  FeasibilityResult,
  DEPARTURE_OFFSET_MS,
} from '@/utils/travelFeasibility';

interface TravelConnectorChipProps {
  fromTask: TaskItem;
  toTask: TaskItem;
  travelMode: TravelMode;
  bufferMinutes: number;
  rowHeight: number;
}

/**
 * Renders an inline travel time chip and feasibility indicator between consecutive location-tagged tasks on the grid.
 */
export function TravelConnectorChip({
  fromTask,
  toTask,
  travelMode,
  bufferMinutes,
  rowHeight,
}: TravelConnectorChipProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];

  const [estimate, setEstimate] = useState<TravelEstimate | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const fromData = fromTask.originalTaskData;
  const toData = toTask.originalTaskData;

  const fromEndMs = fromData.endDate.toDate().getTime();
  const toStartMs = toData.startDate.toDate().getTime();
  const scheduledGapMinutes = Math.round((toStartMs - fromEndMs) / (60 * 1000));

  useEffect(() => {
    let cancelled = false;

    if (
      typeof fromData.latitude !== 'number' ||
      typeof fromData.longitude !== 'number' ||
      typeof toData.latitude !== 'number' ||
      typeof toData.longitude !== 'number'
    ) {
      return;
    }

    const departureIso = new Date(fromData.endDate.toDate().getTime() + DEPARTURE_OFFSET_MS).toISOString();

    getTravelTimeEstimate({
      origin: { latitude: fromData.latitude, longitude: fromData.longitude },
      destination: { latitude: toData.latitude, longitude: toData.longitude },
      travelMode,
      departureTime: departureIso,
    })
      .then((res) => {
        if (!cancelled) {
          setEstimate(res);
        }
      })
      .catch((err) => {
        console.warn('[TravelConnectorChip] Error loading travel estimate:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [
    fromData.latitude,
    fromData.longitude,
    toData.latitude,
    toData.longitude,
    fromData.endDate,
    travelMode,
  ]);


  if (!estimate) {
    return null;
  }

  // Calculate feasibility
  const feasibility: FeasibilityResult = calculateFeasibility(
    scheduledGapMinutes,
    estimate.durationMinutes,
    bufferMinutes
  );

  // Position calculation
  const endHour = fromTask.startHour + fromTask.durationHours;
  const startHour = toTask.startHour;
  const gapHours = startHour - endHour;

  let topPx = endHour * rowHeight + 2;
  let heightPx = Math.max(22, gapHours * rowHeight - 4);

  // If tasks overlap or gap is 0, render a compact badge floating near the junction
  if (gapHours <= 0) {
    topPx = Math.max(0, toTask.startHour * rowHeight - 20);
    heightPx = 20;
  }

  // Determine styling based on feasibility status
  let borderColor = theme.outlineVariant;
  let bgColor = theme.surfaceContainer;
  let textColor = theme.textSecondary;
  let statusIcon: keyof typeof MaterialIcons.glyphMap = 'directions-car';

  if (estimate.travelMode === 'TRANSIT') statusIcon = 'directions-transit';
  if (estimate.travelMode === 'WALK') statusIcon = 'directions-walk';

  if (feasibility.status === 'overlap') {
    borderColor = '#ef4444';
    bgColor = scheme === 'dark' ? '#3b1212' : '#fee2e2';
    textColor = '#ef4444';
    statusIcon = 'warning';
  } else if (feasibility.status === 'infeasible') {
    borderColor = '#ef4444';
    bgColor = scheme === 'dark' ? '#3b1212' : '#fee2e2';
    textColor = '#ef4444';
    statusIcon = 'warning';
  } else if (feasibility.status === 'tight') {
    borderColor = '#f59e0b';
    bgColor = scheme === 'dark' ? '#362208' : '#fef3c7';
    textColor = '#d97706';
    statusIcon = 'schedule';
  } else {
    // Feasible
    borderColor = theme.outlineVariant;
    bgColor = theme.surfaceContainerLow;
    textColor = theme.textSecondary;
  }

  // Recommended departure time (leave previous task + pack-up buffer)
  const departureDate = new Date(fromEndMs + DEPARTURE_OFFSET_MS);
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setDetailsModalVisible(true)}
        style={[
          styles.chipContainer,
          {
            top: topPx,
            height: heightPx,
            backgroundColor: bgColor,
            borderColor,
          },
        ]}
      >
        <View style={styles.chipContent}>
          <MaterialIcons name={statusIcon} size={13} color={textColor} />
          <Text style={[styles.chipText, { color: textColor }]} numberOfLines={1}>
            {feasibility.status === 'overlap'
              ? 'Overlap'
              : feasibility.status === 'infeasible'
              ? `${estimate.durationMinutes}m (+${feasibility.shortfallMinutes}m late)`
              : feasibility.status === 'tight'
              ? `${estimate.durationMinutes}m (Tight)`
              : `${estimate.durationMinutes}m`}
          </Text>
          {estimate.trafficDelayMinutes > 5 && (
            <Text style={[styles.delayTag, { color: '#ef4444' }]} numberOfLines={1}>
              +{estimate.trafficDelayMinutes}m traffic
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Details modal on tap */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDetailsModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalDialog,
              { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name={statusIcon} size={20} color={textColor} />
                <Text style={[Typography.headlineMobile, { color: theme.text, fontSize: 18 }]}>
                  Travel & Feasibility
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <MaterialIcons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Route Summary */}
              <View style={[styles.infoRow, { borderBottomColor: theme.outlineVariant }]}>
                <Text style={[Typography.bodyMd, { color: theme.textSecondary }]}>From:</Text>
                <Text style={[Typography.bodyMd, { color: theme.text, fontWeight: '600', flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                  {fromTask.title}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: theme.outlineVariant }]}>
                <Text style={[Typography.bodyMd, { color: theme.textSecondary }]}>To:</Text>
                <Text style={[Typography.bodyMd, { color: theme.text, fontWeight: '600', flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                  {toTask.title}
                </Text>
              </View>

              {/* Estimate Details */}
              <View style={[styles.infoRow, { borderBottomColor: theme.outlineVariant }]}>
                <Text style={[Typography.bodyMd, { color: theme.textSecondary }]}>Travel Mode:</Text>
                <Text style={[Typography.bodyMd, { color: theme.text, fontWeight: '500' }]}>
                  {estimate.travelMode === 'DRIVE' ? 'Driving (Traffic-Aware)' : estimate.travelMode === 'TRANSIT' ? 'Public Transit' : 'Walking'}
                  {estimate.isTransitUnavailable ? ' (Driving Fallback)' : ''}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: theme.outlineVariant }]}>
                <Text style={[Typography.bodyMd, { color: theme.textSecondary }]}>Estimated Duration:</Text>
                <Text style={[Typography.bodyMd, { color: theme.text, fontWeight: '600' }]}>
                  {estimate.durationMinutes} min
                  {estimate.distanceMeters > 0 ? ` (${(estimate.distanceMeters / 1000).toFixed(1)} km)` : ''}
                </Text>
              </View>

              {estimate.trafficDelayMinutes > 0 && (
                <View style={[styles.infoRow, { borderBottomColor: theme.outlineVariant }]}>
                  <Text style={[Typography.bodyMd, { color: theme.textSecondary }]}>Live Traffic Delay:</Text>
                  <Text style={[Typography.bodyMd, { color: '#ef4444', fontWeight: '500' }]}>
                    +{estimate.trafficDelayMinutes} min (baseline: {estimate.staticDurationMinutes} min)
                  </Text>
                </View>
              )}

              {/* Scheduled Gap & Feasibility */}
              <View style={[styles.infoRow, { borderBottomColor: theme.outlineVariant }]}>
                <Text style={[Typography.bodyMd, { color: theme.textSecondary }]}>Scheduled Gap:</Text>
                <Text style={[Typography.bodyMd, { color: theme.text, fontWeight: '500' }]}>
                  {scheduledGapMinutes} min
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: theme.outlineVariant }]}>
                <Text style={[Typography.bodyMd, { color: theme.textSecondary }]}>Recommended Departure:</Text>
                <Text style={[Typography.bodyMd, { color: theme.text, fontWeight: '500' }]}>
                  Leave at {timeFmt.format(departureDate)}
                </Text>
              </View>

              {/* Status Banner */}
              <View
                style={[
                  styles.statusBanner,
                  {
                    backgroundColor: bgColor,
                    borderColor,
                  },
                ]}
              >
                <MaterialIcons name={statusIcon} size={18} color={textColor} />
                <Text style={[Typography.bodySm, { color: textColor, flex: 1, fontWeight: '500' }]}>
                  {feasibility.status === 'feasible' &&
                    `Feasible. Includes ${feasibility.slackMinutes} min spare comfort time beyond travel and ${bufferMinutes} min buffer.`}
                  {feasibility.status === 'tight' &&
                    `Tight schedule. Travel fits in the ${scheduledGapMinutes} min gap, but leaves only ${feasibility.slackMinutes} min comfort buffer.`}
                  {feasibility.status === 'infeasible' &&
                    `Infeasible. You need ${estimate.durationMinutes} min to travel, but only have a ${scheduledGapMinutes} min gap (${feasibility.shortfallMinutes} min shortfall).`}
                  {feasibility.status === 'overlap' &&
                    `Tasks overlap in time by ${Math.abs(scheduledGapMinutes)} minutes.`}
                </Text>
              </View>

              {estimate.isHeuristic && (
                <Text style={[Typography.labelSm, { color: theme.textMuted, marginTop: 4, fontWeight: '400' }]}>
                  * Calculated using offline baseline estimate.
                </Text>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chipContainer: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderWidth: 1,
    borderRadius: RoundedGeometry.sm,
    paddingHorizontal: 6,
    justifyContent: 'center',
    zIndex: 10,
    opacity: 0.95,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '600',
  },
  delayTag: {
    fontFamily: Fonts.body,
    fontSize: 10,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RoundedGeometry.default,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBody: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RoundedGeometry.sm,
    borderWidth: 1,
    marginTop: 6,
  },
});
