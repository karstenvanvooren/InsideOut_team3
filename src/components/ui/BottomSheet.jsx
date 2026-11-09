import { useEffect } from 'react'
import { Icon } from './icons.jsx'
import { usePresence } from './usePresence.js'

const CLOSE_MS = 200

/**
 * One component for every pop-up: a white card in the middle of the screen
 * (consistent with the fragment pop-up). It moves up when the phone keyboard
 * opens, so inputs stay visible. `sheet` gives the old bottom sheet instead.
 *
 * open: show it (it animates in and out by itself).
 * onClose: if given, tapping outside or the ✕ closes it. Leave it out for
 *          pop-ups that can't be dismissed (intros, challenge, ...).
 * dim: darken the map behind it (pop-ups that need focus: arrived, fragment).
 *      Without dim and onClose the map behind stays usable.
 * sheet: a bottom sheet instead of the centered card (not used in the game right now).
 * label: accessible name of the dialog.
 */
export default function BottomSheet({ open, onClose, dim = false, sheet = false, label, className = '', children }) {
  const { visible, closing, content } = usePresence(open, CLOSE_MS, children)
  const centered = !sheet
  useKeyboardOffset(visible)
  if (!visible) return null

  const backdrop = dim ? 'is-dim' : onClose ? 'is-catcher' : 'is-passthrough'

  return (
    <div className={`sheet-layer ${centered ? 'is-centered' : ''} ${closing ? 'is-closing' : ''}`}>
      <div className={`sheet-backdrop ${backdrop}`} onClick={onClose} aria-hidden="true" />
      <section className={`sheet ${className}`} role="dialog" aria-modal={dim || undefined} aria-label={label}>
        {!centered && <div className="sheet-handle" aria-hidden="true" />}
        {onClose && (
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} strokeWidth={2.4} />
          </button>
        )}
        {content}
      </section>
    </div>
  )
}

/**
 * While a pop-up is open: how much of the screen the phone keyboard covers,
 * as --keyboard on <html> (0px when it's closed). The centered card sits above it.
 */
function useKeyboardOffset(active) {
  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--keyboard', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      root.style.setProperty('--keyboard', '0px')
    }
  }, [active])
}
