import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getHooks, getLocation } from '../lib/story.js'
import {
  arriveAtLocation,
  collectHook,
  completeChallenge,
  finishIntro,
  loadGame,
  nextLocation,
  recordRiddleWrong,
  resetGame,
  solveRiddle,
  subscribeGame,
  unlockStart,
} from './gameState.js'

const GameContext = createContext(null)

/** Makes the game state available everywhere via useGame(). */
export function GameProvider({ children }) {
  const [game, setGame] = useState(loadGame)

  useEffect(() => subscribeGame(() => setGame(loadGame())), [])

  const value = useMemo(() => {
    const hooksCollected = Object.keys(game.collectedHooks).length
    return {
      ...game,
      location: getLocation(game.locationIndex),
      hooksCollected,
      hooksTotal: getHooks().length,
      hasCollection: hooksCollected + game.fragments.length > 0,
      isHookCollected: (id) => Boolean(game.collectedHooks[id]),
      unlockStart,
      finishIntro,
      recordRiddleWrong,
      solveRiddle,
      arriveAtLocation,
      completeChallenge,
      nextLocation,
      collectHook,
      resetGame,
    }
  }, [game])
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

/** const { phase, location, locationIndex, fragments, hooksCollected, solveRiddle, ... } = useGame() */
export function useGame() {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame() must be used inside <GameProvider>')
  return value
}
