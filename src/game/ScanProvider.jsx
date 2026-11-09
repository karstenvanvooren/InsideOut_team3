import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import QrScanner, { hookIdFromText } from '../components/QrScanner.jsx'
import { HookThumb } from '../components/ui/HookThumb.jsx'
import { Icon } from '../components/ui/icons.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import { vibrate, patterns } from '../lib/vibrate.js'
import { useGame } from './GameProvider.jsx'
import { resolveScan } from './scans.js'
import UnlockAnimation from './screens/UnlockAnimation.jsx'

const ScanContext = createContext(null)

/**
 * Hosts the in-app scanner and shows scan results on top of the current phase
 * screen. Deep links (/hook/:qrId) and the dev panel's "Fake scan" arrive as
 * router state { scanned: qrId } and take the same path.
 */
export function ScanProvider({ children }) {
  const { phase, hooksCollected, hooksTotal, unlockStart } = useGame()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)

  const handleScan = useCallback(async (qrId) => {
    setScannerOpen(false)
    setChecking(true)
    const outcome = await resolveScan(qrId)
    setChecking(false)
    if (outcome.kind !== 'message') vibrate(outcome.kind === 'start-unlock' ? patterns.unlock : patterns.found)
    setResult(outcome)
  }, [])

  // Cleared right away, so a reload doesn't scan again
  useEffect(() => {
    const scanned = routerLocation.state?.scanned
    if (!scanned) return
    navigate(routerLocation.pathname, { replace: true, state: null })
    handleScan(scanned)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.key])

  const onCode = (text) => {
    const qrId = hookIdFromText(text)
    if (!qrId) return 'That QR code isn’t part of Inside Out.'
    handleScan(qrId)
  }

  const value = useMemo(() => ({ openScanner: () => setScannerOpen(true) }), [])
  // Before the start everything is in the dark style
  const theme = phase === 'locked' ? 'theme-dark' : ''

  return (
    <ScanContext.Provider value={value}>
      {children}

      {scannerOpen && (
        <div className={`scan-overlay ${theme}`} role="dialog" aria-modal="true" aria-label="Scanner">
          <div className="scan-overlay-inner stack">
            <div className="scan-overlay-head">
              <h2>{phase === 'locked' ? 'Scan the start' : 'Scan a hook'}</h2>
              <button type="button" className="round-btn" onClick={() => setScannerOpen(false)} aria-label="Close">
                <Icon name="close" size={18} strokeWidth={2.4} />
              </button>
            </div>
            <QrScanner onCode={onCode} />
          </div>
        </div>
      )}

      {checking && (
        <div className={`scan-result ${theme}`} role="status">
          <div className="scan-result-card">
            <div className="pulse" aria-hidden="true" />
            <p>Checking where you are…</p>
          </div>
        </div>
      )}

      {result?.kind === 'start-unlock' && (
        <UnlockAnimation
          onDone={() => {
            setResult(null)
            unlockStart()
          }}
        />
      )}

      {/* A hook is a chapter of her story: read it right away (and later in the collection) */}
      <BottomSheet open={result?.kind === 'hook-collected'} dim label="Hook collected" className="hook-story">
        {result?.hook && (
          <>
            <span className="hook-story-thumb" aria-hidden="true">
              <HookThumb />
            </span>
            <p className="eyebrow">
              Hook {hooksCollected}/{hooksTotal}
              {result.hook.content?.chapter ? ` · chapter ${result.hook.content.chapter}` : ''}
            </p>
            <h2 className="sheet-title">{result.hook.content?.title ?? 'Hook collected!'}</h2>
            {result.hook.content?.text && <p className="hook-story-text">{result.hook.content.text}</p>}
            <button type="button" className="btn btn-block" onClick={() => setResult(null)}>
              Keep walking
            </button>
            <p className="permissions-note">Saved in your collection.</p>
          </>
        )}
      </BottomSheet>

      {result?.kind === 'message' && (
        <div className={`scan-result ${theme}`} role="alertdialog" aria-modal="true" aria-label={result.title}>
          <div className="scan-result-card">
            <h2>{result.title}</h2>
            <p>{result.text}</p>
            <button type="button" className="btn btn-block" onClick={() => setResult(null)}>
              OK
            </button>
          </div>
        </div>
      )}
    </ScanContext.Provider>
  )
}

/** const { openScanner } = useScanner() */
export function useScanner() {
  const value = useContext(ScanContext)
  if (!value) throw new Error('useScanner() must be used inside <ScanProvider>')
  return value
}
