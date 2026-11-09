// Generates the fragment pictures in public/fragments/ (run: node scripts/generate-fragments.js).
//
// STAND-IN until we have our own photo of the artwork: a fabric page in the style of
// Louise Bourgeois' "Ode à l'oubli" (a book of fabric collages: stripes, checks,
// grids, circles, stitched pieces). It is NOT a copy of a real page.
//   artwork.svg        the whole stand-in page (shown in the finale)
//   real-1 … real-6    torn pieces cut out of that page  → "real": true in story.json
//   fake-1 … fake-6    pieces in the same style that don't belong to it
// When we have the photo: cut the real pieces from the photo, make the fakes look
// like it, and keep the same file names (or change "src" in story.json).
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../public/fragments/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const P = {
  navy: '#1c2430',
  burgundy: '#4b1e23',
  olive: '#6b6f4e',
  cream: '#e6e0d6',
  rose: '#c29095',
  blue: '#647c9f',
  sage: '#929677',
  linen: '#efe9df',
}

// ---------- Fabrics (SVG patterns in page coordinates) ----------

function fabric(id, kind, base, thread, angle = 0) {
  const t = angle ? ` patternTransform="rotate(${angle})"` : ''
  const bg = `<rect width="100%" height="100%" fill="${base}"/>`
  switch (kind) {
    case 'stripes':
      return `<pattern id="${id}" width="22" height="22" patternUnits="userSpaceOnUse"${t}>${bg}<rect width="9" height="22" fill="${thread}"/><rect x="13" width="2" height="22" fill="${thread}" opacity=".5"/></pattern>`
    case 'gingham':
      return `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse"${t}>${bg}<rect width="13" height="26" fill="${thread}" opacity=".45"/><rect width="26" height="13" fill="${thread}" opacity=".45"/></pattern>`
    case 'grid':
      return `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"${t}>${bg}<path d="M0 1H18M1 0V18" stroke="${thread}" stroke-width="2" fill="none"/></pattern>`
    case 'dots':
      return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"${t}>${bg}<circle cx="8" cy="8" r="3" fill="${thread}"/></pattern>`
    case 'weave':
      return `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"${t}>${bg}<path d="M2 5H10M2 8H10M2 11H10M14 14V22M17 14V22M20 14V22" stroke="${thread}" stroke-width="1.6"/><path d="M14 2V10M17 2V10M20 2V10M2 17H10M2 20H10M2 23H10" stroke="${thread}" stroke-width="1.6" opacity=".55"/></pattern>`
    default: // linen
      return `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse">${bg}<path d="M0 3H6" stroke="${thread}" stroke-width=".6" opacity=".35"/><path d="M3 0V6" stroke="${thread}" stroke-width=".5" opacity=".2"/></pattern>`
  }
}

const rings = (cx, cy, r, base, thread, step = 16) => {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${base}"/>`
  for (let k = step; k < r; k += step) s += `<circle cx="${cx}" cy="${cy}" r="${k}" fill="none" stroke="${thread}" stroke-width="5"/>`
  return s
}

const stitch = (d, colour = P.navy) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.4" stroke-dasharray="8 6" stroke-linecap="round"/>`
const rectPath = (x, y, w, h) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`
const inset = (x, y, w, h, i = 10) => rectPath(x + i, y + i, w - 2 * i, h - 2 * i)

/**
 * A fabric page. `v` = the variant: the real page, or a "wrong" one for the fakes
 * (same composition, other fabrics/colours/directions).
 */
function page(v) {
  const defs = [
    fabric('linen', 'linen', P.linen, P.navy),
    fabric('a', 'stripes', v.a[0], v.a[1], v.a[2] ?? 0),
    fabric('b', 'gingham', v.b[0], v.b[1], v.b[2] ?? 0),
    fabric('d', 'grid', v.d[0], v.d[1], v.d[2] ?? 0),
    fabric('f', 'dots', v.f[0], v.f[1]),
    fabric('g', 'weave', v.g[0], v.g[1]),
  ].join('')
  const body = [
    `<rect width="600" height="800" fill="url(#linen)"/>`,
    // A: striped piece, top left
    `<path d="${rectPath(40, 40, 262, 236)}" fill="url(#a)"/>`,
    stitch(inset(40, 40, 262, 236)),
    // B: check, top right, slightly overlapping
    `<path d="M318 30H566V338H318Z" fill="url(#b)" transform="rotate(${v.tilt} 442 184)"/>`,
    stitch(`M330 42H554V326H330Z`, v.stitchB),
    // C: circles, middle left (a round piece on a square of cloth)
    `<path d="${rectPath(40, 296, 262, 262)}" fill="${v.cBase}"/>`,
    rings(171, 427, 112, v.c[0], v.c[1]),
    stitch(`M171 309A118 118 0 1 1 170.9 309`, v.c[1]),
    // D: grid, middle right
    `<path d="${rectPath(320, 360, 240, 198)}" fill="url(#d)"/>`,
    stitch(inset(320, 360, 240, 198, 12)),
    // E: dark band with rows of running stitches (like writing)
    `<path d="${rectPath(40, 576, 520, 92)}" fill="${v.e[0]}"/>`,
    stitch('M64 602H536', v.e[1]),
    stitch('M64 622H470', v.e[1]),
    stitch('M64 642H510', v.e[1]),
    // F + G: small pieces at the bottom
    `<path d="${rectPath(40, 686, 254, 76)}" fill="url(#f)"/>`,
    `<path d="${rectPath(312, 686, 248, 76)}" fill="url(#g)"/>`,
    stitch(inset(40, 686, 254, 76, 8)),
    stitch(inset(312, 686, 248, 76, 8)),
    // a few buttons / knots
    `<circle cx="300" cy="286" r="9" fill="${v.button}"/><circle cx="300" cy="286" r="3" fill="${P.linen}"/>`,
    `<circle cx="306" cy="570" r="7" fill="${v.button}"/>`,
  ].join('')
  return { defs, body }
}

const REAL = {
  a: [P.cream, P.burgundy],
  b: [P.cream, P.rose],
  c: [P.blue, P.cream],
  cBase: P.sage,
  d: [P.cream, P.sage],
  e: [P.navy, P.cream],
  f: [P.rose, P.cream],
  g: [P.sage, P.cream],
  tilt: 2.5,
  stitchB: P.burgundy,
  button: P.burgundy,
}

// The fakes: same kind of cloth, but something is off (colour, direction, size)
const FAKE = {
  a: [P.cream, P.blue, 90], // stripes the other way, in blue
  b: [P.cream, P.olive], // olive check instead of rose
  c: [P.rose, P.cream], // pink circles instead of blue
  cBase: P.blue,
  d: [P.rose, P.burgundy], // grid on pink
  e: [P.burgundy, P.cream], // burgundy band
  f: [P.sage, P.navy], // navy dots on green
  g: [P.blue, P.cream],
  tilt: -4,
  stitchB: P.navy,
  button: P.olive,
}

// ---------- Torn pieces ----------

// A deterministic wobbly outline around a box (torn cloth)
function tornOutline([x, y, w, h], seed) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280 - 0.5)
  const pts = []
  const step = 22
  for (let px = x; px < x + w; px += step) pts.push([px, y + rnd() * 14])
  for (let py = y; py < y + h; py += step) pts.push([x + w + rnd() * 14, py])
  for (let px = x + w; px > x; px -= step) pts.push([px, y + h + rnd() * 14])
  for (let py = y + h; py > y; py -= step) pts.push([x + rnd() * 14, py])
  return 'M' + pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join('L') + 'Z'
}

// Where the pieces are cut from the page: [x, y, w, h]
const CUTS = [
  [70, 70, 220, 190], // stripes + stitches
  [340, 120, 200, 200], // check
  [80, 330, 200, 200], // circles
  [300, 380, 230, 170], // grid + edge of the circles cloth
  [60, 560, 300, 130], // dark band with stitch "writing"
  [250, 650, 300, 120], // dots + weave
]

function pieceSvg(v, cut, seed) {
  const { defs, body } = page(v)
  const [x, y, w, h] = cut
  const pad = 12
  const outline = tornOutline(cut, seed)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - pad} ${y - pad} ${w + 2 * pad} ${h + 2 * pad}" width="${w + 2 * pad}" height="${h + 2 * pad}">
<defs>${defs}<clipPath id="cut"><path d="${outline}"/></clipPath>
<filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${P.navy}" flood-opacity=".25"/></filter></defs>
<g filter="url(#shadow)"><g clip-path="url(#cut)">${body}</g></g>
<path d="${outline}" fill="none" stroke="${P.cream}" stroke-width="2" opacity=".7"/>
</svg>
`
}

function write(name, svg) {
  writeFileSync(new URL(name, OUT), svg)
  console.log('✓ public/fragments/' + name)
}

// The whole stand-in page
{
  const { defs, body } = page(REAL)
  write(
    'artwork.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
<!-- Stand-in for the artwork (style of "Ode à l'oubli", not a copy). Replace with our own photo. -->
<defs>${defs}</defs>${body}
</svg>
`,
  )
}

// Real pieces come from the real page; the fakes from the "wrong" page.
// The fakes use other cut positions than their real twins, so they can't be matched by shape.
const FAKE_CUTS = [CUTS[2], CUTS[4], CUTS[0], CUTS[5], CUTS[1], CUTS[3]]
CUTS.forEach((cut, i) => write(`real-${i + 1}.svg`, pieceSvg(REAL, cut, 17 + i * 31)))
FAKE_CUTS.forEach((cut, i) => write(`fake-${i + 1}.svg`, pieceSvg(FAKE, cut, 301 + i * 47)))
