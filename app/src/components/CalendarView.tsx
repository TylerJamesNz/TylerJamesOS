import { addDays, format, isToday, isTomorrow } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { TaskItem } from '@/components/TaskItem'
import { useTaskStore } from '@/store/useTaskStore'
import './CalendarView.css'

function dateLabel(date: Date): string {
  if (isToday(date)) return `${format(date, 'MMM d')} (Today)`
  if (isTomorrow(date)) return `${format(date, 'MMM d')} (Tomorrow)`
  return format(date, 'MMM d')
}

export function CalendarView() {
  const { getOverdueTasks, getTasksByDate, getUpcomingTasks } = useTaskStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const startDate = addDays(today, weekOffset * 7)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))

  const overdueTasks = getOverdueTasks()
  const upcomingTasks = getUpcomingTasks()

  const datesWithTasks = dates.filter((date) => {
    const tasksForDate = getTasksByDate(date)
    return tasksForDate.length > 0 || isToday(date)
  })

  const goToToday = () => setWeekOffset(0)
  const navigate = (direction: 'prev' | 'next') =>
    setWeekOffset((prev) => (direction === 'next' ? prev + 1 : prev - 1))

  return (
    <div className="calendar-view">
      <div className="calendar-view-desktop">
        <div className="calendar-view-controls">
          <button
            type="button"
            className="calendar-view-nav"
            onClick={() => navigate('prev')}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Previous</span>
          </button>
          <button type="button" className="calendar-view-today" onClick={goToToday}>
            <Calendar size={16} aria-hidden="true" />
            <span>Today</span>
          </button>
          <button
            type="button"
            className="calendar-view-nav"
            onClick={() => navigate('next')}
          >
            <span>Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="calendar-view-columns">
          {overdueTasks.length > 0 && (
            <div className="calendar-view-column calendar-view-column-overdue">
              <h3 className="calendar-view-column-title">
                Overdue ({overdueTasks.length})
              </h3>
              <div className="calendar-view-column-list">
                {overdueTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {datesWithTasks.map((date) => {
            const tasksForDate = getTasksByDate(date)
            const todaylike = isToday(date)
            return (
              <div
                key={date.toISOString()}
                className={`calendar-view-column${todaylike ? ' calendar-view-column-today' : ''}`}
              >
                <h3 className="calendar-view-column-title">{dateLabel(date)}</h3>
                <div className="calendar-view-column-list">
                  {tasksForDate.length > 0 ? (
                    tasksForDate.map((task) => <TaskItem key={task.id} task={task} />)
                  ) : todaylike ? (
                    <div className="calendar-view-column-empty">
                      <CircleCheck size={32} aria-hidden="true" />
                      <p>No tasks today</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="calendar-view-mobile">
        {overdueTasks.length > 0 && (
          <section>
            <h2 className="calendar-view-mobile-title calendar-view-mobile-title-overdue">
              Overdue ({overdueTasks.length})
            </h2>
            <div className="calendar-view-column-list">
              {overdueTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </section>
        )}

        {dates.map((date) => {
          const tasksForDate = getTasksByDate(date)
          if (tasksForDate.length === 0) return null
          return (
            <section key={date.toISOString()}>
              <h2 className="calendar-view-mobile-title">
                {dateLabel(date)} ({tasksForDate.length})
              </h2>
              <div className="calendar-view-column-list">
                {tasksForDate.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </section>
          )
        })}

        {upcomingTasks.length === 0 && overdueTasks.length === 0 && (
          <div className="calendar-view-empty">
            <Calendar size={48} aria-hidden="true" />
            <p className="calendar-view-empty-title">No upcoming tasks.</p>
            <p className="calendar-view-empty-body">All caught up.</p>
          </div>
        )}
      </div>
    </div>
  )
}
