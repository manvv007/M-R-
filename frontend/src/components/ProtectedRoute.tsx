import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../contexts/AuthContext'

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode
  allowedRoles: UserRole[]
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="flex items-center gap-3 text-ink-500">
          <div className="h-6 w-6 rounded-full border-2 border-navy-200 border-t-navy-700 animate-spin" />
          <span className="text-sm font-medium">Loading RoadWatch…</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center">
          <h3 className="text-lg font-bold text-ink-900">Access restricted</h3>
          <p className="mt-2 text-sm text-ink-600">
            This area requires elevated permissions. Please sign in with an authorized account.
          </p>
          <a href="/" className="btn-primary mt-5">Return to home</a>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
