import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { canvasToBlob, drawCaseCard } from '../lib/shareCard.js'
import { meta, totalFragments } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'

const FILE_NAME = 'inside-out-case.png'

export default function Share() {
  const canvasRef = useRef(null)
  const { finaleUnlocked, finaleAt, foundFragments } = useProgress()
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!finaleUnlocked || !canvasRef.current) return
    const date = new Date(finaleAt || Date.now()).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    drawCaseCard(canvasRef.current, {
      title: meta.title,
      tagline: meta.tagline,
      found: foundFragments.length,
      total: totalFragments(),
      date,
    })
  }, [finaleUnlocked, finaleAt, foundFragments.length])

  const download = (blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = FILE_NAME
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('Image downloaded.')
  }

  const share = async () => {
    setMessage('')
    try {
      const blob = await canvasToBlob(canvasRef.current)
      const file = new File([blob], FILE_NAME, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: meta.title, text: `I solved ${meta.title}. Can you?` })
      } else {
        download(blob)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setMessage('Sharing failed. Try again or take a screenshot.')
    }
  }

  if (!finaleUnlocked) {
    return (
      <div className="page stack center">
        <div className="eyebrow">Case card</div>
        <h1>Case not solved yet</h1>
        <p className="muted">Finish the finale in the museum to get your solved case card.</p>
        <Link to="/" className="btn btn-block">
          Back home
        </Link>
      </div>
    )
  }

  return (
    <div className="page stack">
      <header>
        <div className="eyebrow">Case card</div>
        <h1>You solved it</h1>
      </header>
      <canvas ref={canvasRef} className="share-canvas" aria-label="Your solved case card" />
      <button type="button" className="btn btn-block" onClick={share}>
        Share your case card
      </button>
      {message && <p className="muted center">{message}</p>}
    </div>
  )
}
