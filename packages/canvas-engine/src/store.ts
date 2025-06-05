import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasState, ComponentInstance, Position, Size } from './types';

interface CanvasStore extends CanvasState {
  // Component Actions
  addComponent: (component: Partial<ComponentInstance> | string, parentId?: string, position?: Position) => string;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<ComponentInstance>) => void;
  moveComponent: (id: string, newParentId: string, index: number) => void;
  duplicateComponent: (id: string) => string | null;
  deleteComponent: (id: string) => void;
  
  // Selection Actions
  selectComponent: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // View Actions
  setHoveredComponent: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Position) => void;
  resetView: () => void;
  
  // History Actions
  undo: () => void;
  redo: () => void;
  
  // Clipboard Actions
  copy: () => void;
  paste: () => void;
  cut: () => void;
  
  // Grid Actions
  toggleGrid: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;
  
  // Utility Functions
  getComponent: (id: string) => ComponentInstance | undefined;
  getChildren: (parentId: string) => ComponentInstance[];
  getAncestors: (id: string) => string[];
  getDescendants: (id: string) => string[];
  getSiblings: (id: string) => string[];
  
  // Internal
  history: { past: CanvasState[]; future: CanvasState[] };
  clipboard: ComponentInstance[] | null;
}

const initialState: CanvasState = {
  components: {
    root: {
      id: 'root',
      type: 'canvas',
      parentId: null,
      position: { x: 0, y: 0 },
      size: { width: 1200, height: 800 },
      props: {},
      styles: {
        backgroundColor: '#ffffff',
        position: 'relative',
      },
      children: [],
      locked: true,
      hidden: false,
    },
  },
  selectedIds: [],
  hoveredId: null,
  rootId: 'root',
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDragging: false,
  isResizing: false,
  guides: [],
  grid: {
    enabled: true,
    size: 10,
    snap: true,
  },
};

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        history: { past: [], future: [] },
        clipboard: null,

        addComponent: (componentOrType, parentId, position) => {
          const id = uuidv4();
          
          set((state) => {
            let newComponent: ComponentInstance;
            
            if (typeof componentOrType === 'string') {
              // Creating from type string
              const actualParentId = parentId || state.rootId;
              const parent = state.components[actualParentId];
              if (!parent) return id;
              
              newComponent = {
                id,
                type: componentOrType,
                parentId: actualParentId,
                position: position || { x: 0, y: 0 },
                size: { width: 200, height: 100 },
                props: {},
                styles: {},
                children: [],
                locked: false,
                hidden: false,
              };
              
              parent.children.push(id);
            } else {
              // Creating from partial component
              newComponent = {
                id,
                type: 'div',
                parentId: state.rootId,
                position: { x: 0, y: 0 },
                size: { width: 200, height: 100 },
                props: {},
                styles: {},
                children: [],
                locked: false,
                hidden: false,
                ...componentOrType,
              };
              
              if (newComponent.parentId && state.components[newComponent.parentId]) {
                state.components[newComponent.parentId].children.push(id);
              }
            }
            
            state.components[id] = newComponent;
          });
          
          return id;
        },

        removeComponent: (id) => {
          set((state) => {
            const component = state.components[id];
            if (!component || id === 'root') return;
            
            // Remove from parent's children
            if (component.parentId) {
              const parent = state.components[component.parentId];
              parent.children = parent.children.filter((childId) => childId !== id);
            }
            
            // Remove all descendants
            const removeDescendants = (componentId: string) => {
              const comp = state.components[componentId];
              if (comp) {
                comp.children.forEach(removeDescendants);
                delete state.components[componentId];
              }
            };
            
            removeDescendants(id);
            
            // Clear selection if needed
            state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
          });
        },

        updateComponent: (id, updates) => {
          set((state) => {
            const component = state.components[id];
            if (component) {
              Object.assign(component, updates);
            }
          });
        },

        moveComponent: (id, newParentId, index) => {
          set((state) => {
            const component = state.components[id];
            const newParent = state.components[newParentId];
            
            if (!component || !newParent || id === 'root') return;
            
            // Remove from old parent
            if (component.parentId) {
              const oldParent = state.components[component.parentId];
              oldParent.children = oldParent.children.filter((childId) => childId !== id);
            }
            
            // Add to new parent
            component.parentId = newParentId;
            newParent.children.splice(index, 0, id);
          });
        },

        selectComponent: (id, multi = false) => {
          set((state) => {
            if (multi) {
              if (state.selectedIds.includes(id)) {
                state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
              } else {
                state.selectedIds.push(id);
              }
            } else {
              state.selectedIds = [id];
            }
          });
        },

        clearSelection: () => {
          set((state) => {
            state.selectedIds = [];
          });
        },

        setHoveredComponent: (id) => {
          set((state) => {
            state.hoveredId = id;
          });
        },

        setZoom: (zoom) => {
          set((state) => {
            state.zoom = Math.max(0.1, Math.min(5, zoom));
          });
        },

        setPan: (pan) => {
          set((state) => {
            state.pan = pan;
          });
        },

        duplicateComponent: (id) => {
          const component = get().components[id];
          if (!component || id === 'root') return null;
          
          const duplicate = (comp: ComponentInstance, parentId: string): string => {
            const newId = uuidv4();
            const newComp: ComponentInstance = {
              ...comp,
              id: newId,
              parentId,
              position: {
                x: comp.position.x + 20,
                y: comp.position.y + 20,
              },
              children: [],
            };
            
            set((state) => {
              state.components[newId] = newComp;
              if (parentId) {
                state.components[parentId].children.push(newId);
              }
            });
            
            // Recursively duplicate children
            comp.children.forEach(childId => {
              const child = get().components[childId];
              if (child) {
                const dupChildId = duplicate(child, newId);
                set((state) => {
                  state.components[newId].children.push(dupChildId);
                });
              }
            });
            
            return newId;
          };
          
          return duplicate(component, component.parentId!);
        },
        
        deleteComponent: (id) => get().removeComponent(id),
        
        selectAll: () => {
          set((state) => {
            state.selectedIds = Object.keys(state.components).filter(id => id !== 'root');
          });
        },
        
        setHoveredId: (id) => get().setHoveredComponent(id),
        
        resetView: () => {
          set((state) => {
            state.zoom = 1;
            state.pan = { x: 0, y: 0 };
          });
        },
        
        copy: () => {
          const selectedIds = get().selectedIds;
          if (selectedIds.length === 0) return;
          
          set((state) => {
            state.clipboard = selectedIds.map(id => {
              const comp = state.components[id];
              return comp ? { ...comp } : null;
            }).filter(Boolean) as ComponentInstance[];
          });
        },
        
        paste: () => {
          const clipboard = get().clipboard;
          if (!clipboard || clipboard.length === 0) return;
          
          const idMap = new Map<string, string>();
          
          // First pass: create new IDs
          clipboard.forEach(comp => {
            idMap.set(comp.id, uuidv4());
          });
          
          // Second pass: create components
          set((state) => {
            const newIds: string[] = [];
            
            clipboard.forEach(comp => {
              const newId = idMap.get(comp.id)!;
              const newComp: ComponentInstance = {
                ...comp,
                id: newId,
                position: {
                  x: comp.position.x + 20,
                  y: comp.position.y + 20,
                },
                parentId: comp.parentId ? idMap.get(comp.parentId) || comp.parentId : comp.parentId,
                children: comp.children.map(childId => idMap.get(childId) || childId),
              };
              
              state.components[newId] = newComp;
              newIds.push(newId);
              
              if (newComp.parentId && state.components[newComp.parentId]) {
                state.components[newComp.parentId].children.push(newId);
              }
            });
            
            state.selectedIds = newIds;
          });
        },
        
        cut: () => {
          get().copy();
          const selectedIds = get().selectedIds;
          selectedIds.forEach(id => get().removeComponent(id));
        },
        
        toggleGrid: () => {
          set((state) => {
            state.grid.enabled = !state.grid.enabled;
          });
        },
        
        toggleSnap: () => {
          set((state) => {
            state.grid.snap = !state.grid.snap;
          });
        },
        
        setGridSize: (size) => {
          set((state) => {
            state.grid.size = size;
          });
        },
        
        undo: () => {
          // TODO: Implement proper undo/redo with history
          console.log('Undo not yet implemented');
        },

        redo: () => {
          // TODO: Implement proper undo/redo with history
          console.log('Redo not yet implemented');
        },

        getComponent: (id) => {
          return get().components[id];
        },

        getChildren: (parentId) => {
          const parent = get().components[parentId];
          if (!parent) return [];
          
          return parent.children
            .map((childId) => get().components[childId])
            .filter(Boolean);
        },

        getAncestors: (id) => {
          const ancestors: string[] = [];
          let currentId = id;
          
          while (currentId) {
            const component = get().components[currentId];
            if (!component || !component.parentId) break;
            
            ancestors.push(component.parentId);
            currentId = component.parentId;
          }
          
          return ancestors;
        },
        
        getDescendants: (id) => {
          const descendants: string[] = [];
          const collectDescendants = (componentId: string) => {
            const component = get().components[componentId];
            if (!component) return;
            
            component.children.forEach(childId => {
              descendants.push(childId);
              collectDescendants(childId);
            });
          };
          
          collectDescendants(id);
          return descendants;
        },
        
        getSiblings: (id) => {
          const component = get().components[id];
          if (!component || !component.parentId) return [];
          
          const parent = get().components[component.parentId];
          if (!parent) return [];
          
          return parent.children.filter(childId => childId !== id);
        },
      }))
    )
  )
);