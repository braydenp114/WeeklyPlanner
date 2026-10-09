import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { DailyReflection, Mood } from '@/utils/reflection';

/**
 * End-of-day reflections. One document per user per day, with the id "<uid>_<YYYY-MM-DD>",
 * so saving the same day again just overwrites it.
 */
const REFLECTIONS_COLLECTION = 'reflections';

function requireUser() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');
  return currentUser;
}

/**
 * Reflections for the days between fromDay and toDay (inclusive, YYYY-MM-DD).
 * The security rules only allow reading your own documents, so we query by ownerId
 * (reading a missing document by id would be denied) and filter the days here.
 */
export async function getReflections(fromDay: string, toDay: string): Promise<DailyReflection[]> {
  const user = requireUser();
  const q = query(collection(db, REFLECTIONS_COLLECTION), where('ownerId', '==', user.uid));
  const snapshot = await getDocs(q);
  const result: DailyReflection[] = [];
  snapshot.forEach((d) => {
    const data = d.data();
    if (data.day >= fromDay && data.day <= toDay) {
      result.push({ day: data.day, mood: data.mood as Mood, note: data.note ?? '' });
    }
  });
  return result.sort((a, b) => a.day.localeCompare(b.day));
}

export async function saveReflection(day: string, mood: Mood, note: string): Promise<void> {
  const user = requireUser();
  await setDoc(doc(db, REFLECTIONS_COLLECTION, `${user.uid}_${day}`), {
    ownerId: user.uid,
    day,
    mood,
    note: note.trim(),
    updatedAt: serverTimestamp(),
  });
}
