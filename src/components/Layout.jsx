import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const icons = {
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  collection: <path d="M4 5h6v14H4zM14 5h6v14h-6zM10 7h4M10 17h4" />,
  scan: <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16" />,
}

function NavIcon({ name }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}

export default function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <main>
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main">
        <NavLink to="/" end>
          <NavIcon name="home" />
          Home
        </NavLink>
        <NavLink to="/collection">
          <NavIcon name="collection" />
          Collection
        </NavLink>
        <NavLink to="/scan">
          <NavIcon name="scan" />
          Scan
        </NavLink>
      </nav>
    </div>
  )
}
