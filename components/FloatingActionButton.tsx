import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, ViewStyle } from 'react-native';
import { NavIcon } from './NavIcon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface FloatingActionButtonProps {
  onPress: () => void;
}

export function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: theme.primaryAction,
            shadowColor: theme.primaryAction,
          },
        ]}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <NavIcon name="add" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    ...Platform.select({
      web: {
        position: 'fixed',
      },
    }),
  } as ViewStyle,
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
