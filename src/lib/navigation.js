// Turn-by-turn helpers: geometry along a route line, heading maths, turns worked
// out from the route's shape (BRouter gives the line, not the turns) and English
// instructions. No map library in here.
import { distanceMeters } from './location.js'

const R = 6371000
const rad = (deg) => (deg * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

/** Compass bearing from a to b, 0–360 (0 = north). */
export function bearing(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng))
  return (deg(Math.atan2(y, x)) + 360) % 360
}

/** Shortest difference between two angles, in degrees (0–180). */
export const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180)

// Flat x/y in meters around a reference point. Fine for a walk through a city.
const toXY = (p, ref) => ({
  x: rad(p.lng - ref.lng) * R * Math.cos(rad(ref.lat)),
  y: rad(p.lat - ref.lat) * R,
})

/**
 * Prepares a route line for fast lookups: coords as [[lat, lng], ...].
 * Returns { points, cumulative (m from the start), length }.
 */
export function measureLine(coords) {
  const points = coords.map(([lat, lng]) => ({ lat, lng }))
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + distanceMeters(points[i - 1], points[i]))
  return { points, cumulative, length: cumulative.at(-1) ?? 0 }
}

/** Where is p on the line? { along (m from start), offset (m from the line) }. */
export function projectOnLine(line, p) {
  let best = { along: 0, offset: Infinity }
  for (let i = 1; i < line.points.length; i++) {
    const a = toXY(line.points[i - 1], p)
    const b = toXY(line.points[i], p)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2)) : 0
    const offset = Math.hypot(a.x + t * dx, a.y + t * dy)
    if (offset < best.offset) {
      best = { along: line.cumulative[i - 1] + t * (line.cumulative[i] - line.cumulative[i - 1]), offset }
    }
  }
  return best
}

/** The point `meters` along the line, with the bearing of that stretch. */
export function pointAlong(line, meters) {
  const { points, cumulative } = line
  if (points.length < 2) return { ...points[0], bearing: 0 }
  const m = Math.max(0, Math.min(meters, line.length))
  let i = 1
  while (i < points.length - 1 && cumulative[i] < m) i++
  const a = points[i - 1]
  const b = points[i]
  const t = cumulative[i] > cumulative[i - 1] ? (m - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1]) : 0
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, bearing: bearing(a, b) }
}

/** The rest of the line from `meters` onwards, as [[lat, lng], ...] (the part still to walk). */
export function lineFrom(line, meters) {
  const start = pointAlong(line, meters)
  const rest = line.points.filter((_, i) => line.cumulative[i] > meters).map((p) => [p.lat, p.lng])
  return [[start.lat, start.lng], ...rest]
}

/** For each step, how far along the line its maneuver point lies. */
export function stepPositions(line, steps) {
  let from = 0
  return steps.map((step) => {
    let bestIndex = from
    let bestDistance = Infinity
    for (let k = from; k < line.points.length; k++) {
      const d = distanceMeters(line.points[k], step.location)
      if (d < bestDistance) {
        bestDistance = d
        bestIndex = k
      }
      if (d < 1) break
    }
    from = bestIndex
    return line.cumulative[bestIndex]
  })
}

// ---------- Turns from the shape of the line ----------

const TURN_MIN = 35 // degrees: smaller bends are "keep going"
const LOOK = 12 // m: compare the direction this far before and after a corner (ignores tiny zigzags)
const MERGE = 18 // m: two corners closer than this are one turn

const modifierFor = (turn) => {
  const a = Math.abs(turn)
  const side = turn > 0 ? 'right' : 'left'
  if (a >= 155) return 'uturn'
  if (a >= 120) return `sharp ${side}`
  if (a >= 60) return side
  return `slight ${side}`
}

/**
 * The turns along a route line [[lat, lng], ...]: a "depart" step, one step per
 * corner sharper than TURN_MIN and an "arrive" step, in the same shape as before
 * ({ type, modifier, name, bearingAfter, location }).
 */
export function stepsFromLine(coords) {
  const line = measureLine(coords)
  if (line.points.length < 2) return []
  const first = pointAlong(line, Math.min(LOOK, line.length))
  const steps = [{ type: 'depart', name: '', bearingAfter: bearing(line.points[0], first), location: line.points[0] }]
  let lastAt = -Infinity
  for (let i = 1; i < line.points.length - 1; i++) {
    const at = line.cumulative[i]
    if (at < LOOK || line.length - at < LOOK) continue
    const before = pointAlong(line, at - LOOK)
    const after = pointAlong(line, at + LOOK)
    const turn = ((bearing(line.points[i], after) - bearing(before, line.points[i]) + 540) % 360) - 180
    if (Math.abs(turn) < TURN_MIN) continue
    const step = { type: 'turn', modifier: modifierFor(turn), name: '', bearingAfter: bearing(line.points[i], after), location: line.points[i], strength: Math.abs(turn) }
    if (at - lastAt < MERGE) {
      // keep the sharper of two corners that are really one turn
      if (step.strength > steps.at(-1).strength) steps[steps.length - 1] = step
    } else steps.push(step)
    lastAt = at
  }
  steps.push({ type: 'arrive', name: '', location: line.points.at(-1) })
  return steps
}

// ---------- Instructions ----------

const cardinal = (b) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(b / 45) % 8]

const turnWords = {
  uturn: 'Make a U-turn',
  'sharp right': 'Turn sharp right',
  right: 'Turn right',
  'slight right': 'Turn slightly right',
  straight: 'Continue straight',
  'slight left': 'Turn slightly left',
  left: 'Turn left',
  'sharp left': 'Turn sharp left',
}

/** Which arrow to draw: straight | left | right | slight-left | slight-right | sharp-left | sharp-right | uturn | arrive. */
export function maneuverIcon(step) {
  if (step.type === 'arrive') return 'arrive'
  if (step.type === 'depart') return 'straight'
  const modifier = step.modifier ?? 'straight'
  if (modifier === 'uturn') return 'uturn'
  return modifier.replace(' ', '-')
}

/** "Turn right onto Meir", "Continue onto Wapper", "Arrive at MoMu". */
export function instructionFor(step, destinationName) {
  const onto = step.name ? ` onto ${step.name}` : ''
  switch (step.type) {
    case 'arrive':
      return `Arrive at ${destinationName}`
    case 'depart':
      return `Head ${cardinal(step.bearingAfter ?? 0)}${step.name ? ` on ${step.name}` : ''}`
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      return step.exit ? `At the roundabout, take exit ${step.exit}${onto}` : `Go around the roundabout${onto}`
    case 'exit roundabout':
    case 'exit rotary':
      return `Exit the roundabout${onto}`
    case 'new name':
    case 'continue':
      if (!step.modifier || step.modifier === 'straight') return step.name ? `Continue onto ${step.name}` : 'Continue straight'
      break
    case 'fork':
      if (step.modifier?.includes('left')) return `Keep left${onto}`
      if (step.modifier?.includes('right')) return `Keep right${onto}`
      break
    case 'end of road':
      if (step.modifier?.includes('left')) return `At the end of the road, turn left${onto}`
      if (step.modifier?.includes('right')) return `At the end of the road, turn right${onto}`
      break
  }
  return `${turnWords[step.modifier] ?? 'Continue'}${onto}`
}
