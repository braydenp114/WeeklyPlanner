import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Slot, usePathname } from "expo-router";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Sidebar } from "@/components/Sidebar";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import NewTaskModal from "@/components/NewTaskModal";
import { NavProvider, useNav } from "@/context/NavContext";
import { StreaksProvider } from "@/context/StreaksContext";
import { useReminderSync } from "@/hooks/use-task-reminders";
import { FocusProvider } from "@/context/FocusContext";
import { FocusBar } from "@/components/FocusBar";

function ResponsiveLayout() {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = Colors[colorScheme];
  const { 
    isMobileMenuOpen, setIsMobileMenuOpen, isDesktop, 
    isNewTaskModalOpen, closeNewTaskModal, openNewTaskModal,
    newTaskPrefillDate, newTaskPrefillHour, refreshTasks, taskRefreshKey
  } = useNav();
  // Keep the phone's task reminders in sync with the saved tasks
  useReminderSync(taskRefreshKey);
  const pathname = usePathname();

  // Show FAB on mobile, specifically on the root (calendar) page
  const showFAB = !isDesktop && pathname === "/";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isDesktop && <Sidebar />}

      <View style={styles.mainContent}>
        <Slot />
        {showFAB && <FloatingActionButton onPress={() => openNewTaskModal()} />}
        <FocusBar bottomOffset={isDesktop ? 24 : 96} />
      </View>

      {!isDesktop && (
        <HamburgerMenu
          visible={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}

      <NewTaskModal
        visible={isNewTaskModalOpen}
        onClose={closeNewTaskModal}
        onSaved={refreshTasks}
        prefillDate={newTaskPrefillDate}
        prefillHour={newTaskPrefillHour}
      />
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; // Tablet and up

  return (
    <NavProvider isDesktop={isDesktop}>
      <StreaksProvider>
        <FocusProvider>
          <ResponsiveLayout />
        </FocusProvider>
      </StreaksProvider>
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
