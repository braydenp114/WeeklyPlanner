import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavContextType {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isDesktop: boolean;
}

const NavContext = createContext<NavContextType>({
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
  isDesktop: false,
});

export function NavProvider({ children, isDesktop }: { children: ReactNode; isDesktop: boolean }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <NavContext.Provider value={{ isMobileMenuOpen, setIsMobileMenuOpen, isDesktop }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
