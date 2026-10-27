import { Link, useLocation, useParams } from 'react-router-dom'
import FragmentViewer from '../components/FragmentViewer.jsx'
import { getChapter, getChapterFragments, getNextHooks } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'
import NotFound from './NotFound.jsx'

export default function Chapter() {
  const { id } = useParams()
  const { state } = useLocation()
  const { isChapterUnlocked, completedHooks, finaleAvailable, finaleUnlocked } = useProgress()
  const chapter = getChapter(id)

  if (!chapter) return <NotFound />

  if (!isChapterUnlocked(chapter.id)) {
    return (
      <div className="page stack center">
        <div className="eyebrow">Locked</div>
        <h1>This chapter is still sealed</h1>
        <p className="muted">
          {chapter.isFinale
            ? 'The last page only opens in front of the artwork.'
            : 'Find its trace in the city, prove you’re there and solve the challenge to open it.'}
        </p>
        <Link to={chapter.isFinale ? '/finale' : '/'} className="btn btn-block">
          {chapter.isFinale ? 'Go to the finale' : 'Back to my clue'}
        </Link>
      </div>
    )
  }

  const fragments = getChapterFragments(chapter.id)
  const nextHooks = getNextHooks(chapter.id)

  return (
    <article className="page stack">
      {state?.isNew && <div className="toast">Chapter unlocked · {fragments.length} fragments added</div>}

      <header>
        <div className="eyebrow">{chapter.isFinale ? 'Final chapter' : 'Chapter'}</div>
        <h1>{chapter.title}</h1>
        <p>{chapter.intro}</p>
      </header>

      {fragments.map((fragment) => (
        <FragmentViewer key={fragment.id} fragment={fragment} />
      ))}

      <section className="card card-accent">
        <div className="eyebrow">{chapter.isFinale ? 'Case closed' : 'Next clue'}</div>
        <p>{chapter.clue}</p>

        {nextHooks.length > 0 && (
          <ul className="hook-list">
            {nextHooks.map((hook) => {
              const done = completedHooks.includes(hook.id)
              return (
                <li key={hook.id}>
                  <span>{done ? hook.label : 'Unknown trace'}</span>
                  <span className={`badge ${done ? 'badge-found' : ''}`}>{done ? 'solved' : 'to find'}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {chapter.isFinale || finaleUnlocked ? (
        <Link to="/share" className="btn btn-block">
          Get your solved case card
        </Link>
      ) : (
        finaleAvailable &&
        nextHooks.length === 0 && (
          <Link to="/finale" className="btn btn-block">
            Go to the museum
          </Link>
        )
      )}

      <Link to="/collection" className="btn btn-ghost btn-block">
        View collection
      </Link>
    </article>
  )
}
