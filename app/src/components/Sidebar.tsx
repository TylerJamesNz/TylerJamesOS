import { Archive, CalendarDays, Clock, LogOut, Mic, Tag as TagIcon } from 'lucide-react'
import { useSession } from '@/context/SessionContext'
import { supabase } from '@/lib/supabase'
import { useTaskStore } from '@/store/useTaskStore'
import type { ViewType } from '@/types'
import './Sidebar.css'

const navigationItems: Array<{ id: ViewType; label: string; Icon: typeof Clock }> = [
  { id: 'today', label: 'Today', Icon: Clock },
  { id: 'upcoming', label: 'Upcoming', Icon: CalendarDays },
  { id: 'tags', label: 'Tags', Icon: TagIcon },
  { id: 'archive', label: 'Archive', Icon: Archive },
]

export function Sidebar() {
  const { user } = useSession()
  const {
    currentView,
    setCurrentView,
    getTodayTasks,
    getOverdueTasks,
    getUpcomingTasks,
    getArchivedTasks,
    setVoiceDrawerOpen,
  } = useTaskStore()

  const todayCount = getTodayTasks().length + getOverdueTasks().length
  const upcomingCount = getUpcomingTasks().length
  const archivedCount = getArchivedTasks().length

  const getItemCount = (id: ViewType): number => {
    switch (id) {
      case 'today':
        return todayCount
      case 'upcoming':
        return upcomingCount
      case 'archive':
        return archivedCount
      default:
        return 0
    }
  }

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const displayName =
    (meta.full_name as string) ?? (meta.name as string) ?? user?.email ?? 'User'
  const avatarUrl = (meta.avatar_url as string) ?? (meta.picture as string) ?? null
  const initial = displayName.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="sidebar-brand-mark" aria-hidden="true">
          <Mic size={20} />
        </div>
        <div>
          <h1 className="sidebar-brand-name">Todos</h1>
          <p className="sidebar-brand-tagline">Voice-driven productivity</p>
        </div>
      </header>

      <nav className="sidebar-nav" aria-label="Sections">
        {navigationItems.map(({ id, label, Icon }) => {
          const count = getItemCount(id)
          const isActive = currentView === id
          return (
            <button
              key={id}
              type="button"
              className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
              onClick={() => setCurrentView(id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="sidebar-nav-label">
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </span>
              {count > 0 && <span className="sidebar-nav-count">{count}</span>}
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-voice-button"
          onClick={() => setVoiceDrawerOpen(true)}
        >
          <Mic size={18} aria-hidden="true" />
          <span>Voice command</span>
        </button>

        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-row">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="sidebar-user-avatar" />
              ) : (
                <div className="sidebar-user-avatar sidebar-user-avatar-fallback">{initial}</div>
              )}
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">{displayName}</p>
                <p className="sidebar-user-email">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-signout-button"
              onClick={handleSignOut}
            >
              <LogOut size={14} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
