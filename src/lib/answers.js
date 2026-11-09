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

// Riddles are forgiving: capitals, accents, dashes, spaces and small words don't
// matter ("Het Plantin-Moretus" = "plantinmoretus", "St. Carolus" = "carolus"), and
// a small typo is fine too (a letter forgotten, swapped or wrong), see TYPOS_ALLOWED.
const RIDDLE_IGNORED_WORDS = new Set(['de', 'het', 'een', 'the', 'a', 'an', 'sint', 'st', 'saint', 'sainte'])

export function normalizeRiddleAnswer(text) {
  return normalizeAnswer(text)
    .split(' ')
    .filter((word) => !RIDDLE_IGNORED_WORDS.has(word))
    .join('')
}

/** How many typos an answer of this length may have: short names must be exact. */
export function TYPOS_ALLOWED(length) {
  if (length < 5) return 0
  if (length < 10) return 1
  return 2
}

/** Edit distance: inserted, deleted, changed or swapped letters (Damerau–Levenshtein). */
export function typoDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

export function isCorrectRiddleAnswer(input, answers = []) {
  const given = normalizeRiddleAnswer(input)
  if (!given) return false
  return answers.some((answer) => {
    const right = normalizeRiddleAnswer(answer)
    if (right === given) return true
    return Math.abs(right.length - given.length) <= 2 && typoDistance(right, given) <= TYPOS_ALLOWED(right.length)
  })
}

export function isCorrectAnswer(input, answers = []) {
  const given = normalizeAnswer(input)
  if (!given) return false
  return answers.some((answer) => normalizeAnswer(answer) === given)
}
