import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../store';

export function useSelection() {
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const selectComponent = useCanvasStore((state) => state.selectComponent);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const removeComponent = useCanvasStore((state) => state.removeComponent);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Delete selected components
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        selectedIds.forEach((id) => {
          if (id !== 'root') {
            removeComponent(id);
          }
        });
      }

      // Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allComponentIds = Object.keys(useCanvasStore.getState().components);
        allComponentIds.forEach((id) => {
          if (id !== 'root') {
            selectComponent(id, true);
          }
        });
      }

      // Clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    },
    [selectedIds, selectComponent, clearSelection, removeComponent]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    selectedIds,
    selectComponent,
    clearSelection,
  };
}