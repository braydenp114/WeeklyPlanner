import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TaskItem = {
  id: string;
  title: string;
  date: string; // 'YYYY-MM-DD', the exact calendar date the task is on
  startHour: number; // 0-23
  durationHours: number;
  colorHex: string;
  tag: string;
};

export type TaskDraft = {
  date: string; // 'YYYY-MM-DD'
  startHour: number;
};

// Local date key (not UTC), so tasks stay on the day the user actually picked.
export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface TasksContextType {
  tasks: TaskItem[];
  addTask: (task: Omit<TaskItem, 'id'>) => void;
  removeTask: (id: string) => void;
  isModalOpen: boolean;
  modalDraft: TaskDraft | null;
  selectedTask: TaskItem | null;
  openCreateModal: (draft: TaskDraft) => void;
  openTaskModal: (task: TaskItem) => void;
  closeModal: () => void;
}

const TasksContext = createContext<TasksContextType>({
  tasks: [],
  addTask: () => {},
  removeTask: () => {},
  isModalOpen: false,
  modalDraft: null,
  selectedTask: null,
  openCreateModal: () => {},
  openTaskModal: () => {},
  closeModal: () => {},
});

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<TaskDraft | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const addTask = (task: Omit<TaskItem, 'id'>) => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setTasks((prev) => [...prev, { ...task, id }]);
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const openCreateModal = (draft: TaskDraft) => {
    setSelectedTask(null);
    setModalDraft(draft);
    setIsModalOpen(true);
  };

  const openTaskModal = (task: TaskItem) => {
    setSelectedTask(task);
    setModalDraft(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalDraft(null);
    setSelectedTask(null);
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        addTask,
        removeTask,
        isModalOpen,
        modalDraft,
        selectedTask,
        openCreateModal,
        openTaskModal,
        closeModal,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  return useContext(TasksContext);
}
