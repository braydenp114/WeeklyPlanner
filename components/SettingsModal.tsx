import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Typography, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  isCalendarSyncEnabled,
  setCalendarSyncEnabled,
  fullResync,
  disableAndCleanUpSync,
} from '@/services/calendarSyncService';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];

  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      isCalendarSyncEnabled().then(setIsSyncEnabled);
    }
  }, [visible]);

  const handleToggleSync = async (newValue: boolean) => {
    if (Platform.OS === 'web') return; // Not available on web

    if (newValue) {
      // Trying to enable
      Alert.alert(
        'Enable Calendar Sync',
        'A new device calendar named "WeeklyPlanner" will be created and your tasks will be synced to it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              setLoading(true);
              try {
                const { status } = await Calendar.requestCalendarPermissionsAsync();
                if (status === 'granted') {
                  await setCalendarSyncEnabled(true);
                  setIsSyncEnabled(true);
                  await fullResync();
                  Alert.alert('Success', 'Calendar sync is now enabled.');
                } else {
                  Alert.alert(
                    'Permission Required',
                    'Calendar permission is required to sync your tasks. You can enable it in your device Settings.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
                  );
                  setIsSyncEnabled(false);
                }
              } catch (err) {
                console.error('Error enabling sync:', err);
                setIsSyncEnabled(false);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } else {
      // Trying to disable
      setLoading(true);
      try {
        await disableAndCleanUpSync();
        setIsSyncEnabled(false);
      } catch (err) {
        console.error('Error disabling sync:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleForceResync = async () => {
    setLoading(true);
    try {
      await fullResync();
      Alert.alert('Success', 'Force resync completed.');
    } catch (err) {
      console.error('Error force resyncing:', err);
      Alert.alert('Error', 'Failed to force resync.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
          <View style={[styles.header, { borderBottomColor: theme.outlineVariant }]}>
            <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {Platform.OS === 'web' ? (
              <Text style={[styles.description, { color: theme.textMuted }]}>
                Calendar sync is available on the mobile app.
              </Text>
            ) : (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>Calendar Sync</Text>
                    <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                      Sync tasks to your device calendar
                    </Text>
                  </View>
                  <Switch
                    value={isSyncEnabled}
                    onValueChange={handleToggleSync}
                    disabled={loading}
                    trackColor={{ false: theme.outlineVariant, true: theme.primaryAction }}
                    thumbColor="#fff"
                  />
                </View>

                {isSyncEnabled && (
                  <TouchableOpacity
                    style={[styles.resyncButton, { borderColor: theme.outlineVariant }]}
                    onPress={handleForceResync}
                    disabled={loading}
                  >
                    <MaterialIcons name="sync" size={20} color={theme.primaryAction} />
                    <Text style={[styles.resyncText, { color: theme.primaryAction }]}>Force Resync</Text>
                  </TouchableOpacity>
                )}

                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.primaryAction} />
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: RoundedGeometry.default,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: Typography.headlineMobile.fontFamily,
    fontSize: Typography.headlineMobile.fontSize,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  description: {
    fontFamily: Typography.bodyMd.fontFamily,
    fontSize: Typography.bodyMd.fontSize,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontFamily: Typography.bodyMd.fontFamily,
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontFamily: Typography.bodySm.fontFamily,
    fontSize: Typography.bodySm.fontSize,
  },
  resyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RoundedGeometry.sm,
    borderWidth: 1,
    marginTop: 8,
  },
  resyncText: {
    fontFamily: Typography.labelMd.fontFamily,
    fontSize: Typography.labelMd.fontSize,
    fontWeight: '600',
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
});
