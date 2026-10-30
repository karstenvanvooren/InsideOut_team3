import { useEffect, useRef, useState } from 'react'

/**
 * Keeps something on screen for `ms` after `open` turns false, so it can
 * animate out. While closing it keeps showing its last `content` (the game
 * state may already have moved on).
 */
export function usePresence(open, ms, content) {
  const [rendered, setRendered] = useState(open)
  const [closing, setClosing] = useState(false)
  const last = useRef(content)
  if (open) last.current = content

  useEffect(() => {
    if (open) {
      setRendered(true)
      setClosing(false)
      return
    }
    setClosing(true)
    const timer = setTimeout(() => {
      setRendered(false)
      setClosing(false)
    }, ms)
    return () => clearTimeout(timer)
  }, [open, ms])

  return { visible: open || rendered, closing, content: open ? content : last.current }
}
