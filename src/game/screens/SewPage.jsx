// The end of the game, after the reveal (hi-fi v3): Bourgeois mended her memories
// with needle and thread, so the player makes a page too.
//   SewPage  tap a piece to put it on the cloth, drag it, turn it, stitch it, add one word
//   OdePage  "ode à toi": the finished page, signed and dated → share as story / collection
// The page is saved in this browser (PAGE_KEY), so it's still there when you come back.
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui/icons.jsx'
import { safeGet, safeSet } from '../../lib/storage.js'
import { patterns, vibrate } from '../../lib/vibrate.js'

const PAGE_KEY = 'insideout.page.v1'
const MAX_WORD = 16

export const loadPage = () => safeGet(PAGE_KEY)
const savePage = (page) => safeSet(PAGE_KEY, page)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const dateLabel = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** The page itself (used on the sewing screen, the finished page and the share picture). */
function Cloth({ pieces, word, selected, onPointerDown, clothRef, interactive = false }) {
  return (
    <div className={`sew-cloth ${interactive ? 'is-interactive' : ''}`} ref={clothRef}>
      {pieces.map((p) => (
        <img
          key={p.key}
          src={p.src}
          alt=""
          draggable="false"
          className={`sew-piece ${p.stitched ? 'is-stitched' : ''} ${selected === p.key ? 'is-selected' : ''}`}
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, rotate: `${p.rot}deg` }}
          onPointerDown={interactive ? (e) => onPointerDown(e, p.key) : undefined}
        />
      ))}
      {word && <span className="sew-word hand">{word}</span>}
    </div>
  )
}

export function SewPage({ pieces: available, onDone }) {
  const [pieces, setPieces] = useState([])
  const [selected, setSelected] = useState(null)
  const [word, setWord] = useState('')
  const clothRef = useRef(null)
  const drag = useRef(null)
  const used = new Set(pieces.map((p) => p.id))

  const add = (f) => {
    if (used.has(f.id)) return
    const n = pieces.length
    const key = `${f.id}-${Date.now()}`
    setPieces((ps) => [...ps, { key, id: f.id, src: f.src, x: 0.28 + (n % 3) * 0.22, y: 0.3 + Math.floor(n / 3) * 0.36, rot: ((n * 37) % 24) - 12, stitched: false }])
    setSelected(key)
    vibrate(patterns.tap)
  }

  const update = (key, change) => setPieces((ps) => ps.map((p) => (p.key === key ? { ...p, ...change } : p)))

  const onPointerDown = (e, key) => {
    e.preventDefault()
    setSelected(key)
    const box = clothRef.current.getBoundingClientRect()
    const p = pieces.find((x) => x.key === key)
    drag.current = { key, box, dx: e.clientX - (box.left + p.x * box.width), dy: e.clientY - (box.top + p.y * box.height) }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  useEffect(() => {
    const move = (e) => {
      const d = drag.current
      if (!d) return
      update(d.key, { x: clamp((e.clientX - d.dx - d.box.left) / d.box.width, 0.05, 0.95), y: clamp((e.clientY - d.dy - d.box.top) / d.box.height, 0.05, 0.95) })
    }
    const up = () => {
      drag.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  const sel = pieces.find((p) => p.key === selected)

  const finish = () => {
    const page = { pieces, word: word.trim(), at: Date.now() }
    savePage(page)
    vibrate(patterns.unlock)
    onDone(page)
  }

  return (
    <div className="deep-screen sew-screen" role="dialog" aria-modal="true" aria-label="Sew your own page">
      <div className="deep-inner">
        <p className="eyebrow sew-eyebrow">The last page is yours</p>
        <h2 className="big-title sew-title">sew your page.</h2>
        <Cloth pieces={pieces} word={word.trim()} selected={selected} onPointerDown={onPointerDown} clothRef={clothRef} interactive />
        {!pieces.length && <p className="hand sew-hint">tap your pieces below to put them on the cloth. then drag, turn and stitch.</p>}

        <div className="sew-tools">
          <button type="button" className="sticker is-white" disabled={!sel} onClick={() => update(selected, { rot: (sel.rot + 15) % 360 })}>
            <Icon name="rotate" size={14} strokeWidth={2.4} /> turn
          </button>
          <button type="button" className={`sticker ${sel?.stitched ? 'is-rose' : ''}`} disabled={!sel} onClick={() => { update(selected, { stitched: !sel.stitched }); vibrate(patterns.tap) }}>
            <Icon name="needle" size={14} strokeWidth={2.4} /> stitch
          </button>
          <button type="button" className="sticker is-dark" disabled={!sel} onClick={() => { setPieces((ps) => ps.filter((p) => p.key !== selected)); setSelected(null) }}>
            take off
          </button>
        </div>

        <div className="sew-tray" aria-label="Your real pieces">
          {available.map((f) => (
            <button key={f.id} type="button" className={`sew-tray-piece ${used.has(f.id) ? 'is-used' : ''}`} onClick={() => add(f)} aria-label={`Put ${f.title} on the cloth`}>
              <img src={f.src} alt="" />
            </button>
          ))}
        </div>

        <input
          className="chat-input sew-input"
          type="text"
          value={word}
          maxLength={MAX_WORD}
          onChange={(e) => setWord(e.target.value)}
          placeholder="one word you want to remember"
          aria-label="One word for your page"
          enterKeyHint="done"
        />
        <button type="button" className="btn btn-block" onClick={finish} disabled={!pieces.length}>
          Finish my page
        </button>
      </div>
    </div>
  )
}

// ---------- Share picture (1080 × 1920, story format) ----------

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

async function pageImage(page) {
  try {
    await document.fonts?.load('700 60px Caveat')
    await document.fonts?.load('700 60px "Pra Bono"')
    await document.fonts?.load('700 60px Syne')
  } catch {
    // fonts are a nice-to-have
  }
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1920
  const g = c.getContext('2d')
  const css = getComputedStyle(document.documentElement)
  const col = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  g.fillStyle = col('--burgundy', '#4b1e23')
  g.fillRect(0, 0, 1080, 1920)
  g.fillStyle = '#ffffff'
  g.font = '700 120px "Pra Bono", Caveat, Syne, sans-serif'
  g.fillText('ode à toi.', 90, 260)
  g.fillStyle = col('--rose', '#c29095')
  g.font = '700 58px Caveat, cursive'
  g.fillText('(ode to you – my page, next to hers)', 96, 350)
  // frame + cloth
  const fx = 120, fy = 460, fw = 840, fh = 940
  g.save()
  g.translate(540, fy + fh / 2)
  g.rotate((-1.5 * Math.PI) / 180)
  g.translate(-540, -(fy + fh / 2))
  g.fillStyle = 'rgba(28,36,48,0.35)'
  g.fillRect(fx + 14, fy + 14, fw, fh)
  g.fillStyle = '#ffffff'
  g.fillRect(fx, fy, fw, fh)
  const cx = fx + 60, cy = fy + 60, cs = fw - 120
  g.fillStyle = col('--cream', '#e6e0d6')
  g.fillRect(cx, cy, cs, cs)
  for (const p of page.pieces) {
    const img = await loadImage(p.src)
    const w = cs * 0.34
    const h = (w * img.height) / img.width
    g.save()
    g.translate(cx + p.x * cs, cy + p.y * cs)
    g.rotate((p.rot * Math.PI) / 180)
    g.shadowColor = 'rgba(28,36,48,0.3)'
    g.shadowOffsetX = 8
    g.shadowOffsetY = 8
    g.drawImage(img, -w / 2, -h / 2, w, h)
    g.shadowColor = 'transparent'
    if (p.stitched) {
      g.setLineDash([16, 12])
      g.lineWidth = 5
      g.strokeStyle = col('--burgundy', '#4b1e23')
      g.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24)
      g.setLineDash([])
    }
    g.restore()
  }
  if (page.word) {
    g.fillStyle = col('--burgundy', '#4b1e23')
    g.font = '700 76px Caveat, cursive'
    g.textAlign = 'right'
    g.fillText(page.word, cx + cs - 24, cy + cs - 30)
    g.textAlign = 'left'
  }
  g.fillStyle = '#6f6a66'
  g.font = '600 34px Inter, sans-serif'
  g.textAlign = 'center'
  g.fillText(`Antwerp · ${dateLabel(page.at)}`, 540, fy + fh - 40)
  g.restore()
  g.fillStyle = '#ffffff'
  g.font = '700 46px "Pra Bono", Caveat, Syne, sans-serif'
  g.textAlign = 'center'
  g.fillText('She repaired what was torn.', 540, 1580)
  g.fillText('Today, piece by piece, so did I.', 540, 1645)
  g.fillStyle = col('--rose', '#c29095')
  g.font = '600 32px Inter, sans-serif'
  g.fillText('Inside Out · Sfumato · after Louise Bourgeois, Ode à l’oubli', 540, 1800)
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'))
}

export function OdePage({ page, stats, onCollection }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const share = async () => {
    setBusy(true)
    setMsg('')
    try {
      const blob = await pageImage(page)
      const file = new File([blob], 'ode-a-toi.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ode à toi', text: 'My page, after Louise Bourgeois – Ode à l’oubli' })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'ode-a-toi.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 4000)
        setMsg('Saved as a picture.')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setMsg('Couldn’t make the picture. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="deep-screen ode-screen">
      <div className="deep-inner">
        <h2 className="big-title">ode à toi.</h2>
        <p className="hand ode-aside">(ode to you – your page, next to hers)</p>
        <figure className="ode-frame">
          <Cloth pieces={page.pieces} word={page.word} />
          <figcaption>Antwerp · {dateLabel(page.at)}</figcaption>
        </figure>
        {stats && (
          <span className="sticker is-dark" style={{ '--tilt': '1.5deg', alignSelf: 'flex-start' }}>
            {stats}
          </span>
        )}
        <p className="ode-closing">She repaired what was torn. Today, piece by piece, so did you.</p>
        <div className="deep-bottom">
          <button type="button" className="btn btn-block" onClick={share} disabled={busy}>
            {busy ? 'Making your picture…' : 'Share as story'}
          </button>
          <button type="button" className="btn btn-block ode-secondary" onClick={onCollection}>
            View my collection
          </button>
          {msg && (
            <p className="deep-note" role="status">
              {msg}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
