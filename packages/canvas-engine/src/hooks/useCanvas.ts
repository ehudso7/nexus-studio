import { useCanvasStore } from '../store';

export function useCanvas() {
  const state = useCanvasStore();
  
  return {
    // State
    components: state.components,
    selectedIds: state.selectedIds,
    hoveredId: state.hoveredId,
    rootId: state.rootId,
    zoom: state.zoom,
    pan: state.pan,
    isDragging: state.isDragging,
    isResizing: state.isResizing,
    guides: state.guides,
    grid: state.grid,
    
    // Actions
    addComponent: state.addComponent,
    removeComponent: state.removeComponent,
    updateComponent: state.updateComponent,
    moveComponent: state.moveComponent,
    selectComponent: state.selectComponent,
    clearSelection: state.clearSelection,
    setHoveredComponent: state.setHoveredComponent,
    setZoom: state.setZoom,
    setPan: state.setPan,
    undo: state.undo,
    redo: state.redo,
    
    // Utils
    getComponent: state.getComponent,
    getChildren: state.getChildren,
    getAncestors: state.getAncestors,
  };
}