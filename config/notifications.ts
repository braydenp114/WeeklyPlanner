import * as Notifications from 'expo-notifications';

/** Prompts the user for OS notification permissions; returns true if granted. */
export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
