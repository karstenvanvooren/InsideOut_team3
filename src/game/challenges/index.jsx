// All challenge types. story.json → locations[].challenges[].type picks one.
import './challenges.css'
import Catch from './Catch.jsx'
import { ChallengeProvider } from './ChallengeFrame.jsx'
import Choice from './Choice.jsx'
import Count from './Count.jsx'
import Letters from './Letters.jsx'
import Memory from './Memory.jsx'
import Puzzle from './Puzzle.jsx'
import ScanHidden from './ScanHidden.jsx'
import SelectReal from './SelectReal.jsx'
import TypeAnswer from './TypeAnswer.jsx'

const types = {
  choice: Choice, // Sint-Carolus: ask inside / oldest book
  memory: Memory, // Plantin-Moretus: easy + hard
  letters: Letters, // MoMu: find the word
  type: TypeAnswer, // MoMu: use the word · Bourla: name the statue
  count: Count, // Bourla: count the heads
  catch: Catch, // Maagdenhuis: catch the right utensils
  puzzle: Puzzle, // Maagdenhuis: puzzle the picture
  scan: ScanHidden, // KMSKA: scan the hidden fragments
  select: SelectReal, // KMSKA: which fragments are real
}

/** Full-screen challenge. onSolve runs after the short "Well done!" moment. */
export default function Challenge({ location, challenge, number, total, onClose, onSolve }) {
  const Type = types[challenge?.type]
  if (!Type) return null
  return (
    <ChallengeProvider key={challenge.id} location={location} challenge={challenge} number={number} total={total} onSolve={onSolve}>
      <Type onClose={onClose} />
    </ChallengeProvider>
  )
}
