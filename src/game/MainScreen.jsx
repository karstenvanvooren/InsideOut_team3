// The main screen after the start: the map is always there, and the current
// phase decides which pop-up is open on top of it.
//
//   hooksIntro / tutorial / riddleIntro → step pop-ups (can't be closed)
//   riddle            → riddle pop-up (can be minimised to a pill; no destination on the map yet)
//   navigating        → no pop-up: route + banner + info strip ("?" re-opens the solved riddle)
//   atLocation        → arrived pop-up (what the challenge is) → "Start challenge" → full-screen challenge
//                       (at the last location, the KMSKA, first the museum ticket: TicketMoment)
//   fragmentUnlocked  → fragment pop-up → "Continue" → challenge 2 here, or the riddle for the next location
//   finale            → the finale screen: the artwork completes itself, the reveal, the collection
import { lazy, Suspense, useEffect, useState } from 'react'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import onboarding from '../data/onboarding.json'
import { CLOSE_POPUPS_EVENT } from '../dev/devSettings.js'
import { getLocations, getStart, isLastLocation } from '../lib/story.js'
import { patterns, vibrate } from '../lib/vibrate.js'
import { useGame } from './GameProvider.jsx'
import Challenge from './challenges/index.jsx'
import { ArrivedPopup } from './popups/LocationPopups.jsx'
import { FragmentReward, TicketMoment } from './popups/BigMoments.jsx'
import { getTicket, ticketCode, unlockTicket } from '../lib/ticket.js'
import FinaleScreen from './screens/FinaleScreen.jsx'
import { SolvedRiddle } from './popups/RiddlePopup.jsx'
import RiddleChat from './popups/RiddleChat.jsx'
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
  finale: null, // its own screen (FinaleScreen)
}

export default function MainScreen() {
  const game = useGame()
  const { phase, phaseSince, location, locationIndex, riddle, challenge, challengeIndex, challengeTotal } = game
  const markers = useHookMarkers()
  const [minimised, setMinimised] = useState(false)
  const [showSolvedRiddle, setShowSolvedRiddle] = useState(false)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const popup = popupFor[phase] ?? null
  // The museum ticket: at the last location, before its first challenge (once per game)
  const [ticket, setTicket] = useState(() => getTicket(game.startedAt))
  const ticketDue = phase === 'atLocation' && isLastLocation(locationIndex) && challengeIndex === 0 && !ticket

  // Every new phase (or location) opens its pop-up fresh
  useEffect(() => {
    setMinimised(false)
    setShowSolvedRiddle(false)
    setChallengeOpen(false)
  }, [phase, phaseSince, locationIndex, challengeIndex])

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
    challenge: `Challenge ${challengeIndex + 1}/${challengeTotal}`,
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

      {isOpen('riddle') && (
        <RiddleChat
          key={locationIndex}
          location={location}
          index={locationIndex}
          wrong={riddle.wrong}
          onWrong={game.recordRiddleWrong}
          onSolve={game.solveRiddle}
        />
      )}

      <BottomSheet open={showSolvedRiddle && phase === 'navigating'} onClose={() => setShowSolvedRiddle(false)} label="The riddle">
        <SolvedRiddle location={location} index={locationIndex} />
      </BottomSheet>

      {ticketDue && !minimised && (
        <TicketMoment
          ticket={{ at: Date.now(), code: ticketCode(game.startedAt) }}
          place={location.name}
          onContinue={() => {
            vibrate(patterns.tap)
            setTicket(unlockTicket(game.startedAt))
          }}
        />
      )}

      <BottomSheet open={isOpen('challenge') && !challengeOpen && !ticketDue} dim label="You’ve arrived">
        <ArrivedPopup
          key={`${locationIndex}-${challengeIndex}`}
          location={location}
          index={locationIndex}
          challenge={challenge}
          number={challengeIndex + 1}
          total={challengeTotal}
          onOpenChallenge={() => setChallengeOpen(true)}
        />
      </BottomSheet>

      {challengeOpen && phase === 'atLocation' && (
        <Challenge
          location={location}
          challenge={challenge}
          number={challengeIndex + 1}
          total={challengeTotal}
          onClose={() => setChallengeOpen(false)}
          onSolve={game.completeChallenge}
        />
      )}

      {isOpen('fragment') && game.lastFragments?.length > 0 && (
        <FragmentReward
          key={game.lastFragments.join()}
          fragmentIds={game.lastFragments}
          found={game.fragments.length}
          nextLabel={
            challengeIndex + 1 < challengeTotal ? 'Next challenge' : isLastLocation(locationIndex) ? 'To the finale' : 'Next riddle'
          }
          onContinue={() => {
            vibrate(patterns.tap)
            game.continueAfterFragment()
          }}
        />
      )}

      {phase === 'finale' && <FinaleScreen key={phaseSince} />}

      {minimised && popup && (
        <button type="button" className="popup-pill" onClick={() => setMinimised(false)}>
          <span className="popup-pill-dot" aria-hidden="true" />
          {pillLabel}
        </button>
      )}
    </>
  )
}
