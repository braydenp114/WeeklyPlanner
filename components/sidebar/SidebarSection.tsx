import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SidebarSectionProps {
  title: string;
  /** Shows a "+" button next to the title (e.g. "add a streak"). */
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}

/** A collapsible group in the sidebar, like "My calendars" in Google Calendar. */
export function SidebarSection({ title, onAdd, addLabel, children, initiallyOpen = true }: SidebarSectionProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = Colors[scheme];
  const [open, setOpen] = useState(initiallyOpen);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.titleButton} onPress={() => setOpen(!open)} activeOpacity={0.6}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        </TouchableOpacity>
        {onAdd && (
          <TouchableOpacity
            onPress={onAdd}
            style={styles.iconButton}
            accessibilityLabel={addLabel ?? `Add to ${title}`}
          >
            <Plus size={18} color={theme.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setOpen(!open)}
          style={styles.iconButton}
          accessibilityLabel={open ? `Collapse ${title}` : `Expand ${title}`}
        >
          <Chevron size={18} color={theme.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleButton: {
    flex: 1,
    paddingVertical: 6,
    paddingLeft: 12,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 2,
  },
});
