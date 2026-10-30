import { Icon } from './icons.jsx'
import { usePresence } from './usePresence.js'

const CLOSE_MS = 200

/**
 * One component for every pop-up on the map: a white sheet that slides up and
 * sits directly on top of the game's bottom nav (top corners rounded, handle bar).
 *
 * open: show it (it animates in and out by itself).
 * onClose: if given, tapping outside or the ✕ closes it. Leave it out for
 *          pop-ups that can't be dismissed (intros, challenge, ...).
 * dim: darken the map behind it (pop-ups that need focus: arrived, fragment).
 *      Without dim and onClose the map behind stays usable.
 * centered: a centered card instead of a sheet (fragment unlocked).
 * label: accessible name of the dialog.
 */
export default function BottomSheet({ open, onClose, dim = false, centered = false, label, className = '', children }) {
  const { visible, closing, content } = usePresence(open, CLOSE_MS, children)
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
