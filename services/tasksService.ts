import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekday' | 'custom';
export type BusyStatus = 'busy' | 'free';
export type Visibility = 'default' | 'public' | 'private';

export interface CustomRecurrenceRule {
  interval: number;
  unit: 'day' | 'week' | 'month' | 'year';
  daysOfWeek?: number[];
  endType: 'never' | 'on_date' | 'after_occurrences';
  endDate?: Timestamp;
  endOccurrences?: number;
}

export interface Task {
  id?: string;
  title: string;
  description: string | null;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  colorHex: string;
  busyStatus: BusyStatus;
  visibility: Visibility;
  startDate: Timestamp;
  endDate: Timestamp;
  allDay: boolean;
  recurrence: TaskRecurrence;
  recurrenceEndDate: Timestamp | null;
  customRecurrenceRule: CustomRecurrenceRule | null;
  notification: { type: string; minutesBefore: number } | null;
  ownerId: string;
  createdAt: Timestamp;
}

export type CreateTaskData = Omit<Task, 'id' | 'ownerId' | 'createdAt'>;
export type UpdateTaskData = Partial<Omit<Task, 'id' | 'ownerId' | 'createdAt'>>;

const TASKS_COLLECTION = 'tasks';

/**
 * Creates a new task in Firestore.
 * Infers the ownerId from the currently authenticated user.
 */
export async function createTask(data: CreateTaskData): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const docData = {
    ...data,
    ownerId: currentUser.uid,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, TASKS_COLLECTION), docData);
  return docRef.id;
}

/**
 * Retrieves tasks for the authenticated user within a specific date range.
 * Note: A composite index on (ownerId ASC, startDate ASC) is required for this query.
 * Note on Recurring Tasks: This query only fetches based on `startDate`. If a task was created before the range
 * but recurs within it, it will NOT be returned by this basic query. Client-side expansion or denormalization is needed later.
 */
export async function getTasksForRange(start: Date, end: Date): Promise<Task[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const startTimestamp = Timestamp.fromDate(start);
  const endTimestamp = Timestamp.fromDate(end);

  const q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', currentUser.uid),
    where('startDate', '>=', startTimestamp),
    where('startDate', '<=', endTimestamp)
  );

  const querySnapshot = await getDocs(q);
  const tasks: Task[] = [];
  querySnapshot.forEach((doc) => {
    tasks.push({ id: doc.id, ...doc.data() } as Task);
  });

  return tasks;
}

/**
 * Updates an existing task.
 */
export async function updateTask(id: string, data: UpdateTaskData): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const taskRef = doc(db, TASKS_COLLECTION, id);
  await updateDoc(taskRef, data);
}

/**
 * Deletes a task.
 */
export async function deleteTask(id: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const taskRef = doc(db, TASKS_COLLECTION, id);
  await deleteDoc(taskRef);
}
