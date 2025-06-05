import { v4 as uuidv4 } from 'uuid';
import type { ComponentInstance, ComponentDefinition } from '../types';

export function getComponentDefinitions(): ComponentDefinition[] {
  return [
    // Basic Components
    {
      type: 'text',
      name: 'Text',
      category: 'Basic',
      icon: 'Type',
      defaultProps: {
        text: 'Lorem ipsum dolor sit amet',
      },
      defaultStyles: {
        fontSize: '16px',
        color: '#000000',
        fontWeight: 'normal',
      },
      defaultSize: { width: 200, height: 50 },
      isContainer: false,
      acceptsChildren: [],
    },
    {
    type: 'button',
    name: 'Button',
    category: 'Basic',
    icon: 'Button',
    defaultProps: {
      label: 'Click me',
      variant: 'primary',
    },
    defaultStyles: {},
    defaultSize: { width: 120, height: 40 },
    isContainer: false,
    acceptsChildren: [],
    },
    {
    type: 'image',
    name: 'Image',
    category: 'Basic',
    icon: 'Image',
    defaultProps: {
      src: '/api/placeholder/300/200',
      alt: 'Placeholder image',
    },
    defaultStyles: {
      objectFit: 'cover',
    },
    defaultSize: { width: 300, height: 200 },
    isContainer: false,
    acceptsChildren: [],
    },
    // Layout Components
    {
    type: 'container',
    name: 'Container',
    category: 'Layout',
    icon: 'Square',
    defaultProps: {},
    defaultStyles: {
      display: 'block',
      position: 'relative',
    },
    defaultSize: { width: 400, height: 300 },
    isContainer: true,
    acceptsChildren: ['*'],
    },
    {
    type: 'flex',
    name: 'Flex Box',
    category: 'Layout',
    icon: 'Layout',
    defaultProps: {
      direction: 'row',
      align: 'center',
      justify: 'start',
      gap: 10,
    },
    defaultStyles: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '10px',
    },
    defaultSize: { width: 400, height: 100 },
    isContainer: true,
    acceptsChildren: ['*'],
    },
    {
    type: 'grid',
    name: 'Grid',
    category: 'Layout',
    icon: 'Grid3x3',
    defaultProps: {
      columns: 3,
      rows: 2,
      gap: 10,
    },
    defaultStyles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      gap: '10px',
    },
    defaultSize: { width: 600, height: 400 },
    isContainer: true,
    acceptsChildren: ['*'],
    },
    // Form Components
    {
      type: 'input',
      name: 'Input',
      category: 'Form',
      icon: 'FormInput',
      defaultProps: {
        placeholder: 'Enter text...',
        inputType: 'text',
      },
      defaultStyles: {
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        width: '100%',
      },
      defaultSize: { width: 250, height: 40 },
      isContainer: false,
      acceptsChildren: [],
    },
    {
      type: 'form',
      name: 'Form',
      category: 'Form',
      icon: 'FileText',
      defaultProps: {},
      defaultStyles: {
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      },
      defaultSize: { width: 400, height: 300 },
      isContainer: true,
      acceptsChildren: ['input', 'textarea', 'select', 'checkbox', 'radio', 'button'],
    },
  ];
}

export const componentDefinitions = getComponentDefinitions().reduce((acc, def) => {
  acc[def.type] = def;
  return acc;
}, {} as Record<string, ComponentDefinition>);

export function createComponent(
  type: string,
  position = { x: 0, y: 0 },
  parentId: string | null = null
): ComponentInstance {
  const definition = componentDefinitions[type];
  if (!definition) {
    throw new Error(`Unknown component type: ${type}`);
  }

  return {
    id: uuidv4(),
    type,
    parentId,
    position,
    size: { ...definition.defaultSize },
    props: { ...definition.defaultProps },
    styles: { ...definition.defaultStyles },
    children: [],
    locked: false,
    hidden: false,
  };
}

export function canAcceptChild(
  parentType: string,
  childType: string
): boolean {
  const parentDef = componentDefinitions[parentType];
  if (!parentDef || !parentDef.isContainer) {
    return false;
  }

  if (parentDef.acceptsChildren.includes('*')) {
    return true;
  }

  return parentDef.acceptsChildren.includes(childType);
}