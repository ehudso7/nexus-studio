'use client';

import { useCanvasStore } from '@nexus/canvas-engine';
import { Label } from '@nexus/ui';
import { useEffect, useState } from 'react';

interface PropertyPanelProps {
  componentId: string | null;
}

export function PropertyPanel({ componentId }: PropertyPanelProps) {
  const component = useCanvasStore((state) => 
    componentId ? state.components[componentId] : null
  );
  const updateComponent = useCanvasStore((state) => state.updateComponent);
  const [localProps, setLocalProps] = useState(component?.props || {});
  const [localStyles, setLocalStyles] = useState(component?.styles || {});

  useEffect(() => {
    if (component) {
      setLocalProps(component.props);
      setLocalStyles(component.styles);
    }
  }, [component]);

  if (!component || !componentId) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-800 p-4">
        <p className="text-gray-500 text-sm">Select a component to edit properties</p>
      </div>
    );
  }

  const handlePropChange = (key: string, value: any) => {
    const newProps = { ...localProps, [key]: value };
    setLocalProps(newProps);
    updateComponent(componentId, { props: newProps });
  };

  const handleStyleChange = (key: string, value: any) => {
    const newStyles = { ...localStyles, [key]: value };
    setLocalStyles(newStyles);
    updateComponent(componentId, { styles: newStyles });
  };

  const handlePositionChange = (axis: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value) || 0;
    updateComponent(componentId, {
      position: {
        ...component.position,
        [axis]: numValue,
      },
    });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseFloat(value) || 0;
    updateComponent(componentId, {
      size: {
        ...component.size,
        [dimension]: Math.max(20, numValue),
      },
    });
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 overflow-y-auto">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300">Properties</h3>
        <p className="text-xs text-gray-500 mt-1">{component.type}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Position */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2">Position</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">X</Label>
              <input
                type="number"
                value={component.position.x}
                onChange={(e) => handlePositionChange('x', e.target.value)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Y</Label>
              <input
                type="number"
                value={component.position.y}
                onChange={(e) => handlePositionChange('y', e.target.value)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2">Size</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">Width</Label>
              <input
                type="number"
                value={component.size.width}
                onChange={(e) => handleSizeChange('width', e.target.value)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Height</Label>
              <input
                type="number"
                value={component.size.height}
                onChange={(e) => handleSizeChange('height', e.target.value)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Component-specific properties */}
        {component.type === 'text' && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Text Properties</h4>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-500">Text</Label>
                <textarea
                  value={localProps.text || ''}
                  onChange={(e) => handlePropChange('text', e.target.value)}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {component.type === 'button' && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Button Properties</h4>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-500">Label</Label>
                <input
                  type="text"
                  value={localProps.label || ''}
                  onChange={(e) => handlePropChange('label', e.target.value)}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                />
              </div>
            </div>
          </div>
        )}

        {component.type === 'image' && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Image Properties</h4>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-500">Source URL</Label>
                <input
                  type="text"
                  value={localProps.src || ''}
                  onChange={(e) => handlePropChange('src', e.target.value)}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Alt Text</Label>
                <input
                  type="text"
                  value={localProps.alt || ''}
                  onChange={(e) => handlePropChange('alt', e.target.value)}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Styles */}
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2">Styles</h4>
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-gray-500">Background Color</Label>
              <input
                type="color"
                value={localStyles.backgroundColor || '#ffffff'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-full h-8 bg-gray-800 border border-gray-700 rounded"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Border Radius</Label>
              <input
                type="number"
                value={parseInt(localStyles.borderRadius) || 0}
                onChange={(e) => handleStyleChange('borderRadius', `${e.target.value}px`)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}