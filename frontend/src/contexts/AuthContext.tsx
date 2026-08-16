import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import api from '../services/api'

export type UserRole = 'citizen' | 'authority' | 'admin'

export interface User {
  id: number
  full_name: string
  email: string
  phone?: string
  role: UserRole
  is_active: boolean
  created_at: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: { full_name: string; email: string; password: string; phone?: string; role?: string }) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
  token: string | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps { children: ReactNode }

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('rw_token'))
  const [loading, setLoading] = useState<boolean>(!!token)

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data)
      localStorage.setItem('rw_user', JSON.stringify(data))
    } catch {
      setUser(null)
      setToken(null)
      localStorage.removeItem('rw_token')
      localStorage.removeItem('rw_user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) {
      const cached = localStorage.getItem('rw_user')
      if (cached) {
        try { setUser(JSON.parse(cached)); setLoading(false) } catch {/* ignore */}
      }
      refreshMe()
    } else {
      setLoading(false)
    }
  }, [token, refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const fd = new FormData()
    fd.append('username', email)
    fd.append('password', password)
    const { data } = await api.post('/api/auth/login', fd)
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem('rw_token', data.access_token)
    localStorage.setItem('rw_user', JSON.stringify(data.user))
  }, [])

  const register = useCallback(async (payload: { full_name: string; email: string; password: string; phone?: string; role?: string }) => {
    const { data } = await api.post('/api/auth/register', payload)
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem('rw_token', data.access_token)
    localStorage.setItem('rw_user', JSON.stringify(data.user))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('rw_token')
    localStorage.removeItem('rw_user')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refreshMe, token }),
    [user, loading, login, register, logout, refreshMe, token]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
