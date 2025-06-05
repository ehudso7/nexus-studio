'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { 
  Canvas, 
  ComponentPalette, 
  PropertiesPanel, 
  DragLayer,
  useCanvasStore 
} from '@nexus-studio/canvas-engine'
import { 
  Save, 
  Download, 
  Upload, 
  Undo, 
  Redo, 
  Eye, 
  Code, 
  Grid3x3,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings,
  Play,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadJSON } from '@nexus-studio/canvas-engine/dist/utils/helpers'
import { useProject, useUpdateProject } from '@/lib/graphql/hooks'
import { setAuthToken } from '@/lib/graphql-client'
import { toast } from 'sonner'

type ViewMode = 'design' | 'preview' | 'code'
type Tool = 'select' | 'pan'

export default function BuilderPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const projectId = params.id
  const [viewMode, setViewMode] = useState<ViewMode>('design')
  const [currentTool, setCurrentTool] = useState<Tool>('select')
  const [isSaving, setIsSaving] = useState(false)
  
  // Set auth token
  useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      setAuthToken(token)
    } else {
      router.push('/auth/signin')
    }
  }, [router])
  
  // GraphQL queries
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const updateProjectMutation = useUpdateProject()
  
  // Canvas store actions
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    zoom,
    setZoom,
    exportToJSON,
    importFromJSON,
    clearCanvas,
    toggleGrid,
    grid,
  } = useCanvasStore()

  // Load project data into canvas
  useEffect(() => {
    if (project?.components && project.components.length > 0) {
      // Convert backend component format to canvas format
      const canvasData = {
        components: project.components.reduce((acc: any, comp: any) => {
          acc[comp.id] = {
            id: comp.id,
            type: comp.type,
            props: comp.props || {},
            styles: comp.styles || {},
            position: comp.props?.position || { x: 0, y: 0 },
            size: comp.props?.size || { width: 100, height: 100 },
            children: comp.children || [],
            parentId: comp.props?.parentId || null,
            locked: false,
            hidden: false,
          }
          return acc
        }, {}),
        rootId: project.components.find((c: any) => !c.props?.parentId)?.id || null,
        selectedIds: [],
        hoveredId: null,
      }
      importFromJSON(canvasData)
    }
  }, [project, importFromJSON])

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      handleSave(true)
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (canRedo) redo()
      }
      
      // Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      
      // Tools
      if (e.key === 'v' || e.key === 'V') {
        setCurrentTool('select')
      }
      if (e.key === 'h' || e.key === 'H') {
        setCurrentTool('pan')
      }
      
      // View modes
      if (e.key === '1' && !e.metaKey && !e.ctrlKey) {
        setViewMode('design')
      }
      if (e.key === '2' && !e.metaKey && !e.ctrlKey) {
        setViewMode('preview')
      }
      if (e.key === '3' && !e.metaKey && !e.ctrlKey) {
        setViewMode('code')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, undo, redo])

  const handleSave = useCallback(async (isAutoSave = false) => {
    if (isSaving || !project) return
    
    setIsSaving(true)
    try {
      const canvasData = exportToJSON()
      
      // Convert canvas format to backend format
      const components = Object.values(canvasData.components).map((comp: any) => ({
        id: comp.id,
        name: comp.type,
        type: comp.type,
        props: {
          ...comp.props,
          position: comp.position,
          size: comp.size,
          parentId: comp.parentId,
        },
        styles: comp.styles,
        children: comp.children,
      }))
      
      await updateProjectMutation.mutateAsync({
        id: projectId,
        input: {
          settings: {
            ...project.settings,
            canvasData,
          },
        },
      })
      
      if (!isAutoSave) {
        toast.success('Project saved successfully!')
      }
    } catch (error) {
      console.error('Failed to save project:', error)
      toast.error('Failed to save project')
    } finally {
      setIsSaving(false)
    }
  }, [projectId, project, exportToJSON, updateProjectMutation, isSaving])

  const handleExport = useCallback(() => {
    const data = exportToJSON()
    downloadJSON(data, `project-${projectId}-${new Date().toISOString()}.json`)
  }, [projectId, exportToJSON])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        importFromJSON(data)
        toast.success('Project imported successfully!')
      } catch (error) {
        console.error('Failed to import file:', error)
        toast.error('Failed to import file')
      }
    }
    input.click()
  }, [importFromJSON])

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3))
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1))
  const handleZoomReset = () => setZoom(1)

  const handlePreview = () => {
    // Open preview in new tab
    window.open(`/preview/${projectId}`, '_blank')
  }

  const handleDeploy = () => {
    router.push(`/dashboard/projects/${projectId}/deploy`)
  }

  if (projectLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Project not found</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-400 hover:text-blue-300"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-900">
        {/* Header Toolbar */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo/Title */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ← Back
                </button>
                <h1 className="text-white font-semibold">{project.name}</h1>
              </div>

              {/* Tool Selection */}
              <div className="flex items-center bg-gray-700 rounded-md p-1">
                <button
                  onClick={() => setCurrentTool('select')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    currentTool === 'select'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                  title="Select Tool (V)"
                >
                  <MousePointer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentTool('pan')}
                  className={cn(
                    'p-2 rounded transition-colors',
                    currentTool === 'pan'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                  title="Pan Tool (H)"
                >
                  <Hand className="w-4 h-4" />
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-gray-700 rounded-md p-1">
                <button
                  onClick={() => setViewMode('design')}
                  className={cn(
                    'px-3 py-1 rounded text-sm transition-colors',
                    viewMode === 'design'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  Design
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={cn(
                    'px-3 py-1 rounded text-sm transition-colors',
                    viewMode === 'preview'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={cn(
                    'px-3 py-1 rounded text-sm transition-colors',
                    viewMode === 'code'
                      ? 'bg-gray-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  Code
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              <button
                onClick={undo}
                disabled={!canUndo}
                className={cn(
                  'p-2 rounded transition-colors',
                  canUndo
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 cursor-not-allowed'
                )}
                title="Undo (Cmd/Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={cn(
                  'p-2 rounded transition-colors',
                  canRedo
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 cursor-not-allowed'
                )}
                title="Redo (Cmd/Ctrl+Shift+Z)"
              >
                <Redo className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-gray-700 mx-1" />

              {/* Grid Toggle */}
              <button
                onClick={toggleGrid}
                className={cn(
                  'p-2 rounded transition-colors',
                  grid.show
                    ? 'text-white bg-gray-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                )}
                title="Toggle Grid"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-gray-700 rounded-md px-2 py-1">
                <button
                  onClick={handleZoomOut}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-300 min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="text-gray-400 hover:text-white transition-colors ml-1"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-6 bg-gray-700 mx-1" />

              {/* Import/Export */}
              <button
                onClick={handleImport}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Import"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Export"
              >
                <Download className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-gray-700 mx-1" />

              {/* Actions */}
              <button
                onClick={handlePreview}
                className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className={cn(
                  'px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5',
                  isSaving
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleDeploy}
                className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded transition-colors flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                Deploy
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {viewMode === 'design' && (
            <>
              {/* Component Palette */}
              <ComponentPalette className="w-64 flex-shrink-0" />

              {/* Canvas */}
              <div className="flex-1 relative">
                <Canvas tool={currentTool} />
                <DragLayer />
              </div>

              {/* Properties Panel */}
              <PropertiesPanel className="w-80 flex-shrink-0" />
            </>
          )}

          {viewMode === 'preview' && (
            <div className="flex-1 bg-white">
              <iframe
                src={`/preview/${projectId}?embedded=true`}
                className="w-full h-full border-0"
                title="Preview"
              />
            </div>
          )}

          {viewMode === 'code' && (
            <div className="flex-1 bg-gray-900 p-4">
              <pre className="bg-gray-800 text-gray-300 p-4 rounded-lg overflow-auto h-full">
                <code>{JSON.stringify(exportToJSON(), null, 2)}</code>
              </pre>
            </div>
          )}
        </main>
      </div>
    </DndProvider>
  )
}