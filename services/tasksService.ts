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
import { scheduleReminder } from '../hooks/use-task-reminders';
import { syncTaskToDevice, removeTaskFromDevice } from './calendarSyncService';

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

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
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
  /** Whether this task itself is marked as done. */
  completed?: boolean;
  /** When this task was marked as completed */
  completedAt?: Timestamp | null;
  /** How this task was marked completed */
  completedBy?: 'manual' | 'geofence' | null;
  /** Radius in meters for geofence (default 150) */
  geofenceRadiusMeters?: number;
  /** Whether this task has an attached sub-item checklist. */
  hasChecklist?: boolean;
  /** Sub-items shown when hasChecklist is true. */
  checklistItems?: ChecklistItem[];
  /** Whether this task represents a deadline to track (rather than a schedulable block). */
  isDeadline?: boolean;
  /** How many hours before the deadline to start warning, if no time has been allocated. */
  deadlineWarningHours?: number | null;
  /** If set, this regular task counts as "allocated time" toward the given deadline task's ID. */
  linkedDeadlineId?: string | null;
  /** What actually happened for this task, logged after its time block passed. */
  actualStatus?: 'as_planned' | 'different' | null;
  /** If actualStatus is 'different', what the user did instead. */
  substitutedActivity?: string | null;
  /** Optional diary-style note about how the task went. */
  actualNote?: string | null;
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
    await scheduleReminder(data);
    await syncTaskToDevice({ id: docRef.id, ...baseDocData } as Task & { id: string });
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
  const occurrencesToSync: (Task & { id: string })[] = [];

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
    occurrencesToSync.push({ id: docRef.id, ...occData } as Task & { id: string });
    batchCount++;
    totalEmitted++;
  }

  if (batchCount > 0) {
    await batch.commit();
    // Sync all generated occurrences
    for (const occ of occurrencesToSync) {
      await syncTaskToDevice(occ);
    }
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

  // Sync to device calendar
  const updatedTask = await getTaskById(id);
  if (updatedTask) {
    await syncTaskToDevice(updatedTask as Task & { id: string });
  }
}

/**
 * Updates all occurrences in a series with new shared data and shifts the dates relative to timeDeltaMs.
 */
export async function updateSeries(seriesId: string, data: UpdateTaskData, timeDeltaMs: number, durationMs: number | null = null): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', currentUser.uid),
    where('seriesId', '==', seriesId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  snapshot.docs.forEach((d) => {
    currentChunk.push(d);
    if (currentChunk.length === 490) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  });
  if (currentChunk.length > 0) chunks.push(currentChunk);

  // Exclude date fields from raw data since we are dynamically shifting them per-occurrence
  const { startDate, endDate, ...sharedData } = data;

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    const occurrencesToSync: (Task & { id: string })[] = [];

    for (const docSnap of chunk) {
      const taskData = docSnap.data();
      const origStart = taskData.startDate.toDate();
      const origEnd = taskData.endDate.toDate();

      const newStart = new Date(origStart.getTime() + timeDeltaMs);
      const newEnd = durationMs !== null 
        ? new Date(newStart.getTime() + durationMs)
        : new Date(origEnd.getTime() + timeDeltaMs);

      const newData = {
        ...sharedData,
        startDate: Timestamp.fromDate(newStart),
        endDate: Timestamp.fromDate(newEnd),
      };

      batch.update(docSnap.ref, newData);
      
      // Merge for sync
      occurrencesToSync.push({
        id: docSnap.id,
        ...taskData,
        ...newData,
      } as Task & { id: string });
    }
    await batch.commit();
    
    // Sync chunk
    for (const occ of occurrencesToSync) {
      await syncTaskToDevice(occ);
    }
  }
}

/**
 * Deletes a task.
 */
export async function deleteTask(id: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const taskRef = doc(db, TASKS_COLLECTION, id);
  await deleteDoc(taskRef);
  await removeTaskFromDevice(id);
}

/**
 * Deletes all tasks in a series.
 */
export async function deleteSeries(seriesId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', currentUser.uid),
    where('seriesId', '==', seriesId)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  // Firestore batch limit is 500, but our series cap is 366, so one batch is usually enough.
  // Still, we'll chunk it just to be perfectly safe.
  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  snapshot.docs.forEach((d) => {
    currentChunk.push(d.ref);
    if (currentChunk.length === 490) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  });
  if (currentChunk.length > 0) chunks.push(currentChunk);

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
    
    // Remove from device calendar
    for (const ref of chunk) {
      await removeTaskFromDevice(ref.id);
    }
  }
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

/**
 * Fetches all upcoming deadline tasks, for populating the "link to deadline" picker.
 */
export async function getUpcomingDeadlines(): Promise<Task[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const now = Timestamp.fromDate(new Date());

  const q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', currentUser.uid),
    where('isDeadline', '==', true),
    where('startDate', '>=', now)
  );

  const snapshot = await getDocs(q);
  const deadlines: Task[] = [];
  snapshot.forEach((doc) => {
    deadlines.push({ id: doc.id, ...doc.data() } as Task);
  });
  return deadlines;
}

export interface UnallocatedDeadline {
  task: Task;
  hoursUntilDeadline: number;
}

/**
 * Finds deadlines within their warning window that have no linked tasks
 * (i.e. no time has been allocated toward them).
 */
export async function getUnallocatedDeadlines(): Promise<UnallocatedDeadline[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const now = new Date();
  const lookahead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', currentUser.uid),
    where('isDeadline', '==', true),
    where('startDate', '>=', Timestamp.fromDate(now)),
    where('startDate', '<=', Timestamp.fromDate(lookahead))
  );

  const snapshot = await getDocs(q);
  const deadlines: Task[] = [];
  snapshot.forEach((doc) => {
    deadlines.push({ id: doc.id, ...doc.data() } as Task);
  });

  const results: UnallocatedDeadline[] = [];

  for (const deadline of deadlines) {
    const warningHours = deadline.deadlineWarningHours ?? 72;
    const deadlineDate = deadline.startDate.toDate();
    const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil > warningHours) continue;

    const linkedQuery = query(
      collection(db, TASKS_COLLECTION),
      where('ownerId', '==', currentUser.uid),
      where('linkedDeadlineId', '==', deadline.id)
    );
    const linkedSnapshot = await getDocs(linkedQuery);

    if (linkedSnapshot.empty) {
      results.push({ task: deadline, hoursUntilDeadline: hoursUntil });
    }
  }

  return results;
}
export interface LogActualParams {
  status: 'as_planned' | 'different';
  substitutedActivity?: string | null;
  note?: string | null;
}

/**
 * Logs what actually happened for a task, after its scheduled block has passed.
 */
export async function logTaskActual(id: string, params: LogActualParams): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const taskRef = doc(db, TASKS_COLLECTION, id);
  await updateDoc(taskRef, {
    actualStatus: params.status,
    substitutedActivity: params.status === 'different' ? (params.substitutedActivity?.trim() || null) : null,
    actualNote: params.note?.trim() || null,
    completed: params.status === 'as_planned' ? true : false,
  });
}

export interface CategoryReviewStats {
  category: string;
  plannedHours: number;
  completedAsPlannedHours: number;
  substitutedCount: number;
  unloggedCount: number;
}

/**
 * Aggregates a set of tasks (typically one week's worth) into per-category
 * planned-vs-actual stats for the Weekly Review screen.
 */
export function calculateWeeklyReview(tasks: Task[]): CategoryReviewStats[] {
  const statsByCategory = new Map<string, CategoryReviewStats>();

  for (const task of tasks) {
    if (task.isDeadline) continue; // deadlines aren't schedulable time, skip them

    const category = task.category || 'Uncategorized';
    if (!statsByCategory.has(category)) {
      statsByCategory.set(category, {
        category,
        plannedHours: 0,
        completedAsPlannedHours: 0,
        substitutedCount: 0,
        unloggedCount: 0,
      });
    }
    const stats = statsByCategory.get(category)!;

    const durationHours =
      (task.endDate.toDate().getTime() - task.startDate.toDate().getTime()) / (1000 * 60 * 60);
    stats.plannedHours += durationHours;

    if (task.actualStatus === 'as_planned') {
      stats.completedAsPlannedHours += durationHours;
    } else if (task.actualStatus === 'different') {
      stats.substitutedCount += 1;
    } else {
      const isPast = task.endDate.toDate().getTime() < Date.now();
      if (isPast) stats.unloggedCount += 1;
    }
  }

  return Array.from(statsByCategory.values());
}

/**
 * Retrieves all incomplete, location-tagged tasks (and next occurrences of recurring tasks)
 * scheduled within the next 48 hours. Used for syncing geofence regions.
 */
export async function getUpcomingLocationTasks(): Promise<Task[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');

  const now = new Date();
  const lookahead = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // We query for tasks starting before our lookahead window ends
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('ownerId', '==', currentUser.uid),
    where('startDate', '<=', Timestamp.fromDate(lookahead))
  );

  const snapshot = await getDocs(q);
  const tasks: Task[] = [];
  
  snapshot.forEach((docSnap) => {
    const task = { id: docSnap.id, ...docSnap.data() } as Task;
    
    // Only location-tagged tasks that aren't completed
    if (!task.location || !task.latitude || !task.longitude) return;
    if (task.completed) return;
    
    // Skip if it ended in the past
    if (task.endDate.toDate() < now) return;

    // We have a composite index on ownerId ASC, startDate ASC, so we can't easily 
    // filter `endDate >= now` on the server at the same time. The client-side filter is fine.
    
    tasks.push(task);
  });

  // Sort by start date to get the most imminent ones
  tasks.sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis());

  return tasks;
}