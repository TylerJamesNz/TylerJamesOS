import { CircleCheck, Plus, Tag as TagIcon } from 'lucide-react'
import { ArchiveView } from '@/components/ArchiveView'
import { CalendarView } from '@/components/CalendarView'
import { MobileNavigation } from '@/components/MobileNavigation'
import { TagsView } from '@/components/TagsView'
import { TaskItem } from '@/components/TaskItem'
import { useTaskStore } from '@/store/useTaskStore'
import './TaskList.css'

const VIEW_TITLES: Record<string, string> = {
  today: 'Today',
  upcoming: 'Upcoming tasks',
  tags: 'Tags',
  archive: 'Archive',
}

export function TaskList() {
  const {
    currentView,
    getTodayTasksWithOverdue,
    getTasksGroupedByTags,
    setManualTaskDrawerOpen,
    setTagDrawerOpen,
  } = useTaskStore()

  const renderContent = () => {
    switch (currentView) {
      case 'today': {
        const todayAndOverdue = getTodayTasksWithOverdue()
        const grouped = getTasksGroupedByTags(todayAndOverdue)
        const groupNames = Object.keys(grouped).sort()

        if (todayAndOverdue.length === 0) {
          return (
            <div className="task-list-empty">
              <CircleCheck size={48} aria-hidden="true" />
              <p className="task-list-empty-title">No tasks for today.</p>
              <p className="task-list-empty-body">
                Use voice commands or the + button to add some tasks.
              </p>
            </div>
          )
        }

        return (
          <div className="task-list-today">
            {groupNames.map((groupName) => (
              <section key={groupName}>
                <h2 className="task-list-group-title">
                  {groupName} ({grouped[groupName].length})
                </h2>
                <div className="task-list-group-items">
                  {grouped[groupName].map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      }

      case 'upcoming':
        return <CalendarView />

      case 'tags':
        return <TagsView />

      case 'archive':
        return <ArchiveView />

      default:
        return null
    }
  }

  const renderContextualAction = () => {
    if (currentView === 'today') {
      return (
        <button
          type="button"
          className="task-list-action"
          onClick={() => setManualTaskDrawerOpen(true)}
        >
          <Plus size={16} aria-hidden="true" />
          <span className="task-list-action-label">Add task</span>
        </button>
      )
    }
    if (currentView === 'tags') {
      return (
        <button
          type="button"
          className="task-list-action"
          onClick={() => setTagDrawerOpen(true)}
        >
          <TagIcon size={16} aria-hidden="true" />
          <span className="task-list-action-label">Manage tags</span>
        </button>
      )
    }
    return null
  }

  return (
    <div className="task-list">
      <header className="task-list-header">
        <h1 className="task-list-title">{VIEW_TITLES[currentView] ?? currentView}</h1>
        {renderContextualAction()}
      </header>

      <div className="task-list-content">{renderContent()}</div>

      <div className="task-list-mobile-nav">
        <MobileNavigation />
      </div>
    </div>
  )
}
