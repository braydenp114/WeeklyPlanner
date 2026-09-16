import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, Fonts, RoundedGeometry, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type RecurringActionScope = 'this' | 'all';

interface RecurringActionDialogProps {
  visible: boolean;
  mode: 'edit' | 'delete';
  isLoading?: boolean;
  onConfirm: (scope: RecurringActionScope) => void;
  onClose: () => void;
}

export function RecurringActionDialog({
  visible,
  mode,
  isLoading = false,
  onConfirm,
  onClose,
}: RecurringActionDialogProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const [selectedScope, setSelectedScope] = useState<RecurringActionScope>('this');

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedScope('this');
    }
  }, [visible]);

  if (!visible) return null;

  const title = mode === 'edit' ? 'Edit recurring event' : 'Delete recurring event';
  const confirmLabel = mode === 'edit' ? 'OK' : 'Delete';
  const isDestructive = mode === 'delete';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        
        <View style={[styles.dialogCard, { backgroundColor: theme.surfaceContainerHighest, borderColor: theme.outlineVariant }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioRow} 
              activeOpacity={0.7} 
              onPress={() => setSelectedScope('this')}
            >
              <MaterialIcons 
                name={selectedScope === 'this' ? 'radio-button-checked' : 'radio-button-unchecked'} 
                size={22} 
                color={selectedScope === 'this' ? theme.primaryAction : theme.onSurfaceVariant} 
              />
              <Text style={[styles.radioText, { color: theme.text }]}>This event</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.radioRow} 
              activeOpacity={0.7} 
              onPress={() => setSelectedScope('all')}
            >
              <MaterialIcons 
                name={selectedScope === 'all' ? 'radio-button-checked' : 'radio-button-unchecked'} 
                size={22} 
                color={selectedScope === 'all' ? theme.primaryAction : theme.onSurfaceVariant} 
              />
              <Text style={[styles.radioText, { color: theme.text }]}>All events</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <HoverableButton 
              style={[styles.button, styles.cancelButton, { borderColor: theme.outlineVariant }]} 
              onPress={onClose}
              disabled={isLoading}
              isCancel
              theme={theme}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
            </HoverableButton>
            
            <HoverableButton 
              style={styles.button} 
              onPress={() => onConfirm(selectedScope)}
              disabled={isLoading}
              isDestructive={isDestructive}
              theme={theme}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
              )}
            </HoverableButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const HoverableButton = ({ onPress, style, disabled, isDestructive, isCancel, theme, children }: any) => {
  const [isHovered, setIsHovered] = React.useState(false);

  // Destructive base colors
  const destructiveBase = '#dc2626'; // clear solid red
  const destructiveHover = '#b91c1c'; // darker red

  // Cancel base colors
  const cancelBase = theme.surfaceContainer;
  const cancelHover = theme.surfaceContainerHigh;

  const baseBg = isDestructive ? destructiveBase : (isCancel ? cancelBase : theme.primaryAction);
  const hoverBg = isDestructive ? destructiveHover : (isCancel ? cancelHover : theme.primary);

  const dynamicStyle = Platform.OS === 'web'
    ? {
        backgroundColor: isHovered ? hoverBg : baseBg,
        transition: 'all 150ms ease',
        transform: isHovered ? [{ scale: 1.03 }] : [{ scale: 1 }],
        cursor: 'pointer',
        ...(isHovered && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
        }),
      }
    : {
        backgroundColor: baseBg,
      };

  const bind = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[style, dynamicStyle]}
      onPress={onPress}
      disabled={disabled}
      {...bind as any}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: RoundedGeometry.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontFamily: Fonts.headline,
    fontSize: Typography.headlineMobile.fontSize,
    fontWeight: '700',
    marginBottom: 20,
  },
  radioGroup: {
    marginBottom: 24,
    gap: 16,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RoundedGeometry.default,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontFamily: Fonts.headline,
    fontSize: 14,
    fontWeight: '600',
  },
});
