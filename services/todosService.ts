import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * A to-do item from the sidebar list. Unlike a calendar task it has no time slot,
 * only an optional due day. Stored in its own "todos" collection.
 */
export interface Todo {
  id: string;
  title: string;
  done: boolean;
  /** Optional due day as YYYY-MM-DD (local date). */
  dueDate: string | null;
}

const TODOS_COLLECTION = 'todos';

function requireUser() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');
  return currentUser;
}

export async function getTodos(): Promise<Todo[]> {
  const user = requireUser();
  const q = query(collection(db, TODOS_COLLECTION), where('ownerId', '==', user.uid));
  const snapshot = await getDocs(q);
  const todos: Todo[] = [];
  snapshot.forEach((d) => {
    const data = d.data();
    todos.push({ id: d.id, title: data.title, done: !!data.done, dueDate: data.dueDate ?? null });
  });
  return todos;
}

export async function addTodo(title: string, dueDate: string | null): Promise<string> {
  const user = requireUser();
  const ref = await addDoc(collection(db, TODOS_COLLECTION), {
    title: title.trim(),
    done: false,
    dueDate,
    ownerId: user.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setTodoDone(id: string, done: boolean): Promise<void> {
  requireUser();
  await updateDoc(doc(db, TODOS_COLLECTION, id), { done });
}

export async function deleteTodo(id: string): Promise<void> {
  requireUser();
  await deleteDoc(doc(db, TODOS_COLLECTION, id));
}
