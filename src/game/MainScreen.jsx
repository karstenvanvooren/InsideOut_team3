// The main screen after the start: the map is always there, and the current
// phase decides which pop-up is open on top of it.
//
//   hooksIntro / tutorial / riddleIntro → step pop-ups (can't be closed)
//   riddle            → riddle pop-up (can be minimised to a pill; no destination on the map yet)
//   navigating        → no pop-up: route + banner + info strip ("?" re-opens the solved riddle)
//   atLocation        → arrived pop-up → "Solve challenge" → full-screen challenge
//   fragmentUnlocked  → fragment pop-up → "Continue" → riddle for the next location
//   finale            → finale placeholder pop-up
import { lazy, Suspense, useEffect, useState } from 'react'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import onboarding from '../data/onboarding.json'
import { CLOSE_POPUPS_EVENT } from '../dev/devSettings.js'
import { getLocations, getStart, isLastLocation } from '../lib/story.js'
import { patterns, vibrate } from '../lib/vibrate.js'
import { useGame } from './GameProvider.jsx'
import { ArrivedPopup, ChallengeScreen, FinalePopup, FragmentPopup } from './popups/LocationPopups.jsx'
import RiddlePopup, { SolvedRiddle } from './popups/RiddlePopup.jsx'
import Steps from './popups/Steps.jsx'
import { useHookMarkers } from './screens/useHookMarkers.js'

const GameWorld = lazy(() => import('./GameWorld.jsx'))

const intros = [
  { phase: 'hooksIntro', eyebrow: 'Hooks', doneLabel: 'Next' },
  { phase: 'tutorial', eyebrow: 'How it works', doneLabel: 'Next' },
  { phase: 'riddleIntro', eyebrow: 'Riddles', doneLabel: 'Start' },
]

// Which pop-up belongs to which phase (null = just the map)
const popupFor = {
  hooksIntro: 'intro',
  tutorial: 'intro',
  riddleIntro: 'intro',
  riddle: 'riddle',
  navigating: null,
  atLocation: 'challenge',
  fragmentUnlocked: 'fragment',
  finale: 'finale',
}

export default function MainScreen() {
  const game = useGame()
  const { phase, phaseSince, location, locationIndex, riddle } = game
  const markers = useHookMarkers()
  const [minimised, setMinimised] = useState(false)
  const [showSolvedRiddle, setShowSolvedRiddle] = useState(false)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const popup = popupFor[phase] ?? null

  // Every new phase (or location) opens its pop-up fresh
  useEffect(() => {
    setMinimised(false)
    setShowSolvedRiddle(false)
    setChallengeOpen(false)
  }, [phase, phaseSince, locationIndex])

  // Dev panel: "Close all pop-ups" (they come back as a pill, or with the next phase)
  useEffect(() => {
    const closeAll = () => {
      setMinimised(true)
      setShowSolvedRiddle(false)
      setChallengeOpen(false)
    }
    window.addEventListener(CLOSE_POPUPS_EVENT, closeAll)
    return () => window.removeEventListener(CLOSE_POPUPS_EVENT, closeAll)
  }, [])

  const isOpen = (name) => popup === name && !minimised

  // The destination only appears once its riddle is solved
  const showDestination = ['navigating', 'atLocation', 'fragmentUnlocked'].includes(phase)
  const mapMode = phase === 'navigating' ? 'navigating' : showDestination ? 'arrived' : 'free'

  const pillLabel = {
    intro: 'Continue the intro',
    riddle: `Riddle ${locationIndex + 1}/${getLocations().length}`,
    challenge: 'Challenge',
    fragment: 'Fragment unlocked',
    finale: 'Finale',
  }[popup]

  return (
    <>
      <Suspense fallback={<div className="nav" />}>
        <GameWorld
          destination={showDestination ? location : null}
          mode={mapMode}
          center={getStart()}
          onArrive={game.arriveAtLocation}
          onShowRiddle={() => setShowSolvedRiddle(true)}
          markers={markers}
        />
      </Suspense>

      {intros.map((intro) => (
        <BottomSheet key={intro.phase} open={phase === intro.phase && !minimised} label={intro.eyebrow}>
          <Steps
            eyebrow={intro.eyebrow}
            doneLabel={intro.doneLabel}
            steps={onboarding[intro.phase].steps}
            onDone={() => game.finishIntro(intro.phase)}
          />
        </BottomSheet>
      ))}

      <BottomSheet open={isOpen('riddle')} label="Riddle">
        <RiddlePopup
          key={locationIndex}
          location={location}
          index={locationIndex}
          wrong={riddle.wrong}
          onWrong={game.recordRiddleWrong}
          onSolve={game.solveRiddle}
          onMinimise={() => setMinimised(true)}
        />
      </BottomSheet>

      <BottomSheet open={showSolvedRiddle && phase === 'navigating'} onClose={() => setShowSolvedRiddle(false)} label="The riddle">
        <SolvedRiddle location={location} index={locationIndex} />
      </BottomSheet>

      <BottomSheet open={isOpen('challenge') && !challengeOpen} dim label="You’ve arrived">
        <ArrivedPopup location={location} index={locationIndex} onOpenChallenge={() => setChallengeOpen(true)} />
      </BottomSheet>

      {challengeOpen && phase === 'atLocation' && (
        <ChallengeScreen
          location={location}
          onClose={() => setChallengeOpen(false)}
          onSolve={() => {
            vibrate(patterns.unlock)
            game.completeChallenge()
          }}
        />
      )}

      <BottomSheet open={isOpen('fragment')} dim centered label="Fragment unlocked">
        <FragmentPopup
          location={location}
          found={game.fragments.length}
          last={isLastLocation(locationIndex)}
          onContinue={game.nextLocation}
        />
      </BottomSheet>

      <BottomSheet open={isOpen('finale')} dim label="Finale">
        <FinalePopup />
      </BottomSheet>

      {minimised && popup && (
        <button type="button" className="popup-pill" onClick={() => setMinimised(false)}>
          <span className="popup-pill-dot" aria-hidden="true" />
          {pillLabel}
        </button>
      )}
    </>
  )
}
