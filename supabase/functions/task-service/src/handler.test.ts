import { describe, it, expect } from 'vitest'
import { handle, type Deps } from './handler'

type DbCalls = {
  inserted: any[]
}

function makeDeps(overrides: Partial<Deps> = {}): { deps: Deps; calls: DbCalls } {
  const calls: DbCalls = { inserted: [] }
  const deps: Deps = {
    expectedToken: 's3cret',
    now: () => new Date('2026-05-13T10:00:00Z'),
    db: {
      listProjects: async () => [
        {
          id: 'proj_default',
          folder_context: null,
          is_default_personal: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      listTasks: async () => [],
      listPlans: async () => [],
      insertTask: async (row) => {
        calls.inserted.push(row)
        return {
          id: 'task_new',
          status: 'pending',
          time_prefix: null,
          sort_order: 0,
          parent_task_id: null,
          created_at: '2026-05-13T10:00:00Z',
          ...row,
        }
      },
    },
    ...overrides,
  }
  return { deps, calls }
}

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`https://x.functions.supabase.co/task-service${path}`, init)
}

describe('handle unknown route', () => {
  it('returns 404 for an unknown path', async () => {
    const { deps } = makeDeps()

    const response = await handle(
      request('/tasks/unknown', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer s3cret',
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      deps,
    )

    expect(response.status).toBe(404)
  })
})

describe('handle POST /tasks/add', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const { deps } = makeDeps()

    const response = await handle(
      request('/tasks/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x', day: '2026-05-13' }),
      }),
      deps,
    )

    expect(response.status).toBe(401)
  })

  it('returns 401 when bearer token does not match', async () => {
    const { deps } = makeDeps()

    const response = await handle(
      request('/tasks/add', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer wrong',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'x', day: '2026-05-13' }),
      }),
      deps,
    )

    expect(response.status).toBe(401)
  })

  it('inserts the task with project_id resolved from folder_context', async () => {
    const inserted: any[] = []
    const deps: Deps = {
      expectedToken: 's3cret',
      now: () => new Date('2026-05-13T10:00:00Z'),
      db: {
        listProjects: async () => [
          {
            id: 'proj_default',
            folder_context: null,
            is_default_personal: true,
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'proj_tjos',
            folder_context: '/Users/x/TylerJamesOS',
            is_default_personal: false,
            created_at: '2026-02-01T00:00:00Z',
          },
        ],
        listTasks: async () => [],
        listPlans: async () => [],
        insertTask: async (row) => {
          inserted.push(row)
          return {
            id: 'task_new',
            created_at: '2026-05-13T10:00:00Z',
            ...row,
          }
        },
      },
    }

    await handle(
      request('/tasks/add', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer s3cret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Scoped',
          day: '2026-05-13',
          folder_context: '/Users/x/TylerJamesOS',
        }),
      }),
      deps,
    )

    expect(inserted).toHaveLength(1)
    expect(inserted[0].project_id).toBe('proj_tjos')
  })

  it('renders the chart with the just-inserted task visible', async () => {
    const store: any[] = []
    const deps: Deps = {
      expectedToken: 's3cret',
      now: () => new Date('2026-05-13T10:00:00Z'),
      db: {
        listProjects: async () => [
          {
            id: 'proj_default',
            folder_context: null,
            is_default_personal: true,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        listTasks: async () => store,
        listPlans: async () => [],
        insertTask: async (row) => {
          const task = {
            id: 'task_new',
            created_at: '2026-05-13T10:00:00Z',
            ...row,
          }
          store.push(task)
          return task
        },
      },
    }

    const response = await handle(
      request('/tasks/add', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer s3cret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Visible in chart', day: '2026-05-13' }),
      }),
      deps,
    )

    const body = await response.json()
    expect(body.rendered.chart_markdown).toContain('Visible in chart')
    expect(body.rendered.counts.pending).toBe(1)
  })

  it('returns 200 with mutation_result + rendered shape on valid add', async () => {
    const { deps } = makeDeps()

    const response = await handle(
      request('/tasks/add', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer s3cret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Write a thing', day: '2026-05-13' }),
      }),
      deps,
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.mutation_result.task.title).toBe('Write a thing')
    expect(body.mutation_result.task.day).toBe('2026-05-13')
    expect(body.rendered).toHaveProperty('chart_markdown')
    expect(body.rendered).toHaveProperty('active_plans')
    expect(body.rendered).toHaveProperty('counts')
  })
})
