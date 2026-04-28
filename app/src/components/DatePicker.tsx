import { isToday, isTomorrow } from 'date-fns'
import { Calendar, X } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { DatePickerDrawer, formatDatePickerDisplay } from '@/components/DatePickerDrawer'
import './DatePicker.css'

type Props = {
  selected?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
}

export function DatePicker({ selected, onSelect, placeholder = 'Select date' }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (date: Date) => {
    onSelect(date)
    setIsOpen(false)
  }

  const handleClear = (event: MouseEvent) => {
    event.stopPropagation()
    onSelect(undefined)
  }

  const isHighlighted = selected ? isToday(selected) || isTomorrow(selected) : false

  return (
    <>
      <div className="date-picker">
        <button
          type="button"
          className={`date-picker-trigger${selected ? ' has-value' : ''}${
            isHighlighted ? ' is-highlighted' : ''
          }`}
          onClick={() => setIsOpen(true)}
        >
          <Calendar size={18} aria-hidden="true" />
          <span className="date-picker-trigger-label">
            {selected ? formatDatePickerDisplay(selected) : placeholder}
          </span>
        </button>
        {selected && (
          <button
            type="button"
            className="date-picker-clear"
            onClick={handleClear}
            aria-label="Clear date"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <DatePickerDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        selected={selected}
        onSelect={handleSelect}
      />
    </>
  )
}
