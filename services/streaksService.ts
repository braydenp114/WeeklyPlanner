import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/** A streak challenge the user checks in on every day (e.g. "Read 20 pages"). */
export interface StreakChallenge {
  id: string;
  title: string;
  /** Key of the chosen icon (see components/streakIcons.tsx). */
  icon: string;
  colorHex: string;
  /** Whether the streak band is drawn on the month view. */
  showOnCalendar: boolean;
  /** Days the user checked in, as YYYY-MM-DD (local date). */
  checkIns: string[];
  /** When the challenge was created (its streak starts counting from this day). */
  startDate: Date;
}

export type StreakChallengeInput = Pick<StreakChallenge, 'title' | 'icon' | 'colorHex' | 'showOnCalendar'>;

const STREAKS_COLLECTION = 'streaks';

function requireUser() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');
  return currentUser;
}

export async function getStreakChallenges(): Promise<StreakChallenge[]> {
  const user = requireUser();
  const q = query(collection(db, STREAKS_COLLECTION), where('ownerId', '==', user.uid));
  const snapshot = await getDocs(q);
  const challenges: StreakChallenge[] = [];
  snapshot.forEach((d) => {
    const data = d.data();
    challenges.push({
      id: d.id,
      title: data.title,
      icon: data.icon,
      colorHex: data.colorHex,
      showOnCalendar: data.showOnCalendar !== false,
      checkIns: data.checkIns ?? [],
      startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(),
    });
  });
  // Oldest first, so the list (and the bands on the calendar) keep a stable order
  return challenges.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export async function addStreakChallenge(input: StreakChallengeInput): Promise<string> {
  const user = requireUser();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const ref = await addDoc(collection(db, STREAKS_COLLECTION), {
    ...input,
    title: input.title.trim(),
    checkIns: [],
    startDate: Timestamp.fromDate(start),
    ownerId: user.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStreakChallenge(id: string, input: Partial<StreakChallengeInput>): Promise<void> {
  requireUser();
  await updateDoc(doc(db, STREAKS_COLLECTION, id), input);
}

/** Checks in (or undoes the check-in) for one day. */
export async function setCheckIn(id: string, dayKey: string, checkedIn: boolean): Promise<void> {
  requireUser();
  await updateDoc(doc(db, STREAKS_COLLECTION, id), {
    checkIns: checkedIn ? arrayUnion(dayKey) : arrayRemove(dayKey),
  });
}

export async function deleteStreakChallenge(id: string): Promise<void> {
  requireUser();
  await deleteDoc(doc(db, STREAKS_COLLECTION, id));
}
