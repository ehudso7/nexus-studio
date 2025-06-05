import React, { useRef, useCallback, useState } from 'react';
import { useCanvasStore } from '../store';

interface SelectionBoxProps {
  componentId: string;
  zoom: number;
}

const HANDLE_SIZE = 8;

export function SelectionBox({ componentId, zoom }: SelectionBoxProps) {
  const component = useCanvasStore((state) => state.components[componentId]);
  const updateComponent = useCanvasStore((state) => state.updateComponent);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const initialMousePos = useRef({ x: 0, y: 0 });
  const initialSize = useRef({ width: 0, height: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (!component) return;
      
      setIsResizing(true);
      setResizeHandle(handle);
      
      initialMousePos.current = { x: e.clientX, y: e.clientY };
      initialSize.current = { ...component.size };
      initialPos.current = { ...component.position };
      
      const handleMouseMove = (e: MouseEvent) => {
        const dx = (e.clientX - initialMousePos.current.x) / zoom;
        const dy = (e.clientY - initialMousePos.current.y) / zoom;
        
        let newWidth = initialSize.current.width;
        let newHeight = initialSize.current.height;
        let newX = initialPos.current.x;
        let newY = initialPos.current.y;
        
        switch (handle) {
          case 'nw':
            newWidth = initialSize.current.width - dx;
            newHeight = initialSize.current.height - dy;
            newX = initialPos.current.x + dx;
            newY = initialPos.current.y + dy;
            break;
          case 'ne':
            newWidth = initialSize.current.width + dx;
            newHeight = initialSize.current.height - dy;
            newY = initialPos.current.y + dy;
            break;
          case 'sw':
            newWidth = initialSize.current.width - dx;
            newHeight = initialSize.current.height + dy;
            newX = initialPos.current.x + dx;
            break;
          case 'se':
            newWidth = initialSize.current.width + dx;
            newHeight = initialSize.current.height + dy;
            break;
          case 'n':
            newHeight = initialSize.current.height - dy;
            newY = initialPos.current.y + dy;
            break;
          case 's':
            newHeight = initialSize.current.height + dy;
            break;
          case 'w':
            newWidth = initialSize.current.width - dx;
            newX = initialPos.current.x + dx;
            break;
          case 'e':
            newWidth = initialSize.current.width + dx;
            break;
        }
        
        updateComponent(componentId, {
          size: { width: Math.max(20, newWidth), height: Math.max(20, newHeight) },
          position: { x: newX, y: newY },
        });
      };
      
      const handleMouseUp = () => {
        setIsResizing(false);
        setResizeHandle(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [component, componentId, updateComponent, zoom]
  );

  if (!component || component.locked) return null;

  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <div
      className="absolute pointer-events-none border-2 border-blue-500"
      style={{
        left: component.position.x,
        top: component.position.y,
        width: component.size.width,
        height: component.size.height,
      }}
    >
      {handles.map((handle) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          backgroundColor: '#3b82f6',
          border: '1px solid white',
          pointerEvents: 'auto',
          cursor: getCursor(handle),
        };
        
        switch (handle) {
          case 'nw':
            style.left = -HANDLE_SIZE / 2;
            style.top = -HANDLE_SIZE / 2;
            break;
          case 'n':
            style.left = '50%';
            style.top = -HANDLE_SIZE / 2;
            style.transform = 'translateX(-50%)';
            break;
          case 'ne':
            style.right = -HANDLE_SIZE / 2;
            style.top = -HANDLE_SIZE / 2;
            break;
          case 'e':
            style.right = -HANDLE_SIZE / 2;
            style.top = '50%';
            style.transform = 'translateY(-50%)';
            break;
          case 'se':
            style.right = -HANDLE_SIZE / 2;
            style.bottom = -HANDLE_SIZE / 2;
            break;
          case 's':
            style.left = '50%';
            style.bottom = -HANDLE_SIZE / 2;
            style.transform = 'translateX(-50%)';
            break;
          case 'sw':
            style.left = -HANDLE_SIZE / 2;
            style.bottom = -HANDLE_SIZE / 2;
            break;
          case 'w':
            style.left = -HANDLE_SIZE / 2;
            style.top = '50%';
            style.transform = 'translateY(-50%)';
            break;
        }
        
        return (
          <div
            key={handle}
            style={style}
            onMouseDown={(e) => handleMouseDown(e, handle)}
          />
        );
      })}
    </div>
  );
}

function getCursor(handle: string): string {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    default:
      return 'pointer';
  }
}