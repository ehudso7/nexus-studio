import React, { useCallback, memo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useCanvasStore } from '../store';
import type { DragItem, ComponentInstance } from '../types';
import { cn } from '../utils/helpers';

export interface ComponentRendererProps {
  componentId: string;
}

export const ComponentRenderer = memo(function ComponentRenderer({ componentId }: ComponentRendererProps) {
  const component = useCanvasStore((state) => state.components[componentId]);
  const selectComponent = useCanvasStore((state) => state.selectComponent);
  const moveComponent = useCanvasStore((state) => state.moveComponent);
  const updateComponent = useCanvasStore((state) => state.updateComponent);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const hoveredId = useCanvasStore((state) => state.hoveredId);
  const setHoveredComponent = useCanvasStore((state) => state.setHoveredComponent);

  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: 'move-component',
    item: {
      type: 'move-component',
      componentId,
    },
    canDrag: !component?.locked,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: ['new-component', 'move-component'],
    canDrop: (item) => {
      if (item.type === 'move-component') {
        // Prevent dropping a component into itself or its descendants
        const store = useCanvasStore.getState();
        const ancestors = store.getAncestors(componentId);
        return item.componentId !== componentId && !ancestors.includes(item.componentId!);
      }
      return true;
    },
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;

      if (item.type === 'move-component' && item.componentId) {
        const children = component?.children || [];
        moveComponent(item.componentId, componentId, children.length);
      } else if (item.type === 'new-component' && item.componentType) {
        const store = useCanvasStore.getState();
        store.addComponent(item.componentType, componentId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectComponent(componentId, e.ctrlKey || e.metaKey);
    },
    [componentId, selectComponent]
  );

  const handleMouseEnter = useCallback(() => {
    setHoveredComponent(componentId);
  }, [componentId, setHoveredComponent]);

  const handleMouseLeave = useCallback(() => {
    setHoveredComponent(null);
  }, [setHoveredComponent]);

  if (!component) return null;

  const isSelected = selectedIds.includes(componentId);
  const isHovered = hoveredId === componentId;

  const combinedRef = (el: HTMLElement | null) => {
    drag(el);
    drop(el);
  };
  
  const renderStyle: React.CSSProperties = {
    ...component.styles,
    position: component.type === 'canvas' ? 'relative' : 'absolute',
    left: component.position.x,
    top: component.position.y,
    width: component.size.width,
    height: component.size.height,
    minHeight: component.size.height,
    boxSizing: 'border-box',
    userSelect: 'none',
    cursor: component.locked ? 'default' : 'move',
  };

  const componentElement = renderComponentContent({
    component,
    ref: combinedRef,
    className: cn(
      isSelected && 'ring-2 ring-blue-500 ring-offset-1',
      isHovered && !isSelected && 'ring-1 ring-blue-300',
      isDragging && 'opacity-50',
      isOver && 'ring-2 ring-green-500'
    ),
    style: renderStyle,
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    updateComponent: (updates: Partial<ComponentInstance>) => updateComponent(componentId, updates),
    children: component.children.map((childId) => (
      <ComponentRenderer key={childId} componentId={childId} />
    )),
  });

  return componentElement;
});

interface RenderProps {
  component: ComponentInstance;
  ref: (el: HTMLElement | null) => void;
  className?: string;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  updateComponent: (updates: Partial<ComponentInstance>) => void;
  children?: React.ReactNode;
}

function renderComponentContent(props: RenderProps): React.ReactElement {
  const { component, ref, className, style, onClick, onMouseEnter, onMouseLeave, updateComponent, children } = props;
  const { type, props: componentProps } = component;
  
  const commonProps = {
    className,
    style,
    onClick,
    onMouseEnter,
    onMouseLeave,
  };

  switch (type) {
    case 'canvas':
    case 'container':
    case 'div':
    case 'section':
    case 'header':
    case 'footer':
    case 'main':
    case 'article':
    case 'aside':
    case 'nav':
      return React.createElement(
        type === 'canvas' || type === 'container' ? 'div' : type,
        { ref, ...commonProps },
        children
      );

    case 'text':
    case 'heading':
    case 'paragraph':
      const TextTag = type === 'heading' ? (componentProps.level ? `h${componentProps.level}` : 'h2') : 'p';
      return React.createElement(
        TextTag,
        { ref, ...commonProps, contentEditable: componentProps.editable, suppressContentEditableWarning: true },
        componentProps.text || 'Edit text...'
      );

    case 'button':
      return (
        <button
          ref={ref as any}
          {...commonProps}
          type="button"
          disabled={componentProps.disabled}
        >
          {componentProps.text || componentProps.label || 'Button'}
        </button>
      );

    case 'link':
      return (
        <a
          ref={ref as any}
          {...commonProps}
          href={componentProps.href || '#'}
          target={componentProps.target}
          rel={componentProps.target === '_blank' ? 'noopener noreferrer' : undefined}
        >
          {componentProps.text || 'Link'}
        </a>
      );

    case 'image':
      return (
        <img
          ref={ref as any}
          {...commonProps}
          src={componentProps.src || 'https://via.placeholder.com/300x200'}
          alt={componentProps.alt || 'Image'}
          draggable={false}
        />
      );

    case 'input':
      return (
        <input
          ref={ref as any}
          {...commonProps}
          type={componentProps.inputType || 'text'}
          placeholder={componentProps.placeholder || ''}
          value={componentProps.value || ''}
          disabled={componentProps.disabled}
          readOnly={componentProps.readOnly}
          required={componentProps.required}
          onChange={(e) => updateComponent({ props: { ...componentProps, value: e.target.value } })}
        />
      );

    case 'textarea':
      return (
        <textarea
          ref={ref as any}
          {...commonProps}
          placeholder={componentProps.placeholder || ''}
          value={componentProps.value || ''}
          disabled={componentProps.disabled}
          readOnly={componentProps.readOnly}
          required={componentProps.required}
          rows={componentProps.rows || 3}
          onChange={(e) => updateComponent({ props: { ...componentProps, value: e.target.value } })}
        />
      );

    case 'select':
      return (
        <select
          ref={ref as any}
          {...commonProps}
          value={componentProps.value || ''}
          disabled={componentProps.disabled}
          required={componentProps.required}
          onChange={(e) => updateComponent({ props: { ...componentProps, value: e.target.value } })}
        >
          {componentProps.options?.map((option: any, index: number) => (
            <option key={option.value || index} value={option.value}>
              {option.label || option.value}
            </option>
          )) || <option value="">Select...</option>}
        </select>
      );

    case 'checkbox':
      return (
        <label ref={ref as any} {...commonProps} className={cn(commonProps.className, 'flex items-center')}>
          <input
            type="checkbox"
            checked={componentProps.checked || false}
            disabled={componentProps.disabled}
            required={componentProps.required}
            onChange={(e) => updateComponent({ props: { ...componentProps, checked: e.target.checked } })}
          />
          <span className="ml-2">{componentProps.label || 'Checkbox'}</span>
        </label>
      );

    case 'radio':
      return (
        <label ref={ref as any} {...commonProps} className={cn(commonProps.className, 'flex items-center')}>
          <input
            type="radio"
            name={componentProps.name || `radio-${component.id}`}
            value={componentProps.value || ''}
            checked={componentProps.checked || false}
            disabled={componentProps.disabled}
            required={componentProps.required}
            onChange={(e) => updateComponent({ props: { ...componentProps, checked: true } })}
          />
          <span className="ml-2">{componentProps.label || 'Radio'}</span>
        </label>
      );

    case 'form':
      return (
        <form
          ref={ref as any}
          {...commonProps}
          onSubmit={(e) => {
            e.preventDefault();
            console.log('Form submitted:', component.id);
          }}
        >
          {children}
        </form>
      );

    case 'divider':
      return (
        <hr
          ref={ref as any}
          {...commonProps}
          style={{
            ...style,
            width: componentProps.vertical ? '1px' : '100%',
            height: componentProps.vertical ? '100%' : '1px',
          }}
        />
      );

    case 'spacer':
      return <div ref={ref as any} {...commonProps} />;

    case 'icon':
      return (
        <span ref={ref as any} {...commonProps} className={cn(commonProps.className, 'inline-flex items-center justify-center')}>
          {componentProps.icon || '📦'}
        </span>
      );

    default:
      return (
        <div ref={ref as any} {...commonProps} className={cn(commonProps.className, 'flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded')}>
          <span className="text-sm text-gray-600 font-medium">{type}</span>
        </div>
      );
  }
}