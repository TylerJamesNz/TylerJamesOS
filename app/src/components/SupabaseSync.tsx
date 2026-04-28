import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/context/SessionContext'
import {
  deleteTagFromSupabase,
  deleteTaskFromSupabase,
  syncTagToSupabase,
  syncTaskTagsToSupabase,
  syncTaskToSupabase,
} from '@/lib/supabase-sync'
import { useTaskStore } from '@/store/useTaskStore'

export function SupabaseSync() {
  const { user } = useSession()
  const { tasks, tags } = useTaskStore()
  const userId = user?.id

  const prevTasksRef = useRef(tasks)
  const prevTagsRef = useRef(tags)
  const syncedTasksRef = useRef(new Set<string>())
  const syncedTagsRef = useRef(new Set<string>())

  const [syncErrors, setSyncErrors] = useState<string[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())

  useEffect(() => {
    if (!userId) return

    const currentTasks = tasks
    const prevTasks = prevTasksRef.current

    currentTasks.forEach(async (task) => {
      const prevTask = prevTasks.find((t) => t.id === task.id)
      const hasChanged =
        !prevTask ||
        prevTask.title !== task.title ||
        prevTask.completed !== task.completed ||
        prevTask.description !== task.description ||
        JSON.stringify(prevTask.tags) !== JSON.stringify(task.tags) ||
        prevTask.dueDate?.getTime() !== task.dueDate?.getTime()

      if (hasChanged && !syncedTasksRef.current.has(task.id)) {
        syncedTasksRef.current.add(task.id)

        try {
          await syncTaskToSupabase(task, userId)
          if (task.tags.length > 0) {
            await syncTaskTagsToSupabase(task.id, task.tags)
          }
          setLastSyncTime(new Date())
          setSyncErrors((prev) => prev.filter((err) => !err.includes(task.title)))
        } catch (error) {
          console.error('Failed to sync task:', error)
          syncedTasksRef.current.delete(task.id)
          setSyncErrors((prev) => [...prev, `Failed to sync task: ${task.title}`])
        }
      }
    })

    prevTasks.forEach(async (prevTask) => {
      const stillExists = currentTasks.find((t) => t.id === prevTask.id)
      if (!stillExists) {
        try {
          await deleteTaskFromSupabase(prevTask.id)
        } catch (error) {
          console.error('Failed to delete task:', error)
        }
      }
    })

    prevTasksRef.current = currentTasks
  }, [tasks, userId])

  useEffect(() => {
    if (!userId) return

    const currentTags = tags
    const prevTags = prevTagsRef.current

    currentTags.forEach(async (tag) => {
      const prevTag = prevTags.find((t) => t.id === tag.id)
      const hasChanged = !prevTag || prevTag.name !== tag.name || prevTag.color !== tag.color

      if (hasChanged && !syncedTagsRef.current.has(tag.id)) {
        syncedTagsRef.current.add(tag.id)

        try {
          await syncTagToSupabase(tag, userId)
        } catch (error) {
          console.error('Failed to sync tag:', error)
          syncedTagsRef.current.delete(tag.id)
        }
      }
    })

    prevTags.forEach(async (prevTag) => {
      const stillExists = currentTags.find((t) => t.id === prevTag.id)
      if (!stillExists) {
        try {
          await deleteTagFromSupabase(prevTag.id)
        } catch (error) {
          console.error('Failed to delete tag:', error)
        }
      }
    })

    prevTagsRef.current = currentTags
  }, [tags, userId])

  if (!userId) return null
  if (syncErrors.length === 0 && !import.meta.env.DEV) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 12,
      }}
    >
      {syncErrors.length > 0 && (
        <div
          style={{
            background: '#dc2626',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 6,
            maxWidth: 320,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sync errors</div>
          {syncErrors.slice(-2).map((error, index) => (
            <div key={index} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {error}
            </div>
          ))}
          {syncErrors.length > 2 && (
            <div style={{ opacity: 0.8 }}>+{syncErrors.length - 2} more</div>
          )}
          <button
            type="button"
            onClick={() => setSyncErrors([])}
            style={{
              marginTop: 4,
              background: 'transparent',
              color: 'inherit',
              border: 'none',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: 12,
              padding: 0,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {import.meta.env.DEV && syncErrors.length === 0 && (
        <div
          style={{
            background: '#16a34a',
            color: 'white',
            padding: '4px 12px',
            borderRadius: 6,
          }}
        >
          Sync active. Last: {lastSyncTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
