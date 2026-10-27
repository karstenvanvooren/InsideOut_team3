import { useEffect, useMemo, useState } from 'react'
import {
  completeHook,
  deriveProgress,
  loadProgress,
  markHookScanned,
  markLocationVerified,
  recordWrongAnswer,
  resetProgress,
  subscribe,
  unlockFinale,
} from './progress.js'

/**
 * const { completedHooks, foundFragments, unlockedChapters, finaleUnlocked,
 *         hookStatus, isChapterUnlocked, completeHook, reset, ... } = useProgress()
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
      markHookScanned,
      markLocationVerified,
      recordWrongAnswer,
      completeHook,
      unlockFinale,
      reset: resetProgress,
    }
  }, [raw])
}
