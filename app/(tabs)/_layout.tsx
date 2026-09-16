import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Slot } from "expo-router";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Sidebar } from "@/components/Sidebar";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { NavProvider, useNav } from "@/context/NavContext";
import { TaskProvider } from "@/context/TaskContext";

function ResponsiveLayout() {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = Colors[colorScheme];
  const { isMobileMenuOpen, setIsMobileMenuOpen, isDesktop } = useNav();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isDesktop && <Sidebar />}

      <View style={styles.mainContent}>
        <Slot />
      </View>

      {!isDesktop && (
        <HamburgerMenu
          visible={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <TaskProvider>
      <NavProvider isDesktop={isDesktop}>
        <ResponsiveLayout />
      </NavProvider>
    </TaskProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  mainContent: {
    flex: 1,
    position: "relative",
  },
});
