import { Tag as TagIcon } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import './TagsView.css'

export function TagsView() {
  const { tags } = useTaskStore()

  return (
    <div className="tags-view">
      <header className="tags-view-header">
        <div className="tags-view-icon" aria-hidden="true">
          <TagIcon size={32} />
        </div>
        <h3 className="tags-view-title">Tags management</h3>
        <p className="tags-view-subtitle">Organise your tasks with custom tags</p>
      </header>

      {tags.length > 0 ? (
        <div className="tags-view-grid">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="tags-view-card"
              style={{ backgroundColor: `${tag.color}10` }}
            >
              <span className="tags-view-card-name">{tag.name}</span>
              <span
                className="tags-view-card-swatch"
                style={{ backgroundColor: tag.color }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="tags-view-empty">
          No tags yet. Create tasks with voice commands to automatically generate tags.
        </p>
      )}
    </div>
  )
}
