import { describe, it, expect } from 'vitest'
import { makeDb, type SupabaseLike } from './adapter'

type RecordedCall =
  | { kind: 'select'; schema: string; table: string; columns: string }
  | { kind: 'insert'; schema: string; table: string; row: any; columns: string }

function fakeSupabase(handlers: {
  selects?: Record<string, any[]>
  inserts?: Record<string, (row: any) => any>
}): { supabase: SupabaseLike; calls: RecordedCall[] } {
  const calls: RecordedCall[] = []
  const supabase: SupabaseLike = {
    schema: (schema) => ({
      from: (table) => ({
        select: (columns) => {
          calls.push({ kind: 'select', schema, table, columns })
          const key = `${schema}.${table}`
          return Promise.resolve({
            data: handlers.selects?.[key] ?? [],
            error: null,
          })
        },
        insert: (row) => ({
          select: (columns) => ({
            single: () => {
              calls.push({ kind: 'insert', schema, table, row, columns })
              const key = `${schema}.${table}`
              const built = handlers.inserts?.[key]?.(row)
              return Promise.resolve({ data: built, error: null })
            },
          }),
        }),
      }),
    }),
  }
  return { supabase, calls }
}

describe('makeDb.listProjects', () => {
  it('maps assistant.projects rows: slug → folder_context, passes is_default_personal through', async () => {
    const { supabase, calls } = fakeSupabase({
      selects: {
        'assistant.projects': [
          {
            id: 'p1',
            slug: 'tyler-james-os',
            is_default_personal: false,
            created_at: '2026-02-01T00:00:00Z',
          },
          {
            id: 'p2',
            slug: null,
            is_default_personal: true,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
    })

    const db = makeDb(supabase)
    const projects = await db.listProjects()

    expect(projects).toEqual([
      {
        id: 'p1',
        folder_context: 'tyler-james-os',
        is_default_personal: false,
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'p2',
        folder_context: null,
        is_default_personal: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ])
    expect(calls[0]).toMatchObject({ schema: 'assistant', table: 'projects' })
  })
})

describe('makeDb.listTasks', () => {
  it('maps DB status in_progress → domain active, task_name → title, backlog → blocked', async () => {
    const { supabase } = fakeSupabase({
      selects: {
        'assistant.tasks': [
          {
            id: 't1',
            task_name: 'Running thing',
            day: 'today',
            status: 'in_progress',
            time_prefix: '09:00',
            sort_order: 0,
            parent_task_id: null,
            created_at: '2026-05-13T09:00:00Z',
          },
          {
            id: 't2',
            task_name: 'Blocked thing',
            day: 'today',
            status: 'backlog',
            time_prefix: null,
            sort_order: 1,
            parent_task_id: null,
            created_at: '2026-05-13T09:01:00Z',
          },
        ],
      },
    })

    const tasks = await makeDb(supabase).listTasks()

    expect(tasks).toEqual([
      {
        id: 't1',
        title: 'Running thing',
        day: 'today',
        status: 'active',
        time_prefix: '09:00',
        sort_order: 0,
        parent_task_id: null,
        created_at: '2026-05-13T09:00:00Z',
      },
      {
        id: 't2',
        title: 'Blocked thing',
        day: 'today',
        status: 'blocked',
        time_prefix: null,
        sort_order: 1,
        parent_task_id: null,
        created_at: '2026-05-13T09:01:00Z',
      },
    ])
  })

  it('defaults unknown DB status values to pending rather than crashing', async () => {
    const { supabase } = fakeSupabase({
      selects: {
        'assistant.tasks': [
          {
            id: 't1',
            task_name: 'x',
            day: 'today',
            status: 'WEIRD_NEW_STATUS',
            time_prefix: null,
            sort_order: 0,
            parent_task_id: null,
            created_at: '2026-05-13T09:00:00Z',
          },
        ],
      },
    })

    const tasks = await makeDb(supabase).listTasks()
    expect(tasks[0].status).toBe('pending')
  })
})

describe('makeDb.listPlans', () => {
  it('passes plan rows through unchanged', async () => {
    const { supabase } = fakeSupabase({
      selects: {
        'assistant.plans': [
          {
            id: 'plan1',
            title: 'Active trip',
            status: 'active',
            created_at: '2026-05-01T00:00:00Z',
          },
        ],
      },
    })

    const plans = await makeDb(supabase).listPlans()
    expect(plans).toEqual([
      {
        id: 'plan1',
        title: 'Active trip',
        status: 'active',
        created_at: '2026-05-01T00:00:00Z',
      },
    ])
  })
})

describe('makeDb.insertTask', () => {
  it('writes title → task_name and domain status active → DB in_progress, maps response back', async () => {
    let inserted: any = null
    const { supabase } = fakeSupabase({
      inserts: {
        'assistant.tasks': (row) => {
          inserted = row
          return {
            id: 'task_new',
            task_name: row.task_name,
            day: row.day,
            status: row.status,
            time_prefix: row.time_prefix,
            sort_order: row.sort_order,
            parent_task_id: row.parent_task_id,
            created_at: '2026-05-13T10:00:00Z',
          }
        },
      },
    })

    const task = await makeDb(supabase).insertTask({
      title: 'Do the thing',
      day: 'today',
      project_id: 'proj_default',
      status: 'active',
      time_prefix: '14:00',
      sort_order: 2,
      parent_task_id: null,
    })

    expect(inserted).toMatchObject({
      project_id: 'proj_default',
      task_name: 'Do the thing',
      day: 'today',
      status: 'in_progress',
      time_prefix: '14:00',
      sort_order: 2,
      parent_task_id: null,
    })
    expect(task).toEqual({
      id: 'task_new',
      title: 'Do the thing',
      day: 'today',
      status: 'active',
      time_prefix: '14:00',
      sort_order: 2,
      parent_task_id: null,
      created_at: '2026-05-13T10:00:00Z',
    })
  })

  it('maps domain status blocked → DB backlog on insert', async () => {
    let inserted: any = null
    const { supabase } = fakeSupabase({
      inserts: {
        'assistant.tasks': (row) => {
          inserted = row
          return { id: 'x', ...row, created_at: '2026-05-13T10:00:00Z' }
        },
      },
    })

    await makeDb(supabase).insertTask({
      title: 'x',
      day: 'today',
      project_id: null,
      status: 'blocked',
      time_prefix: null,
      sort_order: 0,
      parent_task_id: null,
    })

    expect(inserted.status).toBe('backlog')
  })
})

describe('makeDb error surfacing', () => {
  it('throws when a select returns an error', async () => {
    const supabase: SupabaseLike = {
      schema: () => ({
        from: () => ({
          select: () =>
            Promise.resolve({ data: null, error: { message: 'rls denied' } }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: 'unused' } }),
            }),
          }),
        }),
      }),
    }

    await expect(makeDb(supabase).listProjects()).rejects.toThrow(/rls denied/)
  })
})
