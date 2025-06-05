import { create } from 'zustand'
import { projectsApi } from '@/lib/api'

interface Project {
  id: string
  name: string
  description: string | null
  slug: string
  isPublic: boolean
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
  _count?: {
    collaborators: number
    pages: number
    deployments: number
  }
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (data: { name: string; description?: string; isPublic?: boolean }) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  clearError: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  
  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const projects = await projectsApi.list()
      set({ projects, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        isLoading: false 
      })
    }
  },
  
  fetchProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const project = await projectsApi.get(id)
      set({ currentProject: project, isLoading: false })
      
      // Update in projects list if exists
      const projects = get().projects
      const index = projects.findIndex(p => p.id === id)
      if (index !== -1) {
        projects[index] = project
        set({ projects: [...projects] })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch project',
        isLoading: false 
      })
    }
  },
  
  createProject: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const project = await projectsApi.create(data)
      set(state => ({ 
        projects: [project, ...state.projects],
        isLoading: false 
      }))
      return project
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false 
      })
      throw error
    }
  },
  
  updateProject: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await projectsApi.update(id, data)
      
      // Update in projects list
      set(state => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...updated } : p),
        currentProject: state.currentProject?.id === id 
          ? { ...state.currentProject, ...updated }
          : state.currentProject,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update project',
        isLoading: false 
      })
      throw error
    }
  },
  
  deleteProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await projectsApi.delete(id)
      
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete project',
        isLoading: false 
      })
      throw error
    }
  },
  
  setCurrentProject: (project) => {
    set({ currentProject: project })
  },
  
  clearError: () => {
    set({ error: null })
  },
}))