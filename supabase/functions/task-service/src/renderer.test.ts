import { describe, it, expect } from 'vitest'
import { renderChart, type Task } from './renderer'

let nextTaskId = 0
function task(overrides: Partial<Task> = {}): Task {
  return {
    id: `t${++nextTaskId}`,
    title: 'Untitled',
    day: '2026-05-12',
    status: 'pending',
    time_prefix: null,
    sort_order: 0,
    parent_task_id: null,
    created_at: '2026-05-12T00:00:00Z',
    ...overrides,
  }
}

describe('renderChart', () => {
  it('empty input returns empty-state markdown, no active plans, zero counts', () => {
    const result = renderChart({ tasks: [], plans: [] })

    expect(result.markdown).toBe('_No tasks._')
    expect(result.active_plans).toEqual([])
    expect(result.counts).toEqual({
      pending: 0,
      active: 0,
      done: 0,
      cancelled: 0,
      blocked: 0,
    })
  })

  it('single task renders a day section with status icon and title', () => {
    const result = renderChart({
      tasks: [task({ title: 'Pick up parcel', day: '2026-05-12', status: 'pending' })],
      plans: [],
    })

    expect(result.markdown).toContain('## 2026-05-12')
    expect(result.markdown).toContain('Pick up parcel')
    expect(result.counts.pending).toBe(1)
  })

  it('multi-day chart renders separate day headings in date order', () => {
    const result = renderChart({
      tasks: [
        task({ title: 'Later task', day: '2026-05-14' }),
        task({ title: 'Earlier task', day: '2026-05-12' }),
        task({ title: 'Middle task', day: '2026-05-13' }),
      ],
      plans: [],
    })

    const md = result.markdown
    const i12 = md.indexOf('## 2026-05-12')
    const i13 = md.indexOf('## 2026-05-13')
    const i14 = md.indexOf('## 2026-05-14')
    expect(i12).toBeGreaterThanOrEqual(0)
    expect(i13).toBeGreaterThan(i12)
    expect(i14).toBeGreaterThan(i13)
    expect(md).toContain('Earlier task')
    expect(md).toContain('Middle task')
    expect(md).toContain('Later task')
  })

  it('renders distinct markers for each status', () => {
    const result = renderChart({
      tasks: [
        task({ title: 'P', status: 'pending', sort_order: 1 }),
        task({ title: 'A', status: 'active', sort_order: 2 }),
        task({ title: 'D', status: 'done', sort_order: 3 }),
        task({ title: 'C', status: 'cancelled', sort_order: 4 }),
        task({ title: 'B', status: 'blocked', sort_order: 5 }),
      ],
      plans: [],
    })

    const markers = ['P', 'A', 'D', 'C', 'B'].map((t) => {
      const line = result.markdown.split('\n').find((l) => l.endsWith(` ${t}`)) ?? ''
      return line.replace(` ${t}`, '').replace(/^- /, '')
    })
    expect(new Set(markers).size).toBe(5)
    expect(result.counts).toEqual({
      pending: 1,
      active: 1,
      done: 1,
      cancelled: 1,
      blocked: 1,
    })
  })

  it('within a day, orders by sort_order asc, with created_at as tiebreaker', () => {
    const day = '2026-05-12'
    const result = renderChart({
      tasks: [
        task({ title: 'C', day, sort_order: 20, created_at: '2026-05-12T01:00:00Z' }),
        task({ title: 'A', day, sort_order: 10, created_at: '2026-05-12T02:00:00Z' }),
        task({ title: 'B', day, sort_order: 10, created_at: '2026-05-12T01:00:00Z' }),
      ],
      plans: [],
    })

    const titlesInOrder = result.markdown
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(-1))

    expect(titlesInOrder).toEqual(['B', 'A', 'C'])
  })

  it('renders time_prefix before the title when present, omits when null', () => {
    const result = renderChart({
      tasks: [
        task({ title: 'Meet Sam', time_prefix: '9am', sort_order: 1 }),
        task({ title: 'Email triage', time_prefix: null, sort_order: 2 }),
      ],
      plans: [],
    })

    expect(result.markdown).toMatch(/9am\s+Meet Sam/)
    const triageLine = result.markdown.split('\n').find((l) => l.includes('Email triage'))!
    expect(triageLine).not.toMatch(/null/)
  })

  it('renders sub-tasks indented under their parent', () => {
    const parent = task({ id: 'p1', title: 'Pack for trip', sort_order: 10 })
    const child = task({
      id: 'c1',
      title: 'Charge headphones',
      parent_task_id: 'p1',
      sort_order: 20,
    })

    const result = renderChart({ tasks: [child, parent], plans: [] })

    const lines = result.markdown.split('\n')
    const parentLine = lines.findIndex((l) => l.includes('Pack for trip'))
    const childLine = lines.findIndex((l) => l.includes('Charge headphones'))
    expect(parentLine).toBeGreaterThanOrEqual(0)
    expect(childLine).toBeGreaterThan(parentLine)
    expect(lines[childLine]).toMatch(/^\s+- /)
  })

  it('active_plans output includes only plans with status active', () => {
    const plans = [
      { id: 'p1', title: 'QLD trip', status: 'active', created_at: '2026-05-01T00:00:00Z' },
      { id: 'p2', title: 'Old plan', status: 'expired', created_at: '2026-04-01T00:00:00Z' },
      { id: 'p3', title: 'Draft', status: 'pending', created_at: '2026-05-02T00:00:00Z' },
    ]
    const result = renderChart({ tasks: [], plans })

    expect(result.active_plans).toEqual([plans[0]])
  })
})
