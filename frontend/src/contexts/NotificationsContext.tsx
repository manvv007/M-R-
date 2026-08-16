import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

export interface AppNotification {
  id: number
  user_id: number
  title: string
  body?: string | null
  type?: string | null
  incident_id?: number | null
  report_id?: number | null
  is_read: boolean
  created_at: string
}

interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  const token = localStorage.getItem('rw_token')

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const { data } = await api.get('/api/notifications?limit=50')
      setNotifications(data.items || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) refresh()
    const interval = setInterval(() => {
      if (token) refresh()
    }, 60_000)
    return () => clearInterval(interval)
  }, [token, refresh])

  const markRead = useCallback(async (id: number) => {
    try {
      await api.post(`/api/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    } catch {/* ignore */}
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/api/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {/* ignore */}
  }, [])

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((n) => !n.is_read).length,
    loading,
    refresh,
    markRead,
    markAllRead,
  }), [notifications, loading, refresh, markRead, markAllRead])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
