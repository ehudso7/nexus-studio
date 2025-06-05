import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  avatarUrl: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: { name: string; email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
  checkAuth: () => Promise<void>
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => {
        set({ token })
        if (token) {
          localStorage.setItem('auth-token', token)
        } else {
          localStorage.removeItem('auth-token')
        }
      },
      
      signIn: async (email, password) => {
        set({ isLoading: true })
        try {
          const { user, token } = await authApi.signIn(email, password)
          get().setUser(user)
          get().setToken(token)
        } finally {
          set({ isLoading: false })
        }
      },
      
      signUp: async (data) => {
        set({ isLoading: true })
        try {
          const { user, token } = await authApi.signUp(data)
          get().setUser(user)
          get().setToken(token)
        } finally {
          set({ isLoading: false })
        }
      },
      
      signOut: async () => {
        set({ isLoading: true })
        try {
          await authApi.signOut()
        } catch (error) {
          // Ignore errors, we're signing out anyway
        } finally {
          get().clearAuth()
          set({ isLoading: false })
        }
      },
      
      checkAuth: async () => {
        const token = get().token || localStorage.getItem('auth-token')
        if (!token) {
          get().clearAuth()
          return
        }
        
        set({ isLoading: true })
        try {
          const { user } = await authApi.me()
          get().setUser(user)
          get().setToken(token)
        } catch (error) {
          get().clearAuth()
        } finally {
          set({ isLoading: false })
        }
      },
      
      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false })
        localStorage.removeItem('auth-token')
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
)