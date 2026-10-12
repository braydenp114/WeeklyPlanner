import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/context/AuthContext";
import {
  getLocationSharing,
  setLocationSharing,
  deleteLocationHistory,
} from "@/services/settingsService";

function confirmAction(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert("Are you sure?", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}

function notify(message: string) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert(message);
}

export function LocationPrivacySection() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = Colors[scheme];
  const { user, loading: authLoading } = useAuth();

  const [sharing, setSharing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    getLocationSharing()
      .then(setSharing)
      .catch((e) => console.error("[LocationPrivacySection] load failed:", e))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  const handleToggle = async (value: boolean) => {
    setSharing(value);
    try {
      await setLocationSharing(value);
    } catch (e) {
      console.error("[LocationPrivacySection] save failed:", e);
      setSharing(!value);
      notify("Could not save your setting. Try again.");
    }
  };

  const handleDelete = () => {
    confirmAction(
      "This permanently deletes all your saved location history.",
      async () => {
        setDeleting(true);
        try {
          const removed = await deleteLocationHistory();
          notify(
            `Deleted ${removed} location record${removed === 1 ? "" : "s"}.`,
          );
        } catch (e) {
          console.error("[LocationPrivacySection] delete failed:", e);
          notify("Could not delete your location history. Try again.");
        } finally {
          setDeleting(false);
        }
      },
    );
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.heading, { color: theme.text }]}>Location</Text>
      {loading ? (
        <ActivityIndicator color={theme.primaryAction} />
      ) : (
        <>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceContainer,
                borderColor: theme.outlineVariant,
              },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Share my location
                </Text>
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  Lets the app notice when you arrive at campus or the gym. When
                  this is off, no location is checked or saved.
                </Text>
              </View>
              <Switch value={sharing} onValueChange={handleToggle} />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: theme.error }]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.7}
          >
            {deleting ? (
              <ActivityIndicator color={theme.error} />
            ) : (
              <Text style={[styles.deleteText, { color: theme.error }]}>
                Delete my location history
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12, marginTop: 8 },
  heading: { fontSize: 18, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  hint: { fontSize: 13, lineHeight: 18 },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteText: { fontSize: 15, fontWeight: "600" },
});
