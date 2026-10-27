import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getHook } from '../lib/story.js'
import { markHookFound } from '../lib/progress.js'
import { patterns, vibrate } from '../lib/vibrate.js'
import UnknownHook from './UnknownHook.jsx'

// Entry point for every QR code / NFC tag: /hook/:id
export default function Hook() {
  const { id } = useParams()
  const navigate = useNavigate()
  const hook = getHook(id)
  const handled = useRef(false) // StrictMode runs effects twice in dev

  useEffect(() => {
    if (!hook || handled.current) return
    handled.current = true
    const isNew = markHookFound(hook.id)
    if (isNew) vibrate(patterns.found)
    navigate(`/chapter/${hook.chapter}`, { replace: true, state: { foundHook: hook.id, isNew } })
  }, [hook, navigate])

  if (!hook) return <UnknownHook id={id} />
  return <div className="page center muted">Opening trace…</div>
}
