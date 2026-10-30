import { useEffect, useMemo, useRef } from 'react'

/**
 * Shared plumbing for a full-screen game screen (map + top banner + bottom sheet):
 * no page scroll underneath, dev button moved aside, map credits kept above the sheet.
 * const { screenRef, topRef, sheetRef, overlayRefs } = useGameScreen()
 * Put screenRef on the root (.nav), topRef on the banner area, sheetRef on the sheet,
 * and pass overlayRefs to <GameMap> so its off-screen pointer stays clear of both.
 */
export function useGameScreen() {
  const screenRef = useRef(null)
  const topRef = useRef(null)
  const sheetRef = useRef(null)
  const overlayRefs = useMemo(() => ({ top: topRef, sheet: sheetRef }), [])

  useEffect(() => {
    document.body.classList.add('game-fullscreen')
    return () => document.body.classList.remove('game-fullscreen')
  }, [])

  useEffect(() => {
    const observer = new ResizeObserver(() =>
      screenRef.current?.style.setProperty('--sheet-height', `${sheetRef.current?.offsetHeight ?? 0}px`),
    )
    if (sheetRef.current) observer.observe(sheetRef.current)
    return () => observer.disconnect()
  }, [])

  return { screenRef, topRef, sheetRef, overlayRefs }
}
