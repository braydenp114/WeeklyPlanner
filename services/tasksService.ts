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
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { generateOccurrenceDates, getRecurrenceEndBound, MAX_OCCURRENCES_PER_TASK } from '../utils/expandRecurrences';

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
  category: string | null;
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
  seriesId?: string;
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

  const baseDocData = {
    ...data,
    ownerId: currentUser.uid,
    createdAt: serverTimestamp(),
  };

  if (data.recurrence === 'none') {
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), baseDocData);
    return docRef.id;
  }

  // Materialize recurring occurrences
  const seriesId = doc(collection(db, TASKS_COLLECTION)).id;
  
  const taskStart = data.startDate.toDate();
  const taskEnd = data.endDate.toDate();
  const durationMs = taskEnd.getTime() - taskStart.getTime();

  // Bounded generation: max 2 years forward for 'never' ends
  const rangeEnd = new Date(taskStart.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
  const recurrenceEndBound = getRecurrenceEndBound(data as Task, rangeEnd);
  
  const occurrenceDates = generateOccurrenceDates(
    data.recurrence,
    data.customRecurrenceRule,
    taskStart,
    recurrenceEndBound
  );

  const startHours = taskStart.getHours();
  const startMinutes = taskStart.getMinutes();
  const startSeconds = taskStart.getSeconds();

  const batch = writeBatch(db);
  let batchCount = 0;
  let totalEmitted = 0;
  const maxOccurrences = data.customRecurrenceRule?.endOccurrences ?? undefined;
  
  let firstDocId = '';

  for (const occDate of occurrenceDates) {
    if (totalEmitted >= MAX_OCCURRENCES_PER_TASK) break;
    if (maxOccurrences !== undefined && totalEmitted >= maxOccurrences) break;

    occDate.setHours(startHours, startMinutes, startSeconds, 0);
    const occEnd = new Date(occDate.getTime() + durationMs);

    const docRef = doc(collection(db, TASKS_COLLECTION));
    if (totalEmitted === 0) firstDocId = docRef.id;

    const occData = {
      ...baseDocData,
      seriesId, // Link them all to the same series
      startDate: Timestamp.fromDate(occDate),
      endDate: Timestamp.fromDate(occEnd),
    };

    batch.set(docRef, occData);
    batchCount++;
    totalEmitted++;
  }

  if (batchCount > 0) {
    await batch.commit();
  } else {
    // Fallback if no occurrences generated for some reason
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), baseDocData);
    return docRef.id;
  }
  
  return firstDocId;
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
 * Retrieves recurring task definitions that could potentially recur into a given range.
 *
 * Queries: ownerId == currentUser.uid, startDate <= rangeEnd
 * Client-side filters:
 *   - recurrence !== 'none'
 *   - recurrenceEndDate is null OR recurrenceEndDate >= rangeStart (skip expired recurring tasks)
 *
 * NOTE: Requires a composite index on (ownerId ASC, startDate ASC) — same index as getTasksForRange.
 *
 * KNOWN SCALING LIMITATION: For users with many years of recurring tasks, this query still reads all
 * non-expired recurring definitions. At very large scale, consider denormalizing occurrences or adding
 * server-side recurrence expansion.
 */
export async function getRecurringTasks(rangeStart: Date, rangeEnd: Date): Promise<Task[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const rangeEndTimestamp = Timestamp.fromDate(rangeEnd);
  const rangeStartTimestamp = Timestamp.fromDate(rangeStart);

  // Fetch all user tasks that started on or before rangeEnd
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', currentUser.uid),
    where('startDate', '<=', rangeEndTimestamp)
  );

  const querySnapshot = await getDocs(q);
  const tasks: Task[] = [];
  querySnapshot.forEach((docSnap) => {
    const data = { id: docSnap.id, ...docSnap.data() } as Task;

    // Client-side filter: only recurring tasks
    if (data.recurrence === 'none') return;

    // Client-side filter: skip expired recurring tasks whose end date is before the visible range
    if (data.recurrenceEndDate) {
      const endDate = data.recurrenceEndDate.toDate();
      if (endDate < rangeStart) return;
    }

    tasks.push(data);
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

/**
 * Retrieves a single task by ID.
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const { getDoc } = await import('firebase/firestore');
  const taskRef = doc(db, TASKS_COLLECTION, id);
  const docSnap = await getDoc(taskRef);
  
  if (docSnap.exists() && docSnap.data().ownerId === currentUser.uid) {
    return { id: docSnap.id, ...docSnap.data() } as Task;
  }
  return null;
}
