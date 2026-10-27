import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page stack center">
      <div className="eyebrow">404</div>
      <h1>Dead end</h1>
      <p className="muted">This page isn’t part of the story.</p>
      <Link to="/" className="btn btn-block">
        Back home
      </Link>
    </div>
  )
}
