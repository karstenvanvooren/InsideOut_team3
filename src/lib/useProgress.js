import { useEffect, useMemo, useState } from 'react'
import {
  deriveProgress,
  loadProgress,
  markHookFound,
  resetProgress,
  subscribe,
  unlockFinale,
} from './progress.js'

/**
 * const { foundHooks, foundFragments, unlockedChapters, finaleUnlocked,
 *         isChapterUnlocked, markHookFound, unlockFinale, reset } = useProgress()
 */
export function useProgress() {
  const [raw, setRaw] = useState(loadProgress)

  useEffect(() => subscribe(() => setRaw(loadProgress())), [])

  return useMemo(() => {
    const derived = deriveProgress(raw)
    return {
      ...derived,
      isChapterUnlocked: (id) => derived.unlockedChapters.includes(id),
      isFragmentFound: (id) => derived.foundFragments.includes(id),
      markHookFound,
      unlockFinale,
      reset: resetProgress,
    }
  }, [raw])
}
