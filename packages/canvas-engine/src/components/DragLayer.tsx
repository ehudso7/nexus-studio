import React from 'react';
import { useDragLayer } from 'react-dnd';
import type { DragItem } from '../types';

export function DragLayer() {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem() as DragItem,
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) {
    return null;
  }

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: currentOffset.x,
        top: currentOffset.y,
      }}
    >
      <div className="bg-blue-500 text-white px-3 py-1 rounded shadow-lg opacity-80">
        {item.type === 'new-component' ? (
          <span>New {item.componentType}</span>
        ) : (
          <span>Moving component</span>
        )}
      </div>
    </div>
  );
}