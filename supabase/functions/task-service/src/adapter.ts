import type { Db, NewTaskRow } from './handler.ts'
import type { Project } from './resolver.ts'
import type { Task, Plan, TaskStatus } from './renderer.ts'

export type SupabaseLike = {
  schema: (schema: string) => {
    from: (table: string) => {
      select: (columns: string) => Promise<{ data: any; error: { message: string } | null }>
      insert: (row: any) => {
        select: (columns: string) => {
          single: () => Promise<{ data: any; error: { message: string } | null }>
        }
      }
    }
  }
}

const STATUS_FROM_DB: Record<string, TaskStatus> = {
  pending: 'pending',
  in_progress: 'active',
  done: 'done',
  cancelled: 'cancelled',
  backlog: 'blocked',
}

const STATUS_TO_DB: Record<TaskStatus, string> = {
  pending: 'pending',
  active: 'in_progress',
  done: 'done',
  cancelled: 'cancelled',
  blocked: 'backlog',
}

export function makeDb(supabase: SupabaseLike): Db {
  const assistant = supabase.schema('assistant')

  return {
    listProjects: async () => {
      const { data, error } = await assistant
        .from('projects')
        .select('id, slug, is_default_personal, created_at')
      if (error) throw new Error(`listProjects: ${error.message}`)
      return (data ?? []).map(
        (row: any): Project => ({
          id: row.id,
          folder_context: row.slug ?? null,
          is_default_personal: !!row.is_default_personal,
          created_at: row.created_at,
        }),
      )
    },

    listTasks: async () => {
      const { data, error } = await assistant
        .from('tasks')
        .select(
          'id, task_name, day, status, time_prefix, sort_order, parent_task_id, created_at',
        )
      if (error) throw new Error(`listTasks: ${error.message}`)
      return (data ?? []).map(
        (row: any): Task => ({
          id: row.id,
          title: row.task_name,
          day: row.day,
          status: STATUS_FROM_DB[row.status] ?? 'pending',
          time_prefix: row.time_prefix,
          sort_order: row.sort_order,
          parent_task_id: row.parent_task_id,
          created_at: row.created_at,
        }),
      )
    },

    listPlans: async () => {
      const { data, error } = await assistant
        .from('plans')
        .select('id, title, status, created_at')
      if (error) throw new Error(`listPlans: ${error.message}`)
      return (data ?? []) as Plan[]
    },

    insertTask: async (row: NewTaskRow) => {
      const { data, error } = await assistant
        .from('tasks')
        .insert({
          project_id: row.project_id,
          task_name: row.title,
          day: row.day,
          status: STATUS_TO_DB[row.status],
          time_prefix: row.time_prefix,
          sort_order: row.sort_order,
          parent_task_id: row.parent_task_id,
        })
        .select(
          'id, task_name, day, status, time_prefix, sort_order, parent_task_id, created_at',
        )
        .single()
      if (error) throw new Error(`insertTask: ${error.message}`)
      return {
        id: data.id,
        title: data.task_name,
        day: data.day,
        status: STATUS_FROM_DB[data.status] ?? 'pending',
        time_prefix: data.time_prefix,
        sort_order: data.sort_order,
        parent_task_id: data.parent_task_id,
        created_at: data.created_at,
      }
    },
  }
}
