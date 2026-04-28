import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type SessionState = {
  session: Session | null
  user: User | null
  loading: boolean
}

const SessionContext = createContext<SessionState | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    session: null,
    user: null,
    loading: true,
  })

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      })

      if (event === 'SIGNED_IN' && session?.user) {
        void ensureUserRow(session.user)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
}

async function ensureUserRow(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName = (meta.full_name as string) ?? (meta.name as string) ?? user.email ?? ''
  const imageUrl = (meta.avatar_url as string) ?? (meta.picture as string) ?? null
  const provider = (user.app_metadata?.provider as string) ?? 'google'

  await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      name: fullName,
      image_url: imageUrl,
      provider,
    },
    { onConflict: 'id' },
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (ctx === undefined) {
    throw new Error('useSession must be used inside <SessionProvider>')
  }
  return ctx
}
