import { useDrag, useDrop } from 'react-dnd';
import type { DragItem } from '../types';

export function useComponentDrag(componentId: string, canDrag: boolean = true) {
  return useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: 'move-component',
    item: {
      type: 'move-component',
      componentId,
    },
    canDrag,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
}

export function useComponentDrop(
  componentId: string,
  onDrop: (item: DragItem, index?: number) => void,
  canDrop?: (item: DragItem) => boolean
) {
  return useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: ['new-component', 'move-component'],
    canDrop,
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });
}