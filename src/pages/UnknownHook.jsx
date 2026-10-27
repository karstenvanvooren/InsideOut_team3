import { Link } from 'react-router-dom'

export default function UnknownHook({ id }) {
  return (
    <div className="page stack center">
      <div className="eyebrow">Trace “{id}”</div>
      <h1>This trace doesn’t exist</h1>
      <p className="muted">
        Maybe the code is damaged, or someone is leading you on a false trail. Try scanning it again, or look for another trace.
      </p>
      <Link to="/scan" className="btn btn-block">
        Scan again
      </Link>
      <Link to="/" className="btn btn-ghost btn-block">
        Back home
      </Link>
    </div>
  )
}
