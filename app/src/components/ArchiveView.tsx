import { TaskItem } from '@/components/TaskItem'
import { useTaskStore } from '@/store/useTaskStore'
import './ArchiveView.css'

export function ArchiveView() {
  const { getArchivedTasks } = useTaskStore()
  const archivedTasks = getArchivedTasks()

  return (
    <div className="archive-view">
      <header className="archive-view-header">
        <h2 className="archive-view-title">Completed tasks ({archivedTasks.length})</h2>
        <p className="archive-view-subtitle">Your accomplished tasks</p>
      </header>

      {archivedTasks.length > 0 ? (
        <div className="archive-view-list">
          {archivedTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="archive-view-empty">
          <div className="archive-view-empty-mark" aria-hidden="true">
            📦
          </div>
          <p className="archive-view-empty-title">No completed tasks yet.</p>
          <p className="archive-view-empty-body">Complete some tasks to see them here.</p>
        </div>
      )}
    </div>
  )
}
