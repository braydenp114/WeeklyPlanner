import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavContextType {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isDesktop: boolean;
  isNewTaskModalOpen: boolean;
  openNewTaskModal: (date?: Date, hour?: number) => void;
  closeNewTaskModal: () => void;
  newTaskPrefillDate?: Date;
  newTaskPrefillHour?: number;
}

const NavContext = createContext<NavContextType>({
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
  isDesktop: false,
  isNewTaskModalOpen: false,
  openNewTaskModal: () => {},
  closeNewTaskModal: () => {},
});

export function NavProvider({ children, isDesktop }: { children: ReactNode; isDesktop: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskPrefillDate, setNewTaskPrefillDate] = useState<Date | undefined>(undefined);
  const [newTaskPrefillHour, setNewTaskPrefillHour] = useState<number | undefined>(undefined);

  const openNewTaskModal = (date?: Date, hour?: number) => {
    setNewTaskPrefillDate(date);
    setNewTaskPrefillHour(hour);
    setIsNewTaskModalOpen(true);
  };

  const closeNewTaskModal = () => setIsNewTaskModalOpen(false);

  return (
    <NavContext.Provider 
      value={{ 
        isMobileMenuOpen, setIsMobileMenuOpen, isDesktop,
        isNewTaskModalOpen, openNewTaskModal, closeNewTaskModal,
        newTaskPrefillDate, newTaskPrefillHour
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
