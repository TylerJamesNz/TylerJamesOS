import { Pencil, Plus, Tag as TagIcon, X } from 'lucide-react'
import { type KeyboardEvent, useRef, useState } from 'react'
import { DatePicker } from '@/components/DatePicker'
import { Drawer } from '@/components/Drawer'
import { EmojiPickerDrawer } from '@/components/EmojiPickerDrawer'
import { useTaskStore } from '@/store/useTaskStore'
import './TaskDrawer.css'

export function TaskDrawer() {
  const {
    isTaskDrawerOpen,
    setTaskDrawerOpen,
    selectedTaskId,
    tasks,
    tags,
    setSelectedTaskId,
    updateTask,
    setTagDrawerOpen,
  } = useTaskStore()

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null

  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [tempDescription, setTempDescription] = useState('')

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)

  const handleClose = () => {
    setTaskDrawerOpen(false)
    setSelectedTaskId(null)
    setEditingTitle(false)
    setEditingDescription(false)
    setShowEmojiPicker(false)
  }

  const startEditingTitle = () => {
    if (!selectedTask) return
    setTempTitle(selectedTask.title)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const startEditingDescription = () => {
    if (!selectedTask) return
    setTempDescription(selectedTask.description ?? '')
    setEditingDescription(true)
    setTimeout(() => descriptionInputRef.current?.focus(), 0)
  }

  const saveTitle = () => {
    if (selectedTask && tempTitle.trim()) {
      updateTask(selectedTask.id, { title: tempTitle.trim() })
    }
    setEditingTitle(false)
  }

  const saveDescription = () => {
    if (selectedTask) {
      updateTask(selectedTask.id, { description: tempDescription.trim() || undefined })
    }
    setEditingDescription(false)
  }

  const handleEmojiSelect = (emoji: string) => {
    if (selectedTask) {
      updateTask(selectedTask.id, { emoji })
    }
  }

  const handleTitleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveTitle()
    } else if (event.key === 'Escape') {
      setEditingTitle(false)
    }
  }

  const handleDescriptionKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && event.metaKey) {
      saveDescription()
    } else if (event.key === 'Escape') {
      setEditingDescription(false)
    }
  }

  const addTagToTask = (tagId: string) => {
    if (selectedTask && !selectedTask.tags.includes(tagId)) {
      updateTask(selectedTask.id, { tags: [...selectedTask.tags, tagId] })
    }
  }

  const removeTagFromTask = (tagId: string) => {
    if (selectedTask) {
      updateTask(selectedTask.id, {
        tags: selectedTask.tags.filter((id) => id !== tagId),
      })
    }
  }

  if (!selectedTask) return null

  const taskTags = selectedTask.tags
    .map((tagId) => tags.find((tag) => tag.id === tagId))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
  const availableTags = tags.filter((tag) => !selectedTask.tags.includes(tag.id))

  return (
    <>
      <Drawer open={isTaskDrawerOpen} onClose={handleClose} title="Task details">
        <div className="task-drawer">
          <div className="task-drawer-title-block">
            {editingTitle ? (
              <div className="task-drawer-title-row">
                <button
                  type="button"
                  className="task-drawer-emoji"
                  onClick={() => setShowEmojiPicker(true)}
                  aria-label="Choose emoji"
                >
                  {selectedTask.emoji || '📝'}
                </button>
                <input
                  ref={titleInputRef}
                  type="text"
                  className="task-drawer-title-input"
                  value={tempTitle}
                  onChange={(event) => setTempTitle(event.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={handleTitleKey}
                />
              </div>
            ) : (
              <div className="task-drawer-title-row">
                <button
                  type="button"
                  className="task-drawer-emoji"
                  onClick={() => setShowEmojiPicker(true)}
                  aria-label="Choose emoji"
                >
                  {selectedTask.emoji || '📝'}
                </button>
                <button
                  type="button"
                  className="task-drawer-title-display"
                  onClick={startEditingTitle}
                >
                  <span>{selectedTask.title}</span>
                  <Pencil size={14} aria-hidden="true" className="task-drawer-edit-hint" />
                </button>
              </div>
            )}
          </div>

          <div className="task-drawer-field">
            <label className="task-drawer-label">Description</label>
            {editingDescription ? (
              <textarea
                ref={descriptionInputRef}
                className="task-drawer-textarea"
                value={tempDescription}
                onChange={(event) => setTempDescription(event.target.value)}
                onBlur={saveDescription}
                onKeyDown={handleDescriptionKey}
                rows={3}
                placeholder="Add a description..."
              />
            ) : (
              <button
                type="button"
                className="task-drawer-description-display"
                onClick={startEditingDescription}
              >
                {selectedTask.description ? (
                  <p>{selectedTask.description}</p>
                ) : (
                  <p className="task-drawer-description-empty">Click to add description...</p>
                )}
                <Pencil size={14} aria-hidden="true" className="task-drawer-edit-hint" />
              </button>
            )}
          </div>

          <div className="task-drawer-field">
            <label className="task-drawer-label">Due date</label>
            <DatePicker
              selected={selectedTask.dueDate}
              onSelect={(date) => updateTask(selectedTask.id, { dueDate: date })}
              placeholder="No due date set"
            />
          </div>

          <div className="task-drawer-field">
            <div className="task-drawer-tags-header">
              <label className="task-drawer-label">Tags</label>
              <button
                type="button"
                className="task-drawer-tags-add"
                onClick={() => setTagDrawerOpen(true)}
              >
                <Plus size={12} aria-hidden="true" />
                <span>Add tag</span>
              </button>
            </div>

            {taskTags.length > 0 ? (
              <div className="task-drawer-tag-chips">
                {taskTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="task-drawer-tag-chip"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    <TagIcon size={12} aria-hidden="true" />
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      className="task-drawer-tag-chip-remove"
                      onClick={() => removeTagFromTask(tag.id)}
                      aria-label={`Remove tag ${tag.name}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="task-drawer-tags-empty">No tags assigned</p>
            )}

            {availableTags.length > 0 && (
              <div className="task-drawer-available-tags">
                <p className="task-drawer-available-tags-label">Available tags:</p>
                <div className="task-drawer-available-tags-row">
                  {availableTags.slice(0, 5).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className="task-drawer-available-tag"
                      onClick={() => addTagToTask(tag.id)}
                      style={{ borderColor: `${tag.color}40` }}
                    >
                      <TagIcon size={12} aria-hidden="true" style={{ color: tag.color }} />
                      <span>{tag.name}</span>
                    </button>
                  ))}
                  {availableTags.length > 5 && (
                    <span className="task-drawer-available-tags-more">
                      +{availableTags.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="task-drawer-status">
            {selectedTask.completed ? 'Completed' : 'Pending'}
            {selectedTask.completedAt && (
              <span> on {selectedTask.completedAt.toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </Drawer>

      <EmojiPickerDrawer
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </>
  )
}
