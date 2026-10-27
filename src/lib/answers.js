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

export function isCorrectAnswer(input, answers = []) {
  const given = normalizeAnswer(input)
  if (!given) return false
  return answers.some((answer) => normalizeAnswer(answer) === given)
}
