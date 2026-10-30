import { useMemo } from 'react'
import { config } from '../../config.js'
import { getHooks } from '../../lib/story.js'
import { useGame } from '../GameProvider.jsx'

/** Hook markers for the map, or null when config.showHooksOnMap is off (the default). */
export function useHookMarkers() {
  const { collectedHooks } = useGame()
  return useMemo(
    () =>
      config.showHooksOnMap
        ? getHooks().map((hook) => ({ id: hook.id, lat: hook.lat, lng: hook.lng, done: Boolean(collectedHooks[hook.id]) }))
        : null,
    [collectedHooks],
  )
}
