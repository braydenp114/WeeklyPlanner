import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions, TouchableWithoutFeedback, Image } from 'react-native';
import { usePathname, router } from 'expo-router';
import { NavIcon, NavIconName } from './NavIcon';
import { Colors, Typography, RoundedGeometry } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';

const NAV_ITEMS = [
  { name: 'Weekly Grid', icon: 'gridview', route: '/' },
  { name: 'Unscheduled', icon: 'lists', route: '/explore' },
  { name: 'Analytics', icon: 'analytics', route: '/analytics' },
];

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function HamburgerMenu({ visible, onClose }: HamburgerMenuProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const pathname = usePathname();
  const { user } = useAuth();

  const slideAnim = useMemo(() => new Animated.Value(-300), []);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlayContainer}>
        {/* Scrim Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        {/* Sliding Menu Panel */}
        <Animated.View
          style={[
            styles.menuPanel,
            {
              backgroundColor: theme.surface,
              borderRightColor: theme.outlineVariant,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <View style={styles.topSection}>
            <View style={styles.header}>
              <Text style={[Typography.headlineMobile, { color: theme.text }]}>Menu</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={{ color: theme.text, fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>

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
                    onPress={() => {
                      onClose();
                      router.push(item.route as any);
                    }}
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
            <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
              <NavIcon name="gear" size={20} color={theme.textSecondary} />
              <Text style={[styles.settingsText, Typography.bodyMd, { color: theme.textSecondary }]}>Settings</Text>
            </TouchableOpacity>



            <View style={[styles.divider, { backgroundColor: theme.outlineVariant }]} />

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
                      import('@/config/firebase').then(({ auth }) => {
                        auth.signOut();
                        onClose();
                      });
                    } else {
                      onClose();
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuPanel: {
    width: 280,
    height: '100%',
    borderRightWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  topSection: {
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  closeBtn: {
    padding: 8,
  },
  navGroup: {
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
