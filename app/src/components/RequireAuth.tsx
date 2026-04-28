import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/context/SessionContext'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useSession()

  if (loading) return null
  if (!user) return <Navigate to="/signin" replace />

  return <>{children}</>
}
