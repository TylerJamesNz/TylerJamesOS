import { Link } from 'react-router-dom'
import './PlaceholderAppPage.css'

type Props = {
  title: string
  description?: string
}

export default function PlaceholderAppPage({ title, description }: Props) {
  return (
    <div className="placeholder">
      <header className="placeholder-header">
        <div className="placeholder-header-inner">
          <Link to="/" className="placeholder-back">
            ← Home
          </Link>
          <Link to="/" className="placeholder-logo">
            TylerJames<span>OS</span>
          </Link>
          <span className="placeholder-header-spacer" aria-hidden />
        </div>
      </header>
      <main className="placeholder-main">
        <h1 className="placeholder-title">{title}</h1>
        <p className="placeholder-body">
          {description ??
            'This app is not built yet. It will share the same design tokens and navigation as the rest of Tyler James OS.'}
        </p>
      </main>
    </div>
  )
}
