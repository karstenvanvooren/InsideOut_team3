import { useRef, useState } from 'react'

const screens = [
  {
    title: 'A city with a missing page',
    text: 'Antwerp is a book, and someone tore out the last page. You’re going to find it. Walk the city, follow the traces and solve the case.',
  },
  {
    title: 'Hooks & fragments',
    text: 'Traces are hidden in street art with a QR code or NFC tag: the hooks. Scan one, prove you’re really there and answer a question about the place. You get a chapter full of fragments: notes, photos and voice memos.',
  },
  {
    title: 'Riddles lead the way',
    text: 'Every location gives you a riddle about the next one. Type the name of the place. Get it right and a map shows you the walking route. Stuck? Hints appear after a few tries.',
  },
]

/** Up to three swipeable intro screens. Calls onDone() when finished or skipped. */
export default function Tutorial({ onDone }) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  const last = index === screens.length - 1

  const goTo = (i) => {
    const track = trackRef.current
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
  }

  const onScroll = () => {
    const track = trackRef.current
    setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  return (
    <div className="page stack tutorial">
      <div className="tutorial-top">
        <div className="eyebrow">How it works · {index + 1}/{screens.length}</div>
        <button type="button" className="btn btn-ghost tutorial-skip" onClick={onDone}>
          Skip
        </button>
      </div>

      <div ref={trackRef} className="tutorial-track" onScroll={onScroll}>
        {screens.map((screen, i) => (
          <section key={screen.title} className="tutorial-slide card card-accent" aria-hidden={i !== index}>
            <div className="tutorial-number">{i + 1}</div>
            <h1>{screen.title}</h1>
            <p>{screen.text}</p>
          </section>
        ))}
      </div>

      <div className="tutorial-dots" aria-hidden="true">
        {screens.map((screen, i) => (
          <span key={screen.title} className={i === index ? 'on' : ''} />
        ))}
      </div>

      <button type="button" className="btn btn-block" onClick={() => (last ? onDone() : goTo(index + 1))}>
        {last ? 'Start the case' : 'Next'}
      </button>
    </div>
  )
}
