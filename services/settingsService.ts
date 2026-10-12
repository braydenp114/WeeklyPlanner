import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";

const SETTINGS_COLLECTION = "userSettings";
const LOCATION_LOGS_COLLECTION = "locationLogs";

function requireUser() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");
  return currentUser;
}

/** Location sharing is on until the user turns it off. */
export async function getLocationSharing(): Promise<boolean> {
  const currentUser = requireUser();
  const snap = await getDoc(doc(db, SETTINGS_COLLECTION, currentUser.uid));
  if (!snap.exists()) return true;
  return snap.data().locationSharingEnabled !== false;
}

export async function setLocationSharing(enabled: boolean): Promise<void> {
  const currentUser = requireUser();
  await setDoc(
    doc(db, SETTINGS_COLLECTION, currentUser.uid),
    { locationSharingEnabled: enabled },
    { merge: true },
  );
}

/** Deletes every saved location log for the signed-in user. Returns how many were removed. */
export async function deleteLocationHistory(): Promise<number> {
  const currentUser = requireUser();
  const q = query(
    collection(db, LOCATION_LOGS_COLLECTION),
    where("ownerId", "==", currentUser.uid),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  let removed = 0;
  let batch = writeBatch(db);
  let count = 0;
  for (const d of snapshot.docs) {
    batch.delete(d.ref);
    count++;
    removed++;
    if (count === 490) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
  return removed;
}
