// Renders any fragment from story.json, based on its "type".
// To add a new type: add a component below and register it in `renderers`.

function TextFragment({ fragment }) {
  return <div className="fragment-text">{fragment.content}</div>
}

function DocumentFragment({ fragment }) {
  return (
    <div className="fragment-document">
      {fragment.src && <img src={fragment.src} alt={fragment.title} />}
      {fragment.content}
    </div>
  )
}

function ImageFragment({ fragment }) {
  return (
    <div className="fragment-image">
      <img src={fragment.src} alt={fragment.caption || fragment.title} loading="lazy" />
    </div>
  )
}

function AudioFragment({ fragment }) {
  return (
    <div className="fragment-audio">
      <audio controls preload="none" src={fragment.src}>
        Your browser can't play this audio.
      </audio>
      {fragment.content && <p className="muted">{fragment.content}</p>}
    </div>
  )
}

const renderers = {
  text: TextFragment,
  document: DocumentFragment,
  image: ImageFragment,
  audio: AudioFragment,
}

/**
 * Small visual of a fragment for cards (fragment unlocked, collection):
 * its picture if it has one, otherwise a paper / note / sound tile.
 */
export function FragmentThumb({ fragment, className = '' }) {
  const kind = fragment.src && fragment.type !== 'audio' ? 'picture' : fragment.type
  return (
    <div className={`fragment-thumb fragment-thumb-${kind} ${className}`} aria-hidden="true">
      {kind === 'picture' && <img src={fragment.src} alt="" loading="lazy" />}
      {(kind === 'text' || kind === 'document') && <span className="fragment-thumb-words">{fragment.content}</span>}
      {kind === 'audio' && (
        <span className="fragment-thumb-wave">
          {[8, 18, 12, 26, 16, 30, 14, 22, 10, 18, 8].map((h, i) => (
            <span key={i} style={{ height: h }} />
          ))}
        </span>
      )}
    </div>
  )
}

export default function FragmentViewer({ fragment, locked = false }) {
  if (locked) {
    return <div className="fragment-locked">??? — fragment not found yet</div>
  }

  const Renderer = renderers[fragment.type]
  const meta = fragment.meta ? Object.values(fragment.meta).join(' · ') : null

  return (
    <figure className="fragment">
      <div className="fragment-title">{fragment.title}</div>
      {Renderer ? <Renderer fragment={fragment} /> : <p className="muted">Unknown fragment type: {fragment.type}</p>}
      {(fragment.caption || meta) && (
        <figcaption className="fragment-caption">
          {fragment.caption}
          {meta && <div className="fragment-meta">{meta}</div>}
        </figcaption>
      )}
    </figure>
  )
}
