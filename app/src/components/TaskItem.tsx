import { format, isPast, isToday, isYesterday } from 'date-fns'
import { Calendar, Check, Tag as TagIcon } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import type { Task } from '@/types'
import './TaskItem.css'

type Props = {
  task: Task
}

type DueDateState = 'overdue' | 'today' | 'future' | 'none'

function dueDateState(date: Date | undefined): DueDateState {
  if (!date) return 'none'
  if (isToday(date)) return 'today'
  if (isPast(date)) return 'overdue'
  return 'future'
}

function formatDueDate(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
}

export function TaskItem({ task }: Props) {
  const { completeTask, uncompleteTask, setSelectedTaskId, setTaskDrawerOpen, tags } =
    useTaskStore()

  const handleToggleComplete = (event: MouseEvent) => {
    event.stopPropagation()
    if (task.completed) {
      uncompleteTask(task.id)
    } else {
      completeTask(task.id)
    }
  }

  const handleTaskClick = () => {
    setSelectedTaskId(task.id)
    setTaskDrawerOpen(true)
  }

  const dueState = dueDateState(task.dueDate)
  const taskTags = task.tags
    .map((tagId) => tags.find((tag) => tag.id === tagId))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))

  return (
    <div
      className={`task-item${task.completed ? ' is-completed' : ''}`}
      onClick={handleTaskClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleTaskClick()
        }
      }}
    >
      <button
        type="button"
        className={`task-item-checkbox${task.completed ? ' is-checked' : ''}`}
        onClick={handleToggleComplete}
        aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
      >
        {task.completed && <Check size={12} aria-hidden="true" />}
      </button>

      <div className="task-item-content">
        <div className="task-item-title">
          {task.emoji && <span className="task-item-emoji">{task.emoji}</span>}
          {task.title}
        </div>

        {task.description && <p className="task-item-description">{task.description}</p>}

        {(task.dueDate || taskTags.length > 0) && (
          <div className="task-item-meta">
            {task.dueDate && (
              <div className={`task-item-due task-item-due-${dueState}`}>
                <Calendar size={12} aria-hidden="true" />
                <span>{formatDueDate(task.dueDate)}</span>
              </div>
            )}

            {taskTags.length > 0 && (
              <div className="task-item-tags">
                {taskTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="task-item-tag"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    <TagIcon size={12} aria-hidden="true" />
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
