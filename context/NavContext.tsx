import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Task } from '@/services/tasksService';
import { Todo } from '@/services/todosService';

export interface DragPosition {
  x: number;
  y: number;
}

/** A drop zone on the weekly grid: an hour cell for a specific day, in window coordinates. */
export interface DropTarget {
  date: Date;
  hour: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NavContextType {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isDesktop: boolean;
  isNewTaskModalOpen: boolean;
  openNewTaskModal: (date?: Date, hour?: number, name?: string) => void;
  closeNewTaskModal: () => void;
  newTaskPrefillDate?: Date;
  newTaskPrefillHour?: number;
  newTaskPrefillName?: string;
  /** Incrementing key that signals WeeklyGrid to refetch tasks from Firestore. */
  taskRefreshKey: number;
  refreshTasks: () => void;
  editTaskData: Task | null;
  editTaskScope: 'this' | 'all';
  openEditTaskModal: (task: Task, scope?: 'this' | 'all') => void;
  /** The to-do currently being dragged from the sidebar toward the weekly grid, if any. */
  draggingTodo: Todo | null;
  /** Live screen position of the drag, in window coordinates. */
  dragPosition: DragPosition | null;
  startTodoDrag: (todo: Todo, position: DragPosition) => void;
  updateTodoDragPosition: (position: DragPosition) => void;
  /** Ends the drag; if it's over a registered drop target, opens the task form prefilled there. */
  endTodoDrag: () => void;
  /** WeeklyGrid calls this (while a drag is active) with its current hour-cell bounds. */
  registerDropTargets: (targets: DropTarget[]) => void;
  /** TodoSection calls this once, to be told which to-do to remove after a successful drop. */
  registerTodoScheduledHandler: (handler: (todo: Todo) => void) => void;
}

const NavContext = createContext<NavContextType>({
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
  isDesktop: false,
  isNewTaskModalOpen: false,
  openNewTaskModal: () => {},
  closeNewTaskModal: () => {},
  taskRefreshKey: 0,
  refreshTasks: () => {},
  editTaskData: null,
  editTaskScope: 'this',
  openEditTaskModal: () => {},
  draggingTodo: null,
  dragPosition: null,
  startTodoDrag: () => {},
  updateTodoDragPosition: () => {},
  endTodoDrag: () => {},
  registerDropTargets: () => {},
  registerTodoScheduledHandler: () => {},
});

/** Manages modal visibility, responsive layout state, and cross-component task refresh signals. */
export function NavProvider({ children, isDesktop }: { children: ReactNode; isDesktop: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskPrefillDate, setNewTaskPrefillDate] = useState<Date | undefined>(undefined);
  const [newTaskPrefillHour, setNewTaskPrefillHour] = useState<number | undefined>(undefined);
  const [newTaskPrefillName, setNewTaskPrefillName] = useState<string | undefined>(undefined);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [editTaskData, setEditTaskData] = useState<Task | null>(null);
  const [editTaskScope, setEditTaskScope] = useState<'this' | 'all'>('this');
  const [draggingTodo, setDraggingTodo] = useState<Todo | null>(null);
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null);
  // Imperative registrations, not state: they change far more often (every grid re-measure,
  // every drag) than they need to trigger a re-render of everything that reads this context.
  const dropTargetsRef = useRef<DropTarget[]>([]);
  const scheduledHandlerRef = useRef<((todo: Todo) => void) | null>(null);

  const openNewTaskModal = (date?: Date, hour?: number, name?: string) => {
    setEditTaskData(null);
    setNewTaskPrefillDate(date);
    setNewTaskPrefillHour(hour);
    setNewTaskPrefillName(name);
    setIsNewTaskModalOpen(true);
  };

  const startTodoDrag = useCallback((todo: Todo, position: DragPosition) => {
    setDraggingTodo(todo);
    setDragPosition(position);
  }, []);

  const updateTodoDragPosition = useCallback((position: DragPosition) => {
    setDragPosition(position);
  }, []);

  // Not useCallback: it needs to read the current draggingTodo/dragPosition at the moment
  // the drag ends, not whatever they were when this function was first created.
  const endTodoDrag = () => {
    const todo = draggingTodo;
    const pos = dragPosition;
    setDraggingTodo(null);
    setDragPosition(null);
    if (!todo || !pos) return;

    const target = dropTargetsRef.current.find(
      (t) => pos.x >= t.x && pos.x <= t.x + t.width && pos.y >= t.y && pos.y <= t.y + t.height,
    );
    if (!target) return; // dropped outside the grid: do nothing, the to-do is untouched

    openNewTaskModal(target.date, target.hour, todo.title);
    scheduledHandlerRef.current?.(todo);
  };

  const registerDropTargets = useCallback((targets: DropTarget[]) => {
    dropTargetsRef.current = targets;
  }, []);

  const registerTodoScheduledHandler = useCallback((handler: (todo: Todo) => void) => {
    scheduledHandlerRef.current = handler;
  }, []);

  const openEditTaskModal = (task: Task, scope: 'this' | 'all' = 'this') => {
    setEditTaskData(task);
    setEditTaskScope(scope);
    setIsNewTaskModalOpen(true);
  };

  const closeNewTaskModal = () => setIsNewTaskModalOpen(false);

  const refreshTasks = useCallback(() => {
    setTaskRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <NavContext.Provider 
      value={{
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isDesktop,
        isNewTaskModalOpen,
        openNewTaskModal,
        closeNewTaskModal,
        newTaskPrefillDate,
        newTaskPrefillHour,
        newTaskPrefillName,
        taskRefreshKey,
        refreshTasks,
        editTaskData,
        editTaskScope,
        openEditTaskModal,
        draggingTodo,
        dragPosition,
        startTodoDrag,
        updateTodoDragPosition,
        endTodoDrag,
        registerDropTargets,
        registerTodoScheduledHandler,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

/** Hook to access navigation context state and actions. */
export function useNav() {
  return useContext(NavContext);
}
