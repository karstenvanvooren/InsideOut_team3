// The riddle as a chat with "Sfumato" (hi-fi v3). Sfumato types a few lines, then
// the riddle arrives as a taped card. Wrong answers get a reply + the next hint;
// after 3 wrong ones Sfumato just tells you. A right answer gets a SOLVED stamp,
// then the route appears (onSolve). Rules are the same as before.
// The lines per location are in story.json → locations[].chat (defaults below).
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui/icons.jsx'
import { isCorrectRiddleAnswer } from '../../lib/answers.js'
import { getLocations } from '../../lib/story.js'
import { patterns, vibrate } from '../../lib/vibrate.js'

const REVEAL_AFTER = 3
const TYPE_MS = 750 // "typing…" before each message
const SOLVED_MS = 1700

const DEFAULT_LINES = [['psst. you came.', 'I hid my memories all over Antwerp. The first one is close.'], ['nice. that was one.', 'the next one is a little further.']]
const NOPE = ['nope. close though.', 'not that one.', 'hmm. no.']

let nextId = 1
const msg = (from, kind, text) => ({ id: nextId++, from, kind, text })

export default function RiddleChat({ location, index, wrong, onWrong, onSolve, onMinimise }) {
  const { riddle } = location
  const hints = riddle.hints ?? []
  const intro = location.chat ?? DEFAULT_LINES[Math.min(index, DEFAULT_LINES.length - 1)]

  // What Sfumato says first, then the riddle; when coming back (wrong > 0) the hints so far too
  const script = useRef(null)
  if (!script.current) {
    const lines = [...intro.map((t) => msg('them', 'text', t)), msg('them', 'riddle', riddle.question)]
    for (let i = 0; i < Math.min(wrong, REVEAL_AFTER - 1); i++) if (hints[i]) lines.push(msg('them', 'hint', `hint: ${hints[i]}`))
    script.current = lines
  }
  const [messages, setMessages] = useState(() => (wrong > 0 ? script.current : []))
  const [queue, setQueue] = useState(() => (wrong > 0 ? [] : script.current))
  const [typing, setTyping] = useState(false)
  const [answer, setAnswer] = useState('')
  const [solved, setSolved] = useState(false)
  const [revealed, setRevealed] = useState(wrong >= REVEAL_AFTER)
  const listRef = useRef(null)

  // Sfumato "types" each queued message
  useEffect(() => {
    if (!queue.length) {
      setTyping(false)
      return
    }
    setTyping(true)
    const timer = setTimeout(() => {
      setMessages((m) => [...m, queue[0]])
      setQueue((q) => q.slice(1))
      vibrate(patterns.tap)
    }, queue[0].kind === 'riddle' ? TYPE_MS + 250 : TYPE_MS)
    return () => clearTimeout(timer)
  }, [queue])

  // Keep the newest message in view
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const say = (...lines) => setQueue((q) => [...q, ...lines])

  const submit = (e) => {
    e.preventDefault()
    const text = answer.trim()
    if (!text || solved) return
    setAnswer('')
    setMessages((m) => [...m, msg('me', 'text', text)])
    if (isCorrectRiddleAnswer(text, riddle.answers)) {
      setSolved(true)
      vibrate(patterns.found)
      say(msg('them', 'text', 'yes. that’s the place.'), msg('them', 'solved', location.name))
      setTimeout(() => onSolve(), TYPE_MS * 2 + SOLVED_MS)
      return
    }
    const count = wrong + 1
    onWrong()
    vibrate(patterns.wrong ?? patterns.tap)
    if (count >= REVEAL_AFTER) {
      setRevealed(true)
      say(msg('them', 'text', `it’s ${location.name}. no shame.`))
    } else {
      say(msg('them', 'text', NOPE[(count - 1) % NOPE.length]), ...(hints[count - 1] ? [msg('them', 'hint', `hint: ${hints[count - 1]}`)] : []))
    }
  }

  const showReveal = revealed && !queue.length && !solved

  return (
    <section className="riddle-chat" aria-label={`Riddle ${index + 1}`}>
      <header className="chat-head">
        <span className="chat-avatar" aria-hidden="true">
          <img src="/fragments/real-5.jpg" alt="" />
        </span>
        <div className="chat-who">
          <strong>Sfumato</strong>
          <span>{typing ? 'typing…' : 'online'}</span>
        </div>
        <span className="sticker is-tint" style={{ '--tilt': '3deg' }}>
          riddle {index + 1}/{getLocations().length}
        </span>
        <button type="button" className="chat-minimise" onClick={onMinimise} aria-label="Minimise the riddle (look at the map)">
          <Icon name="chevronDown" size={18} strokeWidth={2.4} />
        </button>
      </header>

      <div className="chat-list" ref={listRef} aria-live="polite">
        {messages.map((m) => {
          if (m.kind === 'riddle')
            return (
              <div key={m.id} className="chat-riddle taped" style={{ '--tape-rot': '4deg' }}>
                {m.text}
              </div>
            )
          if (m.kind === 'solved')
            return (
              <div key={m.id} className="chat-solved" role="status">
                <span className="chat-stamp">solved</span>
                <span className="hand">on my way to {m.text}…</span>
              </div>
            )
          return (
            <p key={m.id} className={`chat-bubble from-${m.from} kind-${m.kind}`}>
              {m.text}
            </p>
          )
        })}
        {typing && (
          <p className="chat-bubble from-them chat-typing" aria-label="Sfumato is typing">
            <i />
            <i />
            <i />
          </p>
        )}
        {!queue.length && !solved && !revealed && wrong === REVEAL_AFTER - 1 && <p className="chat-note hand">3 wrong = I’ll just tell you. no shame.</p>}
      </div>

      {showReveal ? (
        <div className="chat-bar">
          <button type="button" className="btn btn-block" onClick={() => onSolve({ revealed: true })}>
            Show me the way
          </button>
        </div>
      ) : (
        <form className="chat-bar" onSubmit={submit}>
          <input
            className={`chat-input ${wrong > 0 && !solved ? 'is-wrong' : ''}`}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={wrong > 0 ? 'try again…' : 'type the place…'}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            enterKeyHint="send"
            aria-label="Your answer"
            disabled={solved}
          />
          <button type="submit" className="chat-send" aria-label="Send" disabled={solved || !answer.trim()}>
            <Icon name="arrowUp" size={22} strokeWidth={2.6} />
          </button>
        </form>
      )}
    </section>
  )
}
