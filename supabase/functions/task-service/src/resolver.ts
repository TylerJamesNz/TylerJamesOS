export type Project = {
  id: string
  folder_context: string | null
  is_default_personal: boolean
  created_at: string
}

export type ResolveContext = {
  folder_context?: string | null
}

export function resolveProject(
  ctx: ResolveContext,
  projects: Project[],
): string | null {
  if (ctx.folder_context) {
    const matches = projects.filter((p) => p.folder_context === ctx.folder_context)
    if (matches.length === 0) return null
    const lastCreated = matches.reduce((winner, p) =>
      p.created_at > winner.created_at ? p : winner,
    )
    return lastCreated.id
  }
  const fallback = projects.find((p) => p.is_default_personal)
  return fallback ? fallback.id : null
}
