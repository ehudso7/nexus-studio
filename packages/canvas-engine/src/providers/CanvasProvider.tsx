import React, { createContext, useContext, ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCanvasStore } from '../store';

interface CanvasContextValue {
  // Add any additional context values here
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export interface CanvasProviderProps {
  children: ReactNode;
}

export function CanvasProvider({ children }: CanvasProviderProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <CanvasContext.Provider value={{}}>
        {children}
      </CanvasContext.Provider>
    </DndProvider>
  );
}

export function useCanvasContext() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
}