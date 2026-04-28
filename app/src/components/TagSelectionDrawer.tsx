import { Check, Search, Tag as TagIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Drawer } from '@/components/Drawer'
import type { Tag } from '@/types'
import './TagSelectionDrawer.css'

type Props = {
  isOpen: boolean
  onClose: () => void
  availableTags: Tag[]
  selectedTags: string[]
  onTagsChange: (tagIds: string[]) => void
}

export function TagSelectionDrawer({
  isOpen,
  onClose,
  availableTags,
  selectedTags,
  onTagsChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [localSelected, setLocalSelected] = useState<string[]>(selectedTags)

  useEffect(() => {
    if (isOpen) {
      setLocalSelected(selectedTags)
      setSearchQuery('')
    }
  }, [isOpen, selectedTags])

  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const toggleTag = (tagId: string) => {
    setLocalSelected((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    )
  }

  const handleDone = () => {
    onTagsChange(localSelected)
    onClose()
  }

  return (
    <Drawer open={isOpen} onClose={onClose} title="Select tags">
      <div className="tag-selection-drawer">
        <div className="tag-selection-drawer-actions">
          <button type="button" className="tag-selection-drawer-done" onClick={handleDone}>
            Done
          </button>
        </div>

        <div className="tag-selection-drawer-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search tags..."
            aria-label="Search tags"
          />
        </div>

        <div className="tag-selection-drawer-list">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => {
              const isSelected = localSelected.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  className="tag-selection-drawer-row"
                  onClick={() => toggleTag(tag.id)}
                >
                  <span
                    className={`tag-selection-drawer-checkbox${
                      isSelected ? ' is-checked' : ''
                    }`}
                  >
                    {isSelected && <Check size={12} aria-hidden="true" />}
                  </span>
                  <span className="tag-selection-drawer-tag">
                    <TagIcon size={14} aria-hidden="true" style={{ color: tag.color }} />
                    <span>{tag.name}</span>
                  </span>
                  <span
                    className="tag-selection-drawer-swatch"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden="true"
                  />
                </button>
              )
            })
          ) : (
            <div className="tag-selection-drawer-empty">
              <TagIcon size={32} aria-hidden="true" />
              <p>{searchQuery ? 'No tags found' : 'No tags available'}</p>
              {searchQuery && <p className="tag-selection-drawer-empty-hint">Try a different search.</p>}
            </div>
          )}
        </div>

        {localSelected.length > 0 && (
          <div className="tag-selection-drawer-preview">
            <p>Selected ({localSelected.length})</p>
            <div className="tag-selection-drawer-preview-chips">
              {localSelected.slice(0, 5).map((tagId) => {
                const tag = availableTags.find((t) => t.id === tagId)
                if (!tag) return null
                return (
                  <span
                    key={tag.id}
                    className="tag-selection-drawer-chip"
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
              {localSelected.length > 5 && (
                <span className="tag-selection-drawer-chip-more">
                  +{localSelected.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}
