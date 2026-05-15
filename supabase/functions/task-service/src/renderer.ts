export type TaskStatus =
  | 'pending'
  | 'active'
  | 'done'
  | 'cancelled'
  | 'blocked'

export type Task = {
  id: string
  title: string
  day: string
  status: TaskStatus
  time_prefix: string | null
  sort_order: number
  parent_task_id: string | null
  created_at: string
}

export type Plan = {
  id: string
  title: string
  status: string
  created_at: string
}

export type RenderInput = {
  tasks: Task[]
  plans: Plan[]
}

export type RenderOutput = {
  markdown: string
  active_plans: Plan[]
  counts: Record<TaskStatus, number>
}

const STATUS_ICON: Record<TaskStatus, string> = {
  pending: '[ ]',
  active: '[~]',
  done: '[x]',
  cancelled: '[-]',
  blocked: '[!]',
}

function zeroCounts(): Record<TaskStatus, number> {
  return { pending: 0, active: 0, done: 0, cancelled: 0, blocked: 0 }
}

export function renderChart(input: RenderInput): RenderOutput {
  const { tasks, plans } = input
  const counts = zeroCounts()
  for (const t of tasks) counts[t.status]++

  const active_plans = plans.filter((p) => p.status === 'active')

  if (tasks.length === 0) {
    return { markdown: '_No tasks._', active_plans, counts }
  }

  const byDay = new Map<string, Task[]>()
  for (const t of tasks) {
    const list = byDay.get(t.day) ?? []
    list.push(t)
    byDay.set(t.day, list)
  }

  const days = [...byDay.keys()].sort()
  const sections = days.map((day) => {
    const dayTasks = byDay.get(day)!
    const childrenOf = new Map<string | null, Task[]>()
    for (const t of dayTasks) {
      const key = t.parent_task_id
      const list = childrenOf.get(key) ?? []
      list.push(t)
      childrenOf.set(key, list)
    }
    const sortGroup = (group: Task[]) =>
      [...group].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return a.created_at.localeCompare(b.created_at)
      })

    const lines: string[] = []
    const emit = (t: Task, depth: number) => {
      const prefix = t.time_prefix ? `${t.time_prefix} ` : ''
      const indent = '  '.repeat(depth)
      lines.push(`${indent}- ${STATUS_ICON[t.status]} ${prefix}${t.title}`)
      const kids = sortGroup(childrenOf.get(t.id) ?? [])
      for (const k of kids) emit(k, depth + 1)
    }
    for (const root of sortGroup(childrenOf.get(null) ?? [])) emit(root, 0)

    return [`## ${day}`, ...lines].join('\n')
  })

  return {
    markdown: sections.join('\n\n'),
    active_plans,
    counts,
  }
}
