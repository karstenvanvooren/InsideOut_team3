import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { isDevEnabled, readDevFlagFromUrl, toggleDevEnabled } from '../dev/devSettings.js'
import BottomNav from '../game/BottomNav.jsx'
import PhaseScreen from '../game/PhaseScreen.jsx'
import { STARTED_PHASES } from '../game/gameState.js'
import Collection from '../pages/Collection.jsx'
import { useColourStage } from '../game/colourStage.js'
import { useGame } from '../game/GameProvider.jsx'
import { ScanProvider } from '../game/ScanProvider.jsx'

const DevPanel = lazy(() => import('../dev/DevPanel.jsx'))

// The scanner (and its results) and the game's bottom nav are available on every
// screen; the nav only shows once the game has started (see BottomNav).
export default function Layout() {
  const { pathname, search, hash } = useLocation()
  const [devEnabled, setDevEnabled] = useState(isDevEnabled)
  const game = useGame()
  // The colour of the whole app follows the progress (dark → begin → middle → end)
  useColourStage(game)

  // Map ⇄ stash: during the game the map screen stays mounted underneath and the stash
  // slides over it, so switching back doesn't reload the map, the route or the camera.
  const onCollection = pathname === '/collection'
  const keepGame = pathname === '/' || (onCollection && STARTED_PHASES.includes(game.phase))

  useEffect(() => {
    window.scrollTo(0, 0)
    document.querySelector('.stash-layer')?.scrollTo(0, 0)
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
      // 90×140 px: big enough to reach below the status bar / notch when the game
      // runs as a home-screen app (there the very top belongs to the phone).
      if (e.clientX > 90 || e.clientY > 140) return
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
          {keepGame && (
            <div className="game-layer" aria-hidden={onCollection || undefined} inert={onCollection ? '' : undefined}>
              <PhaseScreen />
            </div>
          )}
          {onCollection && (
            <div className={keepGame ? 'stash-layer' : undefined}>
              <Collection />
            </div>
          )}
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
