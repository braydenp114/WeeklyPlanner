import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Task } from '@/services/tasksService';

interface NavContextType {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isDesktop: boolean;
  isNewTaskModalOpen: boolean;
  openNewTaskModal: (date?: Date, hour?: number) => void;
  closeNewTaskModal: () => void;
  newTaskPrefillDate?: Date;
  newTaskPrefillHour?: number;
  /** Incrementing key that signals WeeklyGrid to refetch tasks from Firestore. */
  taskRefreshKey: number;
  /** Call after creating/updating/deleting a task to trigger grid refetch. */
  refreshTasks: () => void;
  editTaskData: Task | null;
  openEditTaskModal: (task: Task) => void;
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
  openEditTaskModal: () => {},
});

export function NavProvider({ children, isDesktop }: { children: ReactNode; isDesktop: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskPrefillDate, setNewTaskPrefillDate] = useState<Date | undefined>(undefined);
  const [newTaskPrefillHour, setNewTaskPrefillHour] = useState<number | undefined>(undefined);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [editTaskData, setEditTaskData] = useState<Task | null>(null);

  const openNewTaskModal = (date?: Date, hour?: number) => {
    setEditTaskData(null);
    setNewTaskPrefillDate(date);
    setNewTaskPrefillHour(hour);
    setIsNewTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditTaskData(task);
    setIsNewTaskModalOpen(true);
  };

  const closeNewTaskModal = () => setIsNewTaskModalOpen(false);

  const refreshTasks = useCallback(() => {
    setTaskRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <NavContext.Provider 
      value={{ 
        isMobileMenuOpen, setIsMobileMenuOpen, isDesktop,
        isNewTaskModalOpen, openNewTaskModal, closeNewTaskModal,
        newTaskPrefillDate, newTaskPrefillHour,
        taskRefreshKey, refreshTasks,
        editTaskData, openEditTaskModal,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
