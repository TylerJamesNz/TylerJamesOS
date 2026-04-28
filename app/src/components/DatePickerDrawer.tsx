import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isToday,
  isTomorrow,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Drawer } from '@/components/Drawer'
import './DatePickerDrawer.css'

type Props = {
  isOpen: boolean
  onClose: () => void
  selected?: Date
  onSelect: (date: Date) => void
}

const weekDays = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
]

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function DatePickerDrawer({ isOpen, onClose, selected, onSelect }: Props) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const today = startOfToday()
  const tomorrow = addDays(today, 1)
  const nextWeek = addWeeks(today, 1)

  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(selected ?? today)
    }
  }, [isOpen, selected])

  const handleSelect = (date: Date) => {
    onSelect(date)
    onClose()
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startingDayOfWeek = monthStart.getDay()
  const mondayLeading = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

  return (
    <Drawer open={isOpen} onClose={onClose} title="Select date">
      <div className="date-picker-drawer">
        <div className="date-picker-drawer-quick">
          <button
            type="button"
            className="date-picker-drawer-quick-row"
            onClick={() => handleSelect(today)}
          >
            <span className="date-picker-drawer-quick-mark date-picker-drawer-quick-mark-accent">
              {format(today, 'd')}
            </span>
            <span>Today</span>
          </button>
          <button
            type="button"
            className="date-picker-drawer-quick-row"
            onClick={() => handleSelect(tomorrow)}
          >
            <span className="date-picker-drawer-quick-mark">
              <Sun size={20} aria-hidden="true" />
            </span>
            <span>Tomorrow</span>
          </button>
          <button
            type="button"
            className="date-picker-drawer-quick-row"
            onClick={() => handleSelect(nextWeek)}
          >
            <span className="date-picker-drawer-quick-mark">
              <Calendar size={18} aria-hidden="true" />
              <ArrowRight size={14} aria-hidden="true" />
            </span>
            <span>Next week</span>
          </button>
        </div>

        <div className="date-picker-drawer-calendar">
          <div className="date-picker-drawer-month-header">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => {
                const next = new Date(currentMonth)
                next.setMonth(next.getMonth() - 1)
                setCurrentMonth(next)
              }}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => {
                const next = new Date(currentMonth)
                next.setMonth(next.getMonth() + 1)
                setCurrentMonth(next)
              }}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="date-picker-drawer-week">
            {weekDays.map((day) => (
              <span key={day.key}>{day.label}</span>
            ))}
          </div>

          <div className="date-picker-drawer-grid">
            {Array.from({ length: mondayLeading }).map((_, index) => (
              <span key={`empty-${index}`} className="date-picker-drawer-cell-empty" />
            ))}
            {calendarDays.map((date) => {
              const isPast = isBefore(date, startOfDay(today))
              const todaylike = isToday(date)
              const isSelected =
                selected && format(date, 'yyyy-MM-dd') === format(selected, 'yyyy-MM-dd')

              const classes = [
                'date-picker-drawer-cell',
                isPast ? 'is-past' : '',
                todaylike ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  className={classes}
                  disabled={isPast}
                  onClick={() => handleSelect(date)}
                >
                  {format(date, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export function formatDatePickerDisplay(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'd MMM yyyy')
}
