import { checkAuth } from './auth'
import { resolveProject, type Project } from './resolver'
import { renderChart, type Task, type Plan, type TaskStatus } from './renderer'

export type Db = {
  listProjects: () => Promise<Project[]>
  listTasks: () => Promise<Task[]>
  listPlans: () => Promise<Plan[]>
  insertTask: (row: NewTaskRow) => Promise<Task>
}

export type NewTaskRow = {
  title: string
  day: string
  project_id: string | null
  status: TaskStatus
  time_prefix: string | null
  sort_order: number
  parent_task_id: string | null
}

export type Deps = {
  expectedToken: string
  now: () => Date
  db: Db
}

export async function handle(request: Request, deps: Deps): Promise<Response> {
  const auth = checkAuth(request.headers, deps.expectedToken)
  if (!auth.ok) {
    return json({ error: auth.reason }, { status: auth.status })
  }

  const url = new URL(request.url)
  const path = url.pathname.replace(/^.*\/task-service/, '')

  if (request.method === 'POST' && path === '/tasks/add') {
    const body = (await request.json()) as {
      title: string
      day: string
      folder_context?: string | null
      time_prefix?: string | null
      parent_task_id?: string | null
    }
    const projects = await deps.db.listProjects()
    const project_id = resolveProject({ folder_context: body.folder_context ?? null }, projects)

    const row: NewTaskRow = {
      title: body.title,
      day: body.day,
      project_id,
      status: 'pending',
      time_prefix: body.time_prefix ?? null,
      sort_order: 0,
      parent_task_id: body.parent_task_id ?? null,
    }
    const task = await deps.db.insertTask(row)

    const [tasks, plans] = await Promise.all([deps.db.listTasks(), deps.db.listPlans()])
    const rendered = renderChart({ tasks, plans })

    return json({
      mutation_result: { task },
      rendered: {
        chart_markdown: rendered.markdown,
        active_plans: rendered.active_plans,
        counts: rendered.counts,
      },
    })
  }

  return json({ error: 'not_found' }, { status: 404 })
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}
