import { useGame } from './GameProvider.jsx'
import MainScreen from './MainScreen.jsx'
import LockedScreen from './screens/LockedScreen.jsx'

// "/" — the locked screen until the start QR is scanned, then the main map
// screen (with the phase's pop-up on top) for the rest of the game. A reload
// opens exactly where the player is. Scans are handled on top (ScanProvider in Layout).
export default function PhaseScreen() {
  const { phase } = useGame()
  return phase === 'locked' ? <LockedScreen /> : <MainScreen />
}
