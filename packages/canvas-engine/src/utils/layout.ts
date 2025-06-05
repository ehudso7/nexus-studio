import type { Position, Size, ComponentInstance } from '../types';

export function snapToGrid(position: Position, gridSize: number): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

export function getComponentBounds(component: ComponentInstance) {
  return {
    left: component.position.x,
    top: component.position.y,
    right: component.position.x + component.size.width,
    bottom: component.position.y + component.size.height,
    width: component.size.width,
    height: component.size.height,
  };
}

export function isPointInBounds(
  point: Position,
  component: ComponentInstance
): boolean {
  const bounds = getComponentBounds(component);
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}

export function doComponentsOverlap(
  comp1: ComponentInstance,
  comp2: ComponentInstance
): boolean {
  const bounds1 = getComponentBounds(comp1);
  const bounds2 = getComponentBounds(comp2);

  return !(
    bounds1.right < bounds2.left ||
    bounds1.left > bounds2.right ||
    bounds1.bottom < bounds2.top ||
    bounds1.top > bounds2.bottom
  );
}

export function getSmartGuides(
  movingComponent: ComponentInstance,
  components: ComponentInstance[],
  threshold: number = 5
): { horizontal: number[]; vertical: number[] } {
  const guides = {
    horizontal: [] as number[],
    vertical: [] as number[],
  };

  const movingBounds = getComponentBounds(movingComponent);

  components.forEach((component) => {
    if (component.id === movingComponent.id) return;

    const bounds = getComponentBounds(component);

    // Horizontal guides (top and bottom edges)
    if (Math.abs(movingBounds.top - bounds.top) < threshold) {
      guides.horizontal.push(bounds.top);
    }
    if (Math.abs(movingBounds.top - bounds.bottom) < threshold) {
      guides.horizontal.push(bounds.bottom);
    }
    if (Math.abs(movingBounds.bottom - bounds.top) < threshold) {
      guides.horizontal.push(bounds.top);
    }
    if (Math.abs(movingBounds.bottom - bounds.bottom) < threshold) {
      guides.horizontal.push(bounds.bottom);
    }

    // Vertical guides (left and right edges)
    if (Math.abs(movingBounds.left - bounds.left) < threshold) {
      guides.vertical.push(bounds.left);
    }
    if (Math.abs(movingBounds.left - bounds.right) < threshold) {
      guides.vertical.push(bounds.right);
    }
    if (Math.abs(movingBounds.right - bounds.left) < threshold) {
      guides.vertical.push(bounds.left);
    }
    if (Math.abs(movingBounds.right - bounds.right) < threshold) {
      guides.vertical.push(bounds.right);
    }
  });

  return {
    horizontal: [...new Set(guides.horizontal)],
    vertical: [...new Set(guides.vertical)],
  };
}