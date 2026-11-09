import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from '../components/ui/icons.jsx'
import { useGame } from './GameProvider.jsx'
import { STARTED_PHASES } from './gameState.js'
import { useScanner } from './ScanProvider.jsx'

/**
 * The game's bottom nav (like the mid-fi): Map · big round Scan button in the
 * middle that sticks out above the bar · Collection (stacked cards + counter).
 * Only once the game has started; hidden on the locked screen and the intros.
 */
export default function BottomNav() {
  const { phase, fragments, hooksCollected } = useGame()
  const { openScanner } = useScanner()
  const visible = STARTED_PHASES.includes(phase)
  const count = fragments.length + hooksCollected

  // Screens make room for it (and the dev button moves up) via this class
  useEffect(() => {
    document.body.classList.toggle('has-game-nav', visible)
    return () => document.body.classList.remove('has-game-nav')
  }, [visible])

  if (!visible) return null

  return (
    <nav className="game-nav" aria-label="Game">
      <NavLink to="/" end className="game-nav-item">
        <Icon name="map" size={22} />
        Map
      </NavLink>

      <button type="button" className="game-nav-item game-nav-scan" onClick={openScanner} aria-label="Scan a hook">
        <span className="game-nav-scan-btn">
          <Icon name="qr" size={26} strokeWidth={2.2} />
        </span>
        Scan
      </button>

      <NavLink to="/collection" className="game-nav-item">
        <span className="game-nav-icon-wrap">
          <Icon name="cards" size={22} />
          {count > 0 && (
            <span key={count} className="game-nav-badge" aria-label={`${count} collected`}>
              {count}
            </span>
          )}
        </span>
        Collection
      </NavLink>
    </nav>
  )
}
