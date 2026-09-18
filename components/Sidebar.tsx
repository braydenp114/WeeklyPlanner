import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { usePathname, router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NavIcon, NavIconName } from './NavIcon';
import { Colors, Typography, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { useThemePreference, ThemePreference } from '@/context/ThemePreferenceContext';

const NEXT_PREFERENCE: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const PREFERENCE_ICON: Record<ThemePreference, keyof typeof MaterialIcons.glyphMap> = {
  system: 'brightness-auto',
  light: 'light-mode',
  dark: 'dark-mode',
};

const PREFERENCE_LABEL: Record<ThemePreference, string> = {
  system: 'Match System',
  light: 'Light Mode',
  dark: 'Dark Mode',
};

const NAV_ITEMS = [
  { name: 'Weekly Grid', icon: 'gridview', route: '/' },
  { name: 'Unscheduled', icon: 'lists', route: '/explore' }, // using explore for unscheduled for now
  { name: 'Analytics', icon: 'analytics', route: '/analytics' },
];

export function Sidebar() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();
  const { openNewTaskModal } = useNav();
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={[styles.container, { backgroundColor: theme.glassBackground, borderRightColor: theme.glassBorder }]}>
      <View style={styles.topSection}>
        {/* New Task Button */}
        <TouchableOpacity 
          style={[styles.newTaskButton, { backgroundColor: theme.primaryAction, borderRadius: RoundedGeometry.full }]}
          activeOpacity={0.8}
          onPress={() => openNewTaskModal()}
        >
          <NavIcon name="add" size={12} color="#FFFFFF" />
          <Text style={[styles.newTaskText, Typography.labelMd, { color: '#FFFFFF' }]}>New Task</Text>
        </TouchableOpacity>

        {/* Nav Items */}
        <View style={styles.navGroup}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.route;
            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.navItem,
                  { borderRadius: RoundedGeometry.default },
                  isActive && { backgroundColor: theme.primaryAction }
                ]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <NavIcon 
                  name={item.icon as NavIconName} 
                  size={20} 
                  color={isActive ? '#FFFFFF' : theme.textSecondary} 
                />
                <Text 
                  style={[
                    styles.navText, 
                    Typography.bodyMd, 
                    { color: isActive ? '#FFFFFF' : theme.textSecondary, fontWeight: isActive ? '600' : '400' }
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomSection}>
        {/* Settings */}
        <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
          <NavIcon name="gear" size={20} color={theme.textSecondary} />
          <Text style={[styles.settingsText, Typography.bodyMd, { color: theme.textSecondary }]}>Settings</Text>
        </TouchableOpacity>

        {/* Appearance toggle: tap to cycle System -> Light -> Dark -> System */}
        <TouchableOpacity
          style={styles.settingsItem}
          activeOpacity={0.7}
          onPress={() => setPreference(NEXT_PREFERENCE[preference])}
        >
          <MaterialIcons name={PREFERENCE_ICON[preference]} size={20} color={theme.textSecondary} />
          <Text style={[styles.settingsText, Typography.bodyMd, { color: theme.textSecondary }]}>
            {PREFERENCE_LABEL[preference]}
          </Text>
        </TouchableOpacity>



        <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />

        {/* User Profile */}
        <View style={styles.profileSection}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primaryAction }]}>
              <Text style={[styles.avatarText, Typography.labelMd, { color: '#FFFFFF' }]}>
                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, Typography.bodySm, { color: theme.text }]} numberOfLines={1}>
              {user?.email || 'Guest'}
            </Text>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                if (user) {
                  signOutUser();
                } else {
                  router.push('/login');
                }
              }}
            >
              <Text style={[styles.profilePlan, Typography.labelSm, { color: theme.primaryAction }]}>
                {user ? 'Sign Out' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
  },
  topSection: {
    gap: 24,
  },
  newTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  newTaskText: {
    fontWeight: '600',
  },
  navGroup: {
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  navText: {
    flex: 1,
  },
  bottomSection: {
    gap: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 12,
  },
  settingsText: {
    flex: 1,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  profilePlan: {
    fontSize: 10,
  }
});
