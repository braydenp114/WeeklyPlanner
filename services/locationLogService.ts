import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import type { PresetLocation } from "../constants/presetLocations";

const LOCATION_LOGS_COLLECTION = "locationLogs";

export async function logArrival(preset: PresetLocation): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");
  await addDoc(collection(db, LOCATION_LOGS_COLLECTION), {
    ownerId: currentUser.uid,
    presetId: preset.id,
    name: preset.name,
    locationType: preset.type,
    arrivedAt: serverTimestamp(),
  });
}
