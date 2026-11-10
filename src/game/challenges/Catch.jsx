// Catch the right utensils (Maagdenhuis): tools fall down, drag the basket
// left and right and catch only the sewing and lace-making tools.
import { useEffect, useRef, useState } from 'react'
import { patterns, vibrate } from '../../lib/vibrate.js'
import ChallengeFrame, { useChallenge } from './ChallengeFrame.jsx'
import MemoryArt from './memoryArt.jsx'

const SPAWN_MS = 900
const FALL_PX_PER_S = 120
const BASKET_W = 110
const ITEM_H = 58 // the falling tools are little cloth tiles (memoryArt.jsx)

export default function Catch({ onClose }) {
  const { challenge, solve, solved } = useChallenge()
  const target = challenge.target ?? 5
  const areaRef = useRef(null)
  const [items, setItems] = useState([]) // { id, name, good, x, y }
  const [basket, setBasket] = useState(0.5) // 0..1, centre of the basket
  const [caught, setCaught] = useState(0)
  const [flash, setFlash] = useState(null) // 'good' | 'bad'
  const live = useRef({ basket: 0.5, caught: 0, done: false })
  live.current.basket = basket

  // Game loop: spawn, fall, catch. The items live in a ref (one source of truth,
  // no side effects inside React state updates); React only gets a copy to draw.
  const itemsRef = useRef([])
  useEffect(() => {
    if (solved) return
    let raf
    let last = performance.now()
    let sinceSpawn = SPAWN_MS
    let nextId = 0
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      sinceSpawn += dt * 1000
      const area = areaRef.current
      if (!area || live.current.done) return
      const w = area.clientWidth
      const h = area.clientHeight
      const basketTop = h - 64
      const list = itemsRef.current.map((it) => ({ ...it, y: it.y + FALL_PX_PER_S * dt * it.speed }))
      if (sinceSpawn >= SPAWN_MS) {
        sinceSpawn = 0
        const good = Math.random() < 0.6
        const names = good ? challenge.good : challenge.bad
        list.push({ id: nextId++, name: names[Math.floor(Math.random() * names.length)], good, x: 0.12 + Math.random() * 0.76, y: -ITEM_H, speed: 0.85 + Math.random() * 0.45 })
      }
      const kept = []
      for (const it of list) {
        const inBasket = it.y + ITEM_H >= basketTop && it.y < basketTop + 24 && Math.abs(it.x * w - live.current.basket * w) < BASKET_W / 2 + 14
        if (inBasket) {
          if (it.good) {
            live.current.caught += 1
            setCaught(live.current.caught)
            setFlash('good')
            vibrate(patterns.tap)
            if (live.current.caught >= target) {
              live.current.done = true
              setTimeout(solve, 300)
            }
          } else {
            setFlash('bad')
            vibrate([30, 40, 30])
          }
          continue
        }
        if (it.y < h) kept.push(it)
      }
      itemsRef.current = kept
      setItems(kept)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [solved]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 450)
    return () => clearTimeout(t)
  }, [flash, caught])

  const moveTo = (clientX) => {
    const rect = areaRef.current.getBoundingClientRect()
    const half = BASKET_W / 2 / rect.width
    setBasket(Math.min(1 - half, Math.max(half, (clientX - rect.left) / rect.width)))
  }

  return (
    <ChallengeFrame onClose={onClose} counter={`Caught ${caught}/${target}`}>
      <div>
        <h2 className="challenge-question">{challenge.question}</h2>
        <p className="muted challenge-text">{challenge.text} Drag the basket left and right.</p>
      </div>
      <div
        ref={areaRef}
        className={`catch-area ${flash ? `flash-${flash}` : ''}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          moveTo(e.clientX)
        }}
        onPointerMove={(e) => e.buttons && moveTo(e.clientX)}
      >
        {items.map((it) => (
          <span key={it.id} className="catch-item" style={{ left: `${it.x * 100}%`, transform: `translate(-50%, ${it.y}px) rotate(${(it.id % 5) * 6 - 12}deg)` }}>
            <MemoryArt name={it.name} />
            <span className="visually-hidden">{it.name}</span>
          </span>
        ))}
        <div className={`catch-basket ${flash === 'good' ? 'pop' : ''} ${flash === 'bad' ? 'shake' : ''}`} style={{ left: `${basket * 100}%`, width: BASKET_W }}>
          Basket
        </div>
        {flash === 'bad' && <span className="catch-oops">Not that one!</span>}
      </div>
    </ChallengeFrame>
  )
}
