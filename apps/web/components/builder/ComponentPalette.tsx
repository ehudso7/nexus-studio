'use client';

import { useDrag } from 'react-dnd';
import {
  Type,
  Square,
  Image,
  Button as ButtonIcon,
  Layout,
  Grid3x3,
  FormInput,
  Video,
  MapPin,
  BarChart,
} from 'lucide-react';
import type { DragItem } from '@nexus/canvas-engine';

const components = [
  { type: 'text', name: 'Text', icon: Type, category: 'Basic' },
  { type: 'button', name: 'Button', icon: ButtonIcon, category: 'Basic' },
  { type: 'image', name: 'Image', icon: Image, category: 'Basic' },
  { type: 'container', name: 'Container', icon: Square, category: 'Layout' },
  { type: 'grid', name: 'Grid', icon: Grid3x3, category: 'Layout' },
  { type: 'flex', name: 'Flex Box', icon: Layout, category: 'Layout' },
  { type: 'input', name: 'Input', icon: FormInput, category: 'Form' },
  { type: 'video', name: 'Video', icon: Video, category: 'Media' },
  { type: 'map', name: 'Map', icon: MapPin, category: 'Media' },
  { type: 'chart', name: 'Chart', icon: BarChart, category: 'Data' },
];

const categories = ['Basic', 'Layout', 'Form', 'Media', 'Data'];

interface ComponentItemProps {
  type: string;
  name: string;
  icon: React.ElementType;
}

function ComponentItem({ type, name, icon: Icon }: ComponentItemProps) {
  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: 'new-component',
    item: {
      type: 'new-component',
      componentType: type,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`
        flex flex-col items-center justify-center p-3 bg-gray-800 rounded-lg cursor-move
        hover:bg-gray-700 transition-colors
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <Icon className="w-6 h-6 text-gray-400 mb-1" />
      <span className="text-xs text-gray-300">{name}</span>
    </div>
  );
}

export function ComponentPalette() {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Components</h3>
        
        {categories.map((category) => {
          const categoryComponents = components.filter((c) => c.category === category);
          if (categoryComponents.length === 0) return null;
          
          return (
            <div key={category} className="mb-6">
              <h4 className="text-xs font-medium text-gray-500 mb-2">{category}</h4>
              <div className="grid grid-cols-2 gap-2">
                {categoryComponents.map((component) => (
                  <ComponentItem
                    key={component.type}
                    type={component.type}
                    name={component.name}
                    icon={component.icon}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}