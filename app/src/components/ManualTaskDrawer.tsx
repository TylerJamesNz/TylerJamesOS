import { ArrowRight, Tag as TagIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DatePicker } from '@/components/DatePicker'
import { Drawer } from '@/components/Drawer'
import { EmojiPickerDrawer } from '@/components/EmojiPickerDrawer'
import { TagSelectionDrawer } from '@/components/TagSelectionDrawer'
import { useTaskStore } from '@/store/useTaskStore'
import type { TaskFormData } from '@/types'
import './ManualTaskDrawer.css'

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const initialFormData = (): TaskFormData => ({
  title: '',
  emoji: '📝',
  description: '',
  dueDate: startOfToday(),
  tags: [],
})

export function ManualTaskDrawer() {
  const { isManualTaskDrawerOpen, setManualTaskDrawerOpen, addTask, tags } = useTaskStore()
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [isTagSelectionOpen, setTagSelectionOpen] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>(initialFormData)

  useEffect(() => {
    if (isManualTaskDrawerOpen) {
      setFormData(initialFormData())
    }
  }, [isManualTaskDrawerOpen])

  const handleClose = () => {
    setManualTaskDrawerOpen(false)
    setEmojiPickerOpen(false)
    setTagSelectionOpen(false)
    setFormData(initialFormData())
  }

  const handleSubmit = () => {
    if (!formData.title.trim()) return

    addTask({
      title: formData.title.trim(),
      emoji: formData.emoji,
      description: formData.description.trim() || undefined,
      dueDate: formData.dueDate,
      tags: formData.tags,
      completed: false,
      syncStatus: 'local',
    })

    handleClose()
  }

  return (
    <>
      <Drawer
        open={isManualTaskDrawerOpen}
        onClose={handleClose}
        title="Create new task"
      >
        <div className="manual-task-drawer">
          <div className="manual-task-drawer-field">
            <label className="manual-task-drawer-label">Task title</label>
            <div className="manual-task-drawer-title-row">
              <button
                type="button"
                className="manual-task-drawer-emoji"
                onClick={() => setEmojiPickerOpen(true)}
                aria-label="Choose emoji"
              >
                {formData.emoji}
              </button>
              <input
                type="text"
                className="manual-task-drawer-input"
                value={formData.title}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Enter task title..."
              />
            </div>
          </div>

          <div className="manual-task-drawer-field">
            <label className="manual-task-drawer-label">Due date</label>
            <DatePicker
              selected={formData.dueDate}
              onSelect={(date) => setFormData((prev) => ({ ...prev, dueDate: date }))}
              placeholder="Select due date"
            />
          </div>

          <div className="manual-task-drawer-field">
            <label className="manual-task-drawer-label">Tags</label>
            <button
              type="button"
              className="manual-task-drawer-tag-trigger"
              onClick={() => setTagSelectionOpen(true)}
            >
              <TagIcon size={18} aria-hidden="true" />
              <div className="manual-task-drawer-tag-trigger-content">
                {formData.tags.length > 0 ? (
                  <div className="manual-task-drawer-tag-chips">
                    {formData.tags.slice(0, 3).map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId)
                      if (!tag) return null
                      return (
                        <span
                          key={tag.id}
                          className="manual-task-drawer-tag-chip"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          <TagIcon size={12} aria-hidden="true" />
                          {tag.name}
                        </span>
                      )
                    })}
                    {formData.tags.length > 3 && (
                      <span className="manual-task-drawer-tag-chip-more">
                        +{formData.tags.length - 3} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="manual-task-drawer-tag-placeholder">Select tags...</span>
                )}
              </div>
            </button>
          </div>

          <div className="manual-task-drawer-field">
            <label className="manual-task-drawer-label">Description (optional)</label>
            <textarea
              className="manual-task-drawer-textarea"
              value={formData.description}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Add more details..."
              rows={3}
            />
          </div>

          <button
            type="button"
            className="manual-task-drawer-submit"
            onClick={handleSubmit}
            disabled={!formData.title.trim()}
          >
            <span>Submit</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </Drawer>

      <EmojiPickerDrawer
        isOpen={isEmojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelect={(emoji) => setFormData((prev) => ({ ...prev, emoji }))}
      />

      <TagSelectionDrawer
        isOpen={isTagSelectionOpen}
        onClose={() => setTagSelectionOpen(false)}
        availableTags={tags}
        selectedTags={formData.tags}
        onTagsChange={(tagIds) => setFormData((prev) => ({ ...prev, tags: tagIds }))}
      />
    </>
  )
}
