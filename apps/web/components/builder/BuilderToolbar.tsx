'use client';

import { Button } from '@nexus/ui';
import { useCanvasStore } from '@nexus/canvas-engine';
import {
  Save,
  Undo,
  Redo,
  Play,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  ZoomIn,
  ZoomOut,
  Grid,
  Layers,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

interface BuilderToolbarProps {
  projectId: string;
  onToggleLayers: () => void;
  onToggleProperties: () => void;
}

export function BuilderToolbar({
  projectId,
  onToggleLayers,
  onToggleProperties,
}: BuilderToolbarProps) {
  const { zoom, setZoom, grid, undo, redo } = useCanvasStore();

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.1));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
          
          <div className="w-px h-6 bg-gray-700" />
          
          <Button variant="ghost" size="sm" onClick={() => undo()}>
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => redo()}>
            <Redo className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-700" />
          
          <Button variant="ghost" size="sm">
            <Monitor className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Tablet className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-700" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLayers}
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleProperties}
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-700" />
          
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          <Button variant="ghost" size="sm">
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button size="sm">
            <Play className="w-4 h-4 mr-1" />
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}