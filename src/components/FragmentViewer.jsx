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
