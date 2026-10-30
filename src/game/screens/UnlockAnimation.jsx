import { useEffect, useRef } from 'react'
import { LockIcon } from '../../components/ui/icons.jsx'

const DURATION_MS = 1800

/** Short "the case is open" moment after a valid start scan. Calls onDone() afterwards. */
export default function UnlockAnimation({ onDone }) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  // One timer for the whole animation, even if the parent re-renders meanwhile
  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="unlock theme-dark" role="status">
      <div className="unlock-burst" aria-hidden="true" />
      <LockIcon className="unlock-lock" />
      <h1 className="unlock-title">The case is open</h1>
    </div>
  )
}
