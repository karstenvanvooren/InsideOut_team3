import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { isDevEnabled, readDevFlagFromUrl } from '../dev/devSettings.js'
import BottomNav from '../game/BottomNav.jsx'
import { ScanProvider } from '../game/ScanProvider.jsx'

const DevPanel = lazy(() => import('../dev/DevPanel.jsx'))

// The scanner (and its results) and the game's bottom nav are available on every
// screen; the nav only shows once the game has started (see BottomNav).
export default function Layout() {
  const { pathname, search } = useLocation()
  const [devEnabled, setDevEnabled] = useState(isDevEnabled)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    readDevFlagFromUrl(search)
    setDevEnabled(isDevEnabled())
  }, [search])

  return (
    <ScanProvider>
      <div className="app">
        <main>
          <Outlet />
        </main>
        <BottomNav />
        {devEnabled && (
          <Suspense fallback={null}>
            <DevPanel />
          </Suspense>
        )}
      </div>
    </ScanProvider>
  )
}
