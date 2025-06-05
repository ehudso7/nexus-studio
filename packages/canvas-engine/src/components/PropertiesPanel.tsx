import React, { useCallback, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { Paintbrush, Settings, Zap, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useCanvasStore } from '../store';
import { cn } from '../utils/helpers';
import type { ComponentInstance } from '../types';

interface PropertiesPanelProps {
  className?: string;
}

interface PropertyInputProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'color' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
}

function PropertyInput({ label, value, onChange, type = 'text', options }: PropertyInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
      onChange(newValue);
    },
    [onChange, type]
  );

  const inputClasses = "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      {type === 'select' && options ? (
        <select
          value={value}
          onChange={handleChange}
          className={inputClasses}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'boolean' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Enabled</span>
        </label>
      ) : (
        <input
          type={type}
          value={value}
          onChange={handleChange}
          className={inputClasses}
        />
      )}
    </div>
  );
}

function StyleEditor({ component }: { component: ComponentInstance }) {
  const updateComponent = useCanvasStore((state) => state.updateComponent);

  const handleStyleChange = useCallback(
    (styleName: string, value: any) => {
      updateComponent(component.id, {
        styles: {
          ...component.styles,
          [styleName]: value,
        },
      });
    },
    [component.id, component.styles, updateComponent]
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
          Layout
        </h4>
        <PropertyInput
          label="Width"
          value={component.size.width}
          onChange={(value) =>
            updateComponent(component.id, {
              size: { ...component.size, width: value },
            })
          }
          type="number"
        />
        <PropertyInput
          label="Height"
          value={component.size.height}
          onChange={(value) =>
            updateComponent(component.id, {
              size: { ...component.size, height: value },
            })
          }
          type="number"
        />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
          Position
        </h4>
        <PropertyInput
          label="X"
          value={component.position.x}
          onChange={(value) =>
            updateComponent(component.id, {
              position: { ...component.position, x: value },
            })
          }
          type="number"
        />
        <PropertyInput
          label="Y"
          value={component.position.y}
          onChange={(value) =>
            updateComponent(component.id, {
              position: { ...component.position, y: value },
            })
          }
          type="number"
        />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
          Appearance
        </h4>
        {component.styles.backgroundColor !== undefined && (
          <PropertyInput
            label="Background Color"
            value={component.styles.backgroundColor || '#ffffff'}
            onChange={(value) => handleStyleChange('backgroundColor', value)}
            type="color"
          />
        )}
        {component.styles.color !== undefined && (
          <PropertyInput
            label="Text Color"
            value={component.styles.color || '#000000'}
            onChange={(value) => handleStyleChange('color', value)}
            type="color"
          />
        )}
        {component.styles.fontSize !== undefined && (
          <PropertyInput
            label="Font Size"
            value={parseInt(component.styles.fontSize) || 16}
            onChange={(value) => handleStyleChange('fontSize', `${value}px`)}
            type="number"
          />
        )}
        {component.styles.borderRadius !== undefined && (
          <PropertyInput
            label="Border Radius"
            value={parseInt(component.styles.borderRadius) || 0}
            onChange={(value) => handleStyleChange('borderRadius', `${value}px`)}
            type="number"
          />
        )}
      </div>
    </div>
  );
}

function PropertiesEditor({ component }: { component: ComponentInstance }) {
  const updateComponent = useCanvasStore((state) => state.updateComponent);

  const handlePropChange = useCallback(
    (propName: string, value: any) => {
      updateComponent(component.id, {
        props: {
          ...component.props,
          [propName]: value,
        },
      });
    },
    [component.id, component.props, updateComponent]
  );

  const renderPropInput = (propName: string, propValue: any) => {
    // Determine input type based on prop name and value
    if (propName === 'variant') {
      return (
        <PropertyInput
          key={propName}
          label="Variant"
          value={propValue}
          onChange={(value) => handlePropChange(propName, value)}
          type="select"
          options={[
            { value: 'primary', label: 'Primary' },
            { value: 'secondary', label: 'Secondary' },
            { value: 'outline', label: 'Outline' },
            { value: 'ghost', label: 'Ghost' },
          ]}
        />
      );
    }

    if (propName === 'direction' && component.type === 'flex') {
      return (
        <PropertyInput
          key={propName}
          label="Direction"
          value={propValue}
          onChange={(value) => handlePropChange(propName, value)}
          type="select"
          options={[
            { value: 'row', label: 'Row' },
            { value: 'column', label: 'Column' },
          ]}
        />
      );
    }

    if (typeof propValue === 'boolean') {
      return (
        <PropertyInput
          key={propName}
          label={propName.charAt(0).toUpperCase() + propName.slice(1)}
          value={propValue}
          onChange={(value) => handlePropChange(propName, value)}
          type="boolean"
        />
      );
    }

    if (typeof propValue === 'number') {
      return (
        <PropertyInput
          key={propName}
          label={propName.charAt(0).toUpperCase() + propName.slice(1)}
          value={propValue}
          onChange={(value) => handlePropChange(propName, value)}
          type="number"
        />
      );
    }

    return (
      <PropertyInput
        key={propName}
        label={propName.charAt(0).toUpperCase() + propName.slice(1)}
        value={propValue}
        onChange={(value) => handlePropChange(propName, value)}
        type="text"
      />
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
          Component Properties
        </h4>
        {Object.entries(component.props).map(([propName, propValue]) =>
          renderPropInput(propName, propValue)
        )}
      </div>
    </div>
  );
}

function ActionsEditor({ component }: { component: ComponentInstance }) {
  const [handlers, setHandlers] = useState<Record<string, string>>({});
  const updateComponent = useCanvasStore((state) => state.updateComponent);

  const commonEvents = [
    'onClick',
    'onDoubleClick',
    'onMouseEnter',
    'onMouseLeave',
    'onFocus',
    'onBlur',
    'onChange',
    'onSubmit',
  ];

  const handleEventChange = useCallback(
    (eventName: string, code: string) => {
      setHandlers((prev) => ({ ...prev, [eventName]: code }));
      // In a real implementation, this would compile and attach the handler
      console.log(`Event ${eventName} updated for component ${component.id}`);
    },
    [component.id]
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
          Event Handlers
        </h4>
        {commonEvents.map((eventName) => (
          <div key={eventName} className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {eventName}
            </label>
            <textarea
              value={handlers[eventName] || ''}
              onChange={(e) => handleEventChange(eventName, e.target.value)}
              placeholder={`// ${eventName} handler`}
              className="w-full px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const components = useCanvasStore((state) => state.components);
  const removeComponent = useCanvasStore((state) => state.removeComponent);
  const updateComponent = useCanvasStore((state) => state.updateComponent);
  const duplicateComponent = useCanvasStore((state) => state.duplicateComponent);

  const selectedComponent = selectedIds.length === 1 ? components[selectedIds[0]] : null;

  const handleDelete = useCallback(() => {
    if (selectedComponent) {
      removeComponent(selectedComponent.id);
    }
  }, [selectedComponent, removeComponent]);

  const handleDuplicate = useCallback(() => {
    if (selectedComponent) {
      duplicateComponent(selectedComponent.id);
    }
  }, [selectedComponent, duplicateComponent]);

  const toggleLock = useCallback(() => {
    if (selectedComponent) {
      updateComponent(selectedComponent.id, {
        locked: !selectedComponent.locked,
      });
    }
  }, [selectedComponent, updateComponent]);

  const toggleVisibility = useCallback(() => {
    if (selectedComponent) {
      updateComponent(selectedComponent.id, {
        hidden: !selectedComponent.hidden,
      });
    }
  }, [selectedComponent, updateComponent]);

  if (!selectedComponent) {
    return (
      <div className={cn('bg-gray-50 border-l border-gray-200 flex items-center justify-center', className)}>
        <p className="text-sm text-gray-500">Select a component to edit properties</p>
      </div>
    );
  }

  return (
    <div className={cn('bg-gray-50 border-l border-gray-200 flex flex-col', className)}>
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleLock}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors',
                selectedComponent.locked && 'text-blue-600 bg-blue-50'
              )}
              title={selectedComponent.locked ? 'Unlock' : 'Lock'}
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              onClick={toggleVisibility}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors',
                selectedComponent.hidden && 'text-blue-600 bg-blue-50'
              )}
              title={selectedComponent.hidden ? 'Show' : 'Hide'}
            >
              {selectedComponent.hidden ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {selectedComponent.type.charAt(0).toUpperCase() + selectedComponent.type.slice(1)}
        </p>
      </div>

      <Tabs defaultValue="properties" className="flex-1 flex flex-col">
        <TabsList className="bg-white border-b border-gray-200 p-1">
          <TabsTrigger
            value="properties"
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 transition-colors"
          >
            <Settings className="w-4 h-4 mr-1.5 inline-block" />
            Props
          </TabsTrigger>
          <TabsTrigger
            value="styles"
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 transition-colors"
          >
            <Paintbrush className="w-4 h-4 mr-1.5 inline-block" />
            Styles
          </TabsTrigger>
          <TabsTrigger
            value="actions"
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 transition-colors"
          >
            <Zap className="w-4 h-4 mr-1.5 inline-block" />
            Actions
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="properties" className="p-4">
            <PropertiesEditor component={selectedComponent} />
          </TabsContent>
          <TabsContent value="styles" className="p-4">
            <StyleEditor component={selectedComponent} />
          </TabsContent>
          <TabsContent value="actions" className="p-4">
            <ActionsEditor component={selectedComponent} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}