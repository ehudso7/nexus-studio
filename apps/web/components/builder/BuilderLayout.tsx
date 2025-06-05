'use client';

import { Canvas, CanvasProvider, DragLayer } from '@nexus/canvas-engine';
import { ComponentPalette } from './ComponentPalette';
import { PropertyPanel } from './PropertyPanel';
import { BuilderToolbar } from './BuilderToolbar';
import { LayersPanel } from './LayersPanel';
import { AIAssistant } from './ai-assistant';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BuilderLayoutProps {
  projectId: string;
}

export function BuilderLayout({ projectId }: BuilderLayoutProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [leftPanelTab, setLeftPanelTab] = useState('components');

  return (
    <CanvasProvider>
      <div className="h-screen flex flex-col bg-gray-900">
        <BuilderToolbar
          projectId={projectId}
          onToggleLayers={() => setShowLayers(!showLayers)}
          onToggleProperties={() => setShowProperties(!showProperties)}
        />
        
        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 border-r border-gray-800">
            <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="h-full">
              <TabsList className="w-full">
                <TabsTrigger value="components" className="flex-1">Components</TabsTrigger>
                <TabsTrigger value="ai" className="flex-1">AI Assistant</TabsTrigger>
              </TabsList>
              <TabsContent value="components" className="h-[calc(100%-40px)]">
                <ComponentPalette />
              </TabsContent>
              <TabsContent value="ai" className="h-[calc(100%-40px)] overflow-y-auto">
                <AIAssistant projectId={projectId} />
              </TabsContent>
            </Tabs>
          </div>
          
          {showLayers && <LayersPanel />}
          
          <div className="flex-1 relative">
            <Canvas
              className="w-full h-full"
              onComponentSelect={setSelectedComponentId}
            />
            <DragLayer />
          </div>
          
          {showProperties && (
            <PropertyPanel componentId={selectedComponentId} />
          )}
        </div>
      </div>
    </CanvasProvider>
  );
}