import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { isDevEnabled, readDevFlagFromUrl, toggleDevEnabled } from '../dev/devSettings.js'
import BottomNav from '../game/BottomNav.jsx'
import { ScanProvider } from '../game/ScanProvider.jsx'

const DevPanel = lazy(() => import('../dev/DevPanel.jsx'))

// The scanner (and its results) and the game's bottom nav are available on every
// screen; the nav only shows once the game has started (see BottomNav).
export default function Layout() {
  const { pathname, search, hash } = useLocation()
  const [devEnabled, setDevEnabled] = useState(isDevEnabled)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    readDevFlagFromUrl(search, hash)
    setDevEnabled(isDevEnabled())
  }, [search, hash])

  // Secret gesture for testers: tap the top-left corner 5 times within 3 seconds
  // to switch dev mode on or off. Works on every screen and every address
  // (localhost, phone over Wi-Fi, the deployed site) without typing ?dev=1.
  // It only listens; taps still reach whatever is underneath.
  useEffect(() => {
    let taps = []
    const onDown = (e) => {
      if (e.clientX > 60 || e.clientY > 60) return
      const now = Date.now()
      taps = [...taps.filter((t) => now - t < 3000), now]
      if (taps.length >= 5) {
        taps = []
        setDevEnabled(toggleDevEnabled())
        if (navigator.vibrate) navigator.vibrate(60)
      }
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [])

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
