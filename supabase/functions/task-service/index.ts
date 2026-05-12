import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2.105.0'
import { handle, type Db, type NewTaskRow } from './src/handler.ts'
import type { Task, Plan, TaskStatus } from './src/renderer.ts'
import type { Project } from './src/resolver.ts'

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

function makeDb(supabase: SupabaseClient): Db {
  return {
    listProjects: async () => {
      const { data, error } = await supabase
        .schema('assistant')
        .from('projects')
        .select('id, is_default_personal, created_at')
      if (error) throw new Error(`listProjects: ${error.message}`)
      return (data ?? []).map(
        (row): Project => ({
          id: row.id,
          folder_context: null,
          is_default_personal: !!row.is_default_personal,
          created_at: row.created_at,
        }),
      )
    },
    listTasks: async () => {
      const { data, error } = await supabase
        .schema('assistant')
        .from('tasks')
        .select(
          'id, task_name, day, status, time_prefix, sort_order, parent_task_id, created_at',
        )
      if (error) throw new Error(`listTasks: ${error.message}`)
      return (data ?? []).map(
        (row): Task => ({
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
      const { data, error } = await supabase
        .schema('assistant')
        .from('plans')
        .select('id, title, status, created_at')
      if (error) throw new Error(`listPlans: ${error.message}`)
      return (data ?? []) as Plan[]
    },
    insertTask: async (row: NewTaskRow) => {
      const { data, error } = await supabase
        .schema('assistant')
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

Deno.serve(async (req) => {
  const expectedToken = Deno.env.get('CLAUDE_API_KEY')
  const supabaseUrl = Deno.env.get('LAA_SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('LAA_SUPABASE_SERVICE_ROLE_KEY')
  if (!expectedToken || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        error:
          'missing env: CLAUDE_API_KEY, LAA_SUPABASE_URL, LAA_SUPABASE_SERVICE_ROLE_KEY',
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const db = makeDb(supabase)

  return handle(req, {
    expectedToken,
    now: () => new Date(),
    db,
  })
})
