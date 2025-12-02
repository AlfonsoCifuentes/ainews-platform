'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BookModeContextType {
  isBookMode: boolean;
  setBookMode: (value: boolean) => void;
  toggleBookMode: () => void;
}

const BookModeContext = createContext<BookModeContextType | undefined>(undefined);

export function BookModeProvider({ children }: { children: ReactNode }) {
  const [isBookMode, setIsBookMode] = useState(false);

  const setBookMode = useCallback((value: boolean) => {
    setIsBookMode(value);
  }, []);

  const toggleBookMode = useCallback(() => {
    setIsBookMode(prev => !prev);
  }, []);

  return (
    <BookModeContext.Provider value={{ isBookMode, setBookMode, toggleBookMode }}>
      {children}
    </BookModeContext.Provider>
  );
}

export function useBookMode() {
  const context = useContext(BookModeContext);
  if (context === undefined) {
    // Return default values if not in provider (for backward compatibility)
    return {
      isBookMode: false,
      setBookMode: () => {},
      toggleBookMode: () => {},
    };
  }
  return context;
}
