import { Plus, Tag as TagIcon, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Drawer } from '@/components/Drawer'
import { useTaskStore } from '@/store/useTaskStore'
import './TagManagementDrawer.css'

export function TagManagementDrawer() {
  const { isTagDrawerOpen, setTagDrawerOpen, tags, addTag, deleteTag, getTagUsageCount } =
    useTaskStore()

  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleClose = () => {
    setTagDrawerOpen(false)
    setIsCreating(false)
    setNewTagName('')
  }

  const handleCreateTag = () => {
    if (!newTagName.trim()) return
    addTag(newTagName.trim())
    setNewTagName('')
    setIsCreating(false)
  }

  const handleDeleteTag = (tagId: string) => {
    const usageCount = getTagUsageCount(tagId)
    if (usageCount > 0) {
      const confirmed = window.confirm(
        `This tag is used by ${usageCount} task(s). Are you sure you want to delete it?`,
      )
      if (!confirmed) return
    }
    deleteTag(tagId)
  }

  return (
    <Drawer open={isTagDrawerOpen} onClose={handleClose} title="Manage tags">
      <div className="tag-mgmt-drawer">
        <div className="tag-mgmt-drawer-create">
          {isCreating ? (
            <div className="tag-mgmt-drawer-create-form">
              <input
                type="text"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="Enter tag name..."
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCreateTag()
                  if (event.key === 'Escape') setIsCreating(false)
                }}
              />
              <div className="tag-mgmt-drawer-create-actions">
                <button
                  type="button"
                  className="tag-mgmt-drawer-create-confirm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                >
                  Create tag
                </button>
                <button
                  type="button"
                  className="tag-mgmt-drawer-create-cancel"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="tag-mgmt-drawer-create-trigger"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={18} aria-hidden="true" />
              <span>Create new tag</span>
            </button>
          )}
        </div>

        <div className="tag-mgmt-drawer-list">
          <h3 className="tag-mgmt-drawer-list-heading">Existing tags ({tags.length})</h3>
          {tags.length > 0 ? (
            <div className="tag-mgmt-drawer-list-items">
              {tags.map((tag) => {
                const usageCount = getTagUsageCount(tag.id)
                return (
                  <div key={tag.id} className="tag-mgmt-drawer-row">
                    <span
                      className="tag-mgmt-drawer-row-swatch"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    <div className="tag-mgmt-drawer-row-info">
                      <span className="tag-mgmt-drawer-row-name">{tag.name}</span>
                      <span className="tag-mgmt-drawer-row-usage">
                        {usageCount} task{usageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="tag-mgmt-drawer-row-delete"
                      onClick={() => handleDeleteTag(tag.id)}
                      aria-label={`Delete tag ${tag.name}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="tag-mgmt-drawer-empty">
              <TagIcon size={32} aria-hidden="true" />
              <p>No tags created yet.</p>
              <p className="tag-mgmt-drawer-empty-hint">Create your first tag above.</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}
