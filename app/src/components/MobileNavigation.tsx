import { Archive, CalendarDays, Clock, Tag as TagIcon } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import type { ViewType } from '@/types'
import './MobileNavigation.css'

const navigationItems: Array<{ id: ViewType; label: string; Icon: typeof Clock }> = [
  { id: 'today', label: 'Today', Icon: Clock },
  { id: 'upcoming', label: 'Upcoming', Icon: CalendarDays },
  { id: 'tags', label: 'Tags', Icon: TagIcon },
  { id: 'archive', label: 'Archive', Icon: Archive },
]

export function MobileNavigation() {
  const { currentView, setCurrentView } = useTaskStore()

  return (
    <nav className="mobile-nav">
      {navigationItems.map(({ id, label, Icon }) => {
        const isActive = currentView === id
        return (
          <button
            key={id}
            type="button"
            className={`mobile-nav-item${isActive ? ' is-active' : ''}`}
            onClick={() => setCurrentView(id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} aria-hidden="true" />
            <span className="mobile-nav-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
