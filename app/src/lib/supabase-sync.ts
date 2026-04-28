import type { Tag, Task } from '@/types'
import { supabase } from './supabase'

export async function syncTaskToSupabase(task: Task, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('tasks').upsert(
      {
        id: task.id,
        user_id: userId,
        title: task.title,
        emoji: task.emoji,
        description: task.description || null,
        due_date: task.dueDate ? task.dueDate.toISOString() : null,
        completed_at: task.completedAt ? task.completedAt.toISOString() : null,
        status: task.completed ? 'completed' : 'active',
        sync_status: 'synced',
        local_id: task.id,
      },
      {
        onConflict: 'id',
      },
    )

    if (error) {
      console.error('Failed to sync task to Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error syncing task:', error)
    return false
  }
}

export async function syncTagToSupabase(tag: Tag, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('tags').upsert(
      {
        id: tag.id,
        user_id: userId,
        name: tag.name,
        color: tag.color,
      },
      {
        onConflict: 'id',
      },
    )

    if (error) {
      console.error('Failed to sync tag to Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error syncing tag:', error)
    return false
  }
}

export async function deleteTaskFromSupabase(taskId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)

    if (error) {
      console.error('Failed to delete task from Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting task:', error)
    return false
  }
}

export async function deleteTagFromSupabase(tagId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('tags').delete().eq('id', tagId)

    if (error) {
      console.error('Failed to delete tag from Supabase:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting tag:', error)
    return false
  }
}

export async function syncTaskTagsToSupabase(taskId: string, tagIds: string[]): Promise<boolean> {
  try {
    await supabase.from('task_tags').delete().eq('task_id', taskId)

    if (tagIds.length > 0) {
      const taskTagRelations = tagIds.map((tagId) => ({
        task_id: taskId,
        tag_id: tagId,
      }))

      const { error } = await supabase.from('task_tags').insert(taskTagRelations)

      if (error) {
        console.error('Failed to sync task-tag relationships:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error syncing task-tag relationships:', error)
    return false
  }
}
