import { Link, useLocation, useParams } from 'react-router-dom'
import FragmentViewer from '../components/FragmentViewer.jsx'
import { getChapter, getChapterFragments, getHookForChapter, getNextHooks } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'
import NotFound from './NotFound.jsx'

export default function Chapter() {
  const { id } = useParams()
  const { state } = useLocation()
  const { isChapterUnlocked, foundHooks, finaleUnlocked } = useProgress()
  const chapter = getChapter(id)

  if (!chapter) return <NotFound />

  if (!isChapterUnlocked(chapter.id)) {
    const hook = getHookForChapter(chapter.id)
    return (
      <div className="page stack center">
        <div className="eyebrow">Locked</div>
        <h1>This chapter is still sealed</h1>
        <p className="muted">
          {chapter.isFinale
            ? 'The last page only opens in front of the artwork.'
            : `Find the trace${hook ? ` “${hook.label}”` : ''} somewhere in the city to open it.`}
        </p>
        {chapter.isFinale ? (
          <Link to="/finale" className="btn btn-block">
            Go to the finale
          </Link>
        ) : (
          <Link to="/scan" className="btn btn-block">
            Scan a trace
          </Link>
        )}
      </div>
    )
  }

  const fragments = getChapterFragments(chapter.id)
  const nextHooks = getNextHooks(chapter.id)

  return (
    <article className="page stack">
      {state?.isNew && <div className="toast">New trace found · {fragments.length} fragments added</div>}

      <header>
        <div className="eyebrow">{chapter.isFinale ? 'Final chapter' : 'Chapter'}</div>
        <h1>{chapter.title}</h1>
        <p>{chapter.intro}</p>
      </header>

      {fragments.map((fragment) => (
        <FragmentViewer key={fragment.id} fragment={fragment} />
      ))}

      <section className="card card-accent">
        <div className="eyebrow">Clue</div>
        <p>{chapter.clue}</p>

        {nextHooks.length > 0 && (
          <>
            <div className="eyebrow">Look for</div>
            <ul className="hook-list">
              {nextHooks.map((hook) => {
                const found = foundHooks.includes(hook.id)
                return (
                  <li key={hook.id}>
                    <span>{found ? hook.label : '???'}</span>
                    <span className={`badge ${found ? 'badge-found' : ''}`}>{found ? 'found' : 'not found'}</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {chapter.isFinale || finaleUnlocked ? (
        <Link to="/share" className="btn btn-block">
          Get your solved case card
        </Link>
      ) : (
        nextHooks.length === 0 && (
          <Link to="/finale" className="btn btn-block">
            Go to the finale
          </Link>
        )
      )}

      <Link to="/collection" className="btn btn-ghost btn-block">
        View collection
      </Link>
    </article>
  )
}
