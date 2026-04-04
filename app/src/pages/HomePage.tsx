import { Link } from 'react-router-dom'
import './HomePage.css'

export default function HomePage() {
  return (
    <div className="home">
      <header className="home-header">
        <Link to="/" className="home-logo">
          TylerJames<span>OS</span>
        </Link>
        <span className="home-tag">Personal operating system</span>
      </header>

      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-heading">
          <p className="home-eyebrow">Welcome</p>
          <h1 id="home-heading" className="home-title">
            One place for money, tasks, and how things look.
          </h1>
          <p className="home-lede">
            This hub is a stand-in while apps are built. Open the brand kit to explore the design system; Finance and Todos
            will land here next.
          </p>
        </section>

        <section className="home-apps" aria-labelledby="home-apps-heading">
          <h2 id="home-apps-heading" className="home-apps-title">
            App tiles
          </h2>
          <div className="home-hub">
            <Link to="/brand-kit" className="home-card home-card--live tj-motion-hover-macro-tile">
              <div className="home-card-icon" aria-hidden>
                ◎
              </div>
              <h3 className="home-card-title">Brand kit</h3>
              <p className="home-card-desc">Colours, type, spacing, components — and theme presets for the whole system.</p>
              <span className="home-card-cta">Open →</span>
            </Link>

            <Link to="/finance" className="home-card home-card--live tj-motion-hover-macro-tile">
              <div className="home-card-icon" aria-hidden>
                ◇
              </div>
              <h3 className="home-card-title">Finance</h3>
              <p className="home-card-desc">Budgeting, transactions, and net worth — placeholder screen until the real app ships.</p>
              <span className="home-card-cta">Open placeholder →</span>
            </Link>

            <Link to="/todos" className="home-card home-card--live tj-motion-hover-macro-tile">
              <div className="home-card-icon" aria-hidden>
                ☆
              </div>
              <h3 className="home-card-title">Todos</h3>
              <p className="home-card-desc">Tasks, priorities, and due dates — placeholder screen until the todos app is wired up.</p>
              <span className="home-card-cta">Open placeholder →</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
