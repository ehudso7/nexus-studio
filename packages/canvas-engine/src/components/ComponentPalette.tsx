import React, { useState, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { Search, ChevronDown, ChevronRight, Type, Square, Layout, Grid3x3, FormInput, FileText, Button, Image } from 'lucide-react';
import { cn } from '../utils/helpers';
import { getComponentDefinitions } from '../utils/component-factory';
import type { DragItem, ComponentDefinition } from '../types';

interface ComponentPaletteProps {
  className?: string;
}

interface ComponentItemProps {
  definition: ComponentDefinition;
}

function ComponentItem({ definition }: ComponentItemProps) {
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>(() => ({
    type: 'new-component',
    item: {
      type: 'new-component',
      componentType: definition.type,
      componentId: null,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const Icon = getIconComponent(definition.icon);

  return (
    <div
      ref={drag}
      className={cn(
        'p-3 bg-white border border-gray-200 rounded-lg cursor-move transition-all',
        'hover:border-blue-400 hover:shadow-sm',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <Icon className="w-6 h-6 text-gray-600" />
        <span className="text-xs text-gray-700 text-center">{definition.name}</span>
      </div>
    </div>
  );
}

function getIconComponent(iconName: string) {
  const icons: Record<string, any> = {
    Type,
    Button,
    Image,
    Square,
    Layout,
    Grid3x3,
    FormInput,
    FileText,
  };
  return icons[iconName] || Square;
}

export function ComponentPalette({ className }: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Basic', 'Layout', 'Form'])
  );

  const componentDefinitions = useMemo(() => getComponentDefinitions(), []);

  const filteredComponents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return componentDefinitions;

    return componentDefinitions.filter(
      (def) =>
        def.name.toLowerCase().includes(query) ||
        def.type.toLowerCase().includes(query) ||
        def.category.toLowerCase().includes(query)
    );
  }, [searchQuery, componentDefinitions]);

  const componentsByCategory = useMemo(() => {
    const categories = new Map<string, ComponentDefinition[]>();

    filteredComponents.forEach((def) => {
      const category = def.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(def);
    });

    return categories;
  }, [filteredComponents]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className={cn('bg-gray-50 border-r border-gray-200 overflow-hidden flex flex-col', className)}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Components</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {componentsByCategory.size === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No components found
          </div>
        ) : (
          Array.from(componentsByCategory.entries()).map(([category, components]) => (
            <div key={category} className="border-b border-gray-200 last:border-0">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>{category}</span>
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedCategories.has(category) && (
                <div className="p-4 grid grid-cols-2 gap-3">
                  {components.map((def) => (
                    <ComponentItem key={def.type} definition={def} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-500 text-center">
          Drag components to the canvas
        </p>
      </div>
    </div>
  );
}