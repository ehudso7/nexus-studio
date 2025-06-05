import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useCanvasStore } from '../store';
import { ComponentRenderer } from './ComponentRenderer';
import { Grid } from './Grid';
import { SelectionBox } from './SelectionBox';
import { Guides } from './Guides';
import { DragLayer } from './DragLayer';
import type { DragItem, Position } from '../types';
import { getComponentDefinitions } from '../utils/component-factory';
import { generateId } from '../utils/helpers';

export interface CanvasProps {
  className?: string;
  onComponentSelect?: (id: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  tool?: 'select' | 'pan';
}

export function Canvas({ className, onComponentSelect, onSave, readOnly = false, tool = 'select' }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<Position>({ x: 0, y: 0 });
  const {
    components,
    rootId,
    zoom,
    pan,
    grid,
    guides,
    selectedIds,
    addComponent,
    clearSelection,
    setZoom,
    setPan,
    deleteComponent,
    selectComponent,
    updateComponent,
  } = useCanvasStore();

  // Canvas to screen coordinates
  const canvasToScreen = useCallback((pos: Position) => {
    if (!canvasRef.current) return pos;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: pos.x * zoom + pan.x + rect.left,
      y: pos.y * zoom + pan.y + rect.top,
    };
  }, [zoom, pan]);

  // Screen to canvas coordinates
  const screenToCanvas = useCallback((pos: Position) => {
    if (!canvasRef.current) return pos;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (pos.x - rect.left - pan.x) / zoom,
      y: (pos.y - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: ['new-component', 'move-component'],
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = (offset.x - rect.left - pan.x) / zoom;
      const y = (offset.y - rect.top - pan.y) / zoom;

      const canvasPos = screenToCanvas({ x: offset.x, y: offset.y });
      
      // Snap to grid if enabled
      const snappedPos = grid.snap ? {
        x: Math.round(canvasPos.x / grid.size) * grid.size,
        y: Math.round(canvasPos.y / grid.size) * grid.size,
      } : canvasPos;

      if (item.type === 'new-component' && item.componentType) {
        const definitions = getComponentDefinitions();
        const definition = definitions.find(d => d.type === item.componentType);
        if (!definition) return;

        const id = addComponent({
          id: generateId(),
          type: item.componentType,
          parentId: rootId,
          position: snappedPos,
          size: definition.defaultSize,
          props: { ...definition.defaultProps },
          styles: { ...definition.defaultStyles },
          children: [],
          locked: false,
          hidden: false,
        });
        
        selectComponent(id);
        if (onComponentSelect) {
          onComponentSelect(id);
        }
      } else if (item.type === 'move-component' && item.componentId) {
        updateComponent(item.componentId, { position: snappedPos });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
        
        // Zoom towards mouse position
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const scale = newZoom / zoom;
          setPan({
            x: mouseX - (mouseX - pan.x) * scale,
            y: mouseY - (mouseY - pan.y) * scale,
          });
        }
        
        setZoom(newZoom);
      } else if (!readOnly) {
        // Pan with mouse wheel
        setPan({
          x: pan.x - e.deltaX,
          y: pan.y - e.deltaY,
        });
      }
    },
    [zoom, pan, setZoom, setPan, readOnly]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Handle mouse events for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) { // Pan tool, Middle click or Alt+Click
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [pan, tool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  }, [isPanning, startPan, setPan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isPanning) {
        clearSelection();
      }
    },
    [clearSelection, isPanning]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected components
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        selectedIds.forEach(id => deleteComponent(id));
      }
      
      // Select all
      if (e.metaKey && e.key === 'a') {
        e.preventDefault();
        Object.keys(components).forEach(id => {
          if (id !== rootId) selectComponent(id, true);
        });
      }
      
      // Save
      if (e.metaKey && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, components, rootId, deleteComponent, selectComponent, onSave, readOnly]);

  drop(canvasRef);

  // Zoom controls
  const ZoomControls = () => (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-lg shadow-lg px-3 py-2">
      <button
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
        title="Zoom out"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <span className="text-sm font-medium min-w-[3rem] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        onClick={() => setZoom(Math.min(5, zoom + 0.1))}
        title="Zoom in"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <div className="w-px h-6 bg-gray-200 mx-1" />
      <button
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
        title="Reset view"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      </button>
    </div>
  );

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full overflow-hidden bg-gray-100 ${className || ''}`}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : isOver ? 'copy' : 'default' }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {grid.enabled && <Grid size={grid.size} zoom={zoom} />}
        
        <div className="absolute inset-0 pointer-events-none">
          <Guides guides={guides} zoom={zoom} />
        </div>

        <ComponentRenderer componentId={rootId} />

        {selectedIds.map((id) => (
          <SelectionBox key={id} componentId={id} zoom={zoom} />
        ))}
      </div>

      {isOver && canDrop && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 pointer-events-none" />
      )}
      
      <DragLayer />
      <ZoomControls />
    </div>
  );
}