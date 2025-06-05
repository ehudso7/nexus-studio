import { useEffect, useState, useRef } from 'react';
import { CollaborationProvider } from './provider';
import { useCanvasStore } from '../store';
import type { ComponentInstance } from '../types';

interface Cursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
}

interface CollaboratorSelection {
  userId: string;
  userName: string;
  color: string;
  selectedIds: string[];
}

export function useCollaboration(
  roomId: string,
  userId: string,
  userName: string,
  enabled: boolean = true
) {
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [selections, setSelections] = useState<CollaboratorSelection[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const providerRef = useRef<CollaborationProvider | null>(null);
  
  const store = useCanvasStore();

  useEffect(() => {
    if (!enabled) return;

    const provider = new CollaborationProvider(roomId, userId, userName);
    providerRef.current = provider;

    // Sync components
    provider.onComponentsChange((components) => {
      // Update local store with remote changes
      Object.entries(components).forEach(([id, component]) => {
        const localComponent = store.getComponent(id);
        if (!localComponent || JSON.stringify(localComponent) !== JSON.stringify(component)) {
          store.updateComponent(id, component);
        }
      });
    });

    // Sync awareness (cursors and selections)
    provider.onAwarenessChange((states) => {
      const newCursors: Cursor[] = [];
      const newSelections: CollaboratorSelection[] = [];

      states.forEach((state, clientId) => {
        if (state.user && state.user.id !== userId) {
          if (state.cursor) {
            newCursors.push({
              userId: state.user.id,
              userName: state.user.name,
              color: state.user.color,
              position: state.cursor,
            });
          }
          if (state.selection) {
            newSelections.push({
              userId: state.user.id,
              userName: state.user.name,
              color: state.user.color,
              selectedIds: state.selection,
            });
          }
        }
      });

      setCursors(newCursors);
      setSelections(newSelections);
    });

    setIsConnected(true);

    return () => {
      provider.destroy();
      providerRef.current = null;
      setIsConnected(false);
    };
  }, [roomId, userId, userName, enabled]);

  // Update cursor position
  const updateCursorPosition = (position: { x: number; y: number }) => {
    providerRef.current?.updateCursorPosition(position);
  };

  // Update selection
  const updateSelection = (selectedIds: string[]) => {
    providerRef.current?.updateSelection(selectedIds);
  };

  // Sync local changes to remote
  useEffect(() => {
    if (!providerRef.current) return;

    const unsubscribe = store.subscribe(
      (state) => state.components,
      (components) => {
        // Sync component changes to remote
        Object.entries(components).forEach(([id, component]) => {
          providerRef.current?.updateComponent(id, component);
        });
      }
    );

    return unsubscribe;
  }, []);

  // Sync selection changes
  useEffect(() => {
    if (!providerRef.current) return;

    const unsubscribe = store.subscribe(
      (state) => state.selectedIds,
      (selectedIds) => {
        updateSelection(selectedIds);
      }
    );

    return unsubscribe;
  }, []);

  return {
    cursors,
    selections,
    isConnected,
    updateCursorPosition,
    updateSelection,
  };
}