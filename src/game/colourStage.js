// The app changes colour while you play (branding: "starts very mysterious →
// ends in the colours of the artwork"). Figma: variables "Inside Out · Theme".
//   locked start          → dark (handled by .theme-dark on the start screens)
//   locations 1–2         → begin  (start palette: white, navy, burgundy)
//   locations 3–4         → middle (off-white, olive, sage)
//   locations 5–6, finale → end    (cream, blue, rose, sage: the artwork)
// The stage class goes on <html>, so every screen, pop-up and the map follow it.
import { useEffect } from 'react'
import { getLocations } from '../lib/story.js'

export const STAGES = ['begin', 'middle', 'end']
export const STAGE_EVENT = 'insideout:stage'

/** Which colour stage belongs to this game state. */
export function stageFor({ phase, locationIndex = 0 }) {
  if (phase === 'finale') return 'end'
  const total = Math.max(getLocations().length, 1)
  // split the route in three equal parts (6 locations → 2 per stage)
  const part = Math.min(Math.floor((locationIndex * 3) / total), 2)
  return STAGES[part]
}

/** Keeps the stage class on <html> (and the browser bar colour) in sync with the game. */
export function useColourStage(game) {
  const stage = stageFor(game)
  const locked = game.phase === 'locked'

  useEffect(() => {
    const root = document.documentElement
    if (root.dataset.stage === stage) return
    STAGES.forEach((s) => root.classList.toggle(`stage-${s}`, s === stage))
    root.dataset.stage = stage
    // tell the map (and anything else that reads tokens in JS) to repaint
    window.dispatchEvent(new CustomEvent(STAGE_EVENT, { detail: stage }))
  }, [stage])

  useEffect(() => {
    // locked start: the page behind everything is navy (see global.css, phones)
    document.documentElement.classList.toggle('is-locked', locked)
  }, [locked])

  useEffect(() => {
    // the phone's status/address bar matches the screen: navy at the start, the stage background after
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    meta.setAttribute('content', locked ? '#1c2430' : bg || '#ffffff')
  }, [stage, locked])

  return stage
}
