import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Slot, usePathname } from "expo-router";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Sidebar } from "@/components/Sidebar";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { NavProvider, useNav } from "@/context/NavContext";

function ResponsiveLayout() {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = Colors[colorScheme];
  const { isMobileMenuOpen, setIsMobileMenuOpen, isDesktop } = useNav();
  const pathname = usePathname();

  // Show FAB on mobile, specifically on the root (calendar) page
  const showFAB = !isDesktop && pathname === "/";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isDesktop && <Sidebar />}

      <View style={styles.mainContent}>
        <Slot />
        {showFAB && <FloatingActionButton onPress={() => {}} />}
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
  const isDesktop = width >= 768; // Tablet and up

  return (
    <NavProvider isDesktop={isDesktop}>
      <ResponsiveLayout />
    </NavProvider>
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
