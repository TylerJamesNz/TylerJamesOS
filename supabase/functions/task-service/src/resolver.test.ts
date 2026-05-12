import { describe, it, expect } from 'vitest'
import { resolveProject, type Project } from './resolver'

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj_default',
    folder_context: null,
    is_default_personal: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('resolveProject', () => {
  it('returns the project_id of the row matching folder_context', () => {
    const projects = [
      project({ id: 'proj_a', folder_context: '/Users/x/projects/a' }),
      project({ id: 'proj_b', folder_context: '/Users/x/projects/b' }),
    ]

    const result = resolveProject(
      { folder_context: '/Users/x/projects/b' },
      projects,
    )

    expect(result).toBe('proj_b')
  })

  it('returns the default-personal project when folder_context is absent', () => {
    const projects = [
      project({ id: 'proj_a', folder_context: '/Users/x/projects/a' }),
      project({ id: 'proj_default', is_default_personal: true }),
    ]

    expect(resolveProject({}, projects)).toBe('proj_default')
    expect(resolveProject({ folder_context: null }, projects)).toBe('proj_default')
  })

  it('on ambiguous match, returns the most recently created project', () => {
    const projects = [
      project({
        id: 'proj_old',
        folder_context: '/Users/x/dup',
        created_at: '2026-01-01T00:00:00Z',
      }),
      project({
        id: 'proj_new',
        folder_context: '/Users/x/dup',
        created_at: '2026-04-01T00:00:00Z',
      }),
      project({
        id: 'proj_mid',
        folder_context: '/Users/x/dup',
        created_at: '2026-02-01T00:00:00Z',
      }),
    ]

    const result = resolveProject({ folder_context: '/Users/x/dup' }, projects)

    expect(result).toBe('proj_new')
  })

  it('returns null when folder_context is given but no row matches (no insert)', () => {
    const projects = [
      project({ id: 'proj_a', folder_context: '/Users/x/projects/a' }),
      project({ id: 'proj_default', is_default_personal: true }),
    ]

    const result = resolveProject(
      { folder_context: '/Users/x/unknown' },
      projects,
    )

    expect(result).toBeNull()
  })
})
