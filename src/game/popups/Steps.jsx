import { useRef, useState } from 'react'
import { Eyebrow, PrimaryButton } from '../../components/ui/basics.jsx'
import './steps.css'

/**
 * Swipeable steps inside a pop-up: title, short text, optional image, "Next"
 * and `doneLabel` at the end. Used for the hooks intro, the tutorial and the
 * riddle intro; all text comes from src/data/onboarding.json.
 */
export default function Steps({ eyebrow, steps, onDone, doneLabel = 'Start' }) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  const last = index >= steps.length - 1

  const goTo = (i) => {
    const track = trackRef.current
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
  }

  const onScroll = () => {
    const track = trackRef.current
    setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  return (
    <div className="stack intro-steps">
      <Eyebrow>
        {eyebrow} · {index + 1}/{steps.length}
      </Eyebrow>

      <div ref={trackRef} className="tutorial-track" onScroll={onScroll}>
        {steps.map((step, i) => (
          <section key={i} className="tutorial-slide" aria-hidden={i !== index}>
            {step.image ? <img src={step.image} alt="" /> : <div className="tutorial-number">{i + 1}</div>}
            <h2 className="sheet-title">{step.title}</h2>
            <p>{step.text}</p>
          </section>
        ))}
      </div>

      {steps.length > 1 && (
        <div className="tutorial-dots" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={i === index ? 'on' : ''} />
          ))}
        </div>
      )}

      <PrimaryButton onClick={() => (last ? onDone() : goTo(index + 1))}>{last ? doneLabel : 'Next'}</PrimaryButton>
    </div>
  )
}
