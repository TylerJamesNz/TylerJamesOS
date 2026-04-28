import { LogIn } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/context/SessionContext'
import { supabase } from '@/lib/supabase'
import './SignInPage.css'

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
    <div className="signin">
      <header className="signin-header">
        <span className="signin-logo">
          TylerJames<span>OS</span>
        </span>
        <span className="signin-tag">Personal operating system</span>
      </header>

      <main className="signin-main">
        <section className="signin-hero" aria-labelledby="signin-heading">
          <p className="signin-eyebrow">Welcome</p>
          <h1 id="signin-heading" className="signin-title">
            Sign in to continue.
          </h1>
          <p className="signin-lede">
            Tyler James OS is a private, personal platform. Sign in with Google to access your tasks,
            finance, and design system.
          </p>
          <button type="button" className="signin-button" onClick={signInWithGoogle}>
            <LogIn size={18} aria-hidden="true" />
            <span>Continue with Google</span>
          </button>
        </section>
      </main>
    </div>
  )
}
