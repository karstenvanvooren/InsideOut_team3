// Answer checking for location challenges.
// "  Peter-Paul Rúbens " matches "peter paul rubens".

export function normalizeAnswer(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // punctuation and dashes become spaces
    .trim()
    .replace(/\s+/g, ' ')
}

// Riddles are stricter about spelling but looser about form:
// "Het Plantin-Moretus" matches "plantinmoretus".
const RIDDLE_IGNORED_WORDS = new Set(['de', 'het', 'the'])

export function normalizeRiddleAnswer(text) {
  return normalizeAnswer(text)
    .split(' ')
    .filter((word) => !RIDDLE_IGNORED_WORDS.has(word))
    .join('')
}

export function isCorrectRiddleAnswer(input, answers = []) {
  const given = normalizeRiddleAnswer(input)
  if (!given) return false
  return answers.some((answer) => normalizeRiddleAnswer(answer) === given)
}

export function isCorrectAnswer(input, answers = []) {
  const given = normalizeAnswer(input)
  if (!given) return false
  return answers.some((answer) => normalizeAnswer(answer) === given)
}
