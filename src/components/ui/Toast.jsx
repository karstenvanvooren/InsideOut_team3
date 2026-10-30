import { useEffect, useRef } from 'react'
import { usePresence } from './usePresence.js'

const CLOSE_MS = 220

/**
 * Floating white card just above the bottom nav: thumbnail, title, subtitle.
 * Hides itself after `duration` ms (onClose), or when tapped.
 */
export default function Toast({ open, onClose, duration = 3500, thumbnail, title, subtitle }) {
  const { visible, closing, content } = usePresence(open, CLOSE_MS, { thumbnail, title, subtitle })
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => onCloseRef.current(), duration)
    return () => clearTimeout(timer)
  }, [open, duration, title, subtitle])

  if (!visible) return null

  return (
    <div className={`toast ${closing ? 'is-closing' : ''}`} role="status" onClick={onClose}>
      {content.thumbnail && <div className="toast-thumb">{content.thumbnail}</div>}
      <div className="toast-text">
        <div className="toast-title">{content.title}</div>
        {content.subtitle && <div className="toast-subtitle">{content.subtitle}</div>}
      </div>
    </div>
  )
}
