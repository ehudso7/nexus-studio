import { env } from './env'

const API_BASE_URL = env.API_URL

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new ApiError(response.status, error || response.statusText)
  }

  return response.json()
}

// Auth API
export const authApi = {
  signIn: async (email: string, password: string) => {
    return fetchApi('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  
  signUp: async (data: { name: string; email: string; password: string }) => {
    return fetchApi('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  
  me: async () => {
    return fetchApi('/auth/me')
  },
  
  signOut: async () => {
    return fetchApi('/auth/signout', {
      method: 'POST',
    })
  },
}

// Projects API
export const projectsApi = {
  list: async () => {
    return fetchApi('/projects')
  },
  
  get: async (id: string) => {
    return fetchApi(`/projects/${id}`)
  },
  
  create: async (data: { name: string; description?: string }) => {
    return fetchApi('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  
  update: async (id: string, data: Partial<{ name: string; description: string }>) => {
    return fetchApi(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
  
  delete: async (id: string) => {
    return fetchApi(`/projects/${id}`, {
      method: 'DELETE',
    })
  },
}

// Deployments API
export const deploymentsApi = {
  deploy: async (projectId: string, provider: string = 'vercel') => {
    return fetchApi(`/projects/${projectId}/deploy`, {
      method: 'POST',
      body: JSON.stringify({ provider }),
    })
  },
  
  list: async (projectId: string) => {
    return fetchApi(`/projects/${projectId}/deployments`)
  },
  
  get: async (projectId: string, deploymentId: string) => {
    return fetchApi(`/projects/${projectId}/deployments/${deploymentId}`)
  },
}