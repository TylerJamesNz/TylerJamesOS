import { Navigate } from 'react-router-dom'
import { useSession } from '@/context/SessionContext'
import { supabase } from '@/lib/supabase'

export default function SignInPage() {
  const { user, loading } = useSession()

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          maxWidth: 360,
          width: '100%',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Tyler James OS
        </h1>
        <p style={{ margin: 0, opacity: 0.7, textAlign: 'center' }}>
          Personal infrastructure, signed in once.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          style={{
            border: '1px solid currentColor',
            background: 'transparent',
            color: 'inherit',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Continue with Google
        </button>
      </main>
    </div>
  )
}
