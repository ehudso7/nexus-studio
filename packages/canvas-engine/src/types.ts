import { z } from 'zod';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ComponentInstance {
  id: string;
  type: string;
  parentId: string | null;
  position: Position;
  size: Size;
  props: Record<string, any>;
  styles: Record<string, any>;
  children: string[];
  locked: boolean;
  hidden: boolean;
}

export interface CanvasState {
  components: Record<string, ComponentInstance>;
  selectedIds: string[];
  hoveredId: string | null;
  rootId: string;
  zoom: number;
  pan: Position;
  isDragging: boolean;
  isResizing: boolean;
  guides: Guide[];
  grid: GridConfig;
}

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
  visible: boolean;
}

export interface GridConfig {
  enabled: boolean;
  size: number;
  snap: boolean;
}

export interface DragItem {
  type: 'new-component' | 'move-component';
  componentType?: string;
  componentId?: string;
  initialPosition?: Position;
}

export interface DropZone {
  id: string;
  parentId: string;
  index: number;
  bounds: DOMRect;
}

export interface ComponentDefinition {
  type: string;
  name: string;
  category: string;
  icon: string;
  defaultProps: Record<string, any>;
  defaultStyles: Record<string, any>;
  defaultSize: Size;
  isContainer: boolean;
  acceptsChildren: string[];
}

export interface CanvasAction {
  type: string;
  payload?: any;
  timestamp: number;
}

export interface CanvasHistory {
  past: CanvasState[];
  present: CanvasState;
  future: CanvasState[];
}

export const componentInstanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  parentId: z.string().nullable(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  props: z.record(z.any()),
  styles: z.record(z.any()),
  children: z.array(z.string()),
  locked: z.boolean(),
  hidden: z.boolean(),
});

export const canvasStateSchema = z.object({
  components: z.record(componentInstanceSchema),
  selectedIds: z.array(z.string()),
  hoveredId: z.string().nullable(),
  rootId: z.string(),
  zoom: z.number(),
  pan: z.object({
    x: z.number(),
    y: z.number(),
  }),
  isDragging: z.boolean(),
  isResizing: z.boolean(),
  guides: z.array(
    z.object({
      id: z.string(),
      orientation: z.enum(['horizontal', 'vertical']),
      position: z.number(),
      visible: z.boolean(),
    })
  ),
  grid: z.object({
    enabled: z.boolean(),
    size: z.number(),
    snap: z.boolean(),
  }),
});