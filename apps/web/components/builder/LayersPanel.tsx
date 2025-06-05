'use client';

import { useCanvasStore } from '@nexus/canvas-engine';
import { ChevronRight, ChevronDown, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';

interface LayerItemProps {
  componentId: string;
  depth: number;
}

function LayerItem({ componentId, depth }: LayerItemProps) {
  const component = useCanvasStore((state) => state.components[componentId]);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const selectComponent = useCanvasStore((state) => state.selectComponent);
  const updateComponent = useCanvasStore((state) => state.updateComponent);
  const [expanded, setExpanded] = useState(true);

  if (!component) return null;

  const isSelected = selectedIds.includes(componentId);
  const hasChildren = component.children.length > 0;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateComponent(componentId, { hidden: !component.hidden });
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateComponent(componentId, { locked: !component.locked });
  };

  return (
    <>
      <div
        className={`
          flex items-center px-2 py-1 hover:bg-gray-800 cursor-pointer
          ${isSelected ? 'bg-blue-900 bg-opacity-50' : ''}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => selectComponent(componentId)}
      >
        {hasChildren && (
          <button
            className="mr-1"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </button>
        )}
        
        <span className="flex-1 text-sm text-gray-300">
          {component.type}
          {component.props.id && (
            <span className="text-gray-500 ml-1">#{component.props.id}</span>
          )}
        </span>
        
        <button
          className="ml-1 p-1 hover:bg-gray-700 rounded"
          onClick={handleToggleVisibility}
        >
          {component.hidden ? (
            <EyeOff className="w-3 h-3 text-gray-500" />
          ) : (
            <Eye className="w-3 h-3 text-gray-400" />
          )}
        </button>
        
        <button
          className="ml-1 p-1 hover:bg-gray-700 rounded"
          onClick={handleToggleLock}
        >
          {component.locked ? (
            <Lock className="w-3 h-3 text-gray-500" />
          ) : (
            <Unlock className="w-3 h-3 text-gray-400" />
          )}
        </button>
      </div>
      
      {expanded && hasChildren && (
        <>
          {component.children.map((childId) => (
            <LayerItem key={childId} componentId={childId} depth={depth + 1} />
          ))}
        </>
      )}
    </>
  );
}

export function LayersPanel() {
  const rootId = useCanvasStore((state) => state.rootId);

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300">Layers</h3>
      </div>
      <div className="py-2">
        <LayerItem componentId={rootId} depth={0} />
      </div>
    </div>
  );
}