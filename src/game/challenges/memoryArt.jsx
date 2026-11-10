// Illustrations for the memory cards and the catch game, in the style of the artwork: Louise Bourgeois'
// "Ode à l'oubli" is a book of fabric collages (stripes, checks, grids, circles,
// stitched pieces). Every card is a little textile collage: a fabric background,
// the object cut out of another fabric, and a stitched line around it.
// Colours come from the palette tokens. Unknown names get a plain patchwork.
import { useId } from 'react'

const C = {
  navy: 'var(--navy)',
  burgundy: 'var(--burgundy)',
  olive: 'var(--olive)',
  cream: 'var(--cream)',
  rose: 'var(--rose)',
  blue: 'var(--blue)',
  sage: 'var(--sage)',
  white: 'var(--white)',
}

/** Textile patterns: <pattern> elements with an id, coloured with a base + a thread colour. */
function Fabric({ id, kind, base, thread }) {
  const bg = <rect width="100%" height="100%" style={{ fill: base }} />
  const line = { stroke: thread, fill: 'none' }
  switch (kind) {
    case 'stripes': // vertical stripes
      return (
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          {bg}
          <rect x="0" width="4" height="10" style={{ fill: thread }} />
        </pattern>
      )
    case 'pinstripe':
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          {bg}
          <path d="M3 0V6" style={{ ...line, strokeWidth: 1 }} />
        </pattern>
      )
    case 'diagonal':
      return (
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          {bg}
          <rect width="3" height="8" style={{ fill: thread }} />
        </pattern>
      )
    case 'gingham': // checks: two crossing semi-transparent bands
      return (
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          {bg}
          <rect width="6" height="12" style={{ fill: thread, opacity: 0.5 }} />
          <rect width="12" height="6" style={{ fill: thread, opacity: 0.5 }} />
        </pattern>
      )
    case 'grid': // woven grid of thin threads
      return (
        <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse">
          {bg}
          <path d="M0 .5H9M.5 0V9" style={{ ...line, strokeWidth: 1 }} />
        </pattern>
      )
    case 'dots':
      return (
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          {bg}
          <circle cx="4" cy="4" r="1.6" style={{ fill: thread }} />
        </pattern>
      )
    case 'rings': // concentric circles
      return (
        <pattern id={id} width="100" height="100" patternUnits="userSpaceOnUse">
          {bg}
          {[8, 16, 24, 32, 40, 48, 56, 64].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} style={{ ...line, strokeWidth: 2.4 }} />
          ))}
        </pattern>
      )
    case 'weave': // basket weave
      return (
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          {bg}
          <path d="M1 3H5M1 1.5H5M1 4.5H5M7 7V11M8.5 7V11M10 7V11" style={{ ...line, strokeWidth: 0.9 }} />
          <path d="M7 1V5M8.5 1V5M10 1V5M1 9H5M1 7.5H5M1 10.5H5" style={{ ...line, strokeWidth: 0.9, opacity: 0.55 }} />
        </pattern>
      )
    default: // plain linen
      return (
        <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse">
          {bg}
          <path d="M0 2H4" style={{ ...line, strokeWidth: 0.5, opacity: 0.35 }} />
        </pattern>
      )
  }
}

// The objects: a background fabric, the fabric the object is cut from, and its shape.
// Shapes are drawn on a 100 × 100 square; `paint` gets the fill of the object fabric.
const OBJECTS = {
  'Printing press': {
    bg: ['stripes', C.cream, C.blue],
    piece: ['gingham', C.rose, C.burgundy],
    shape: (
      <>
        <path d="M24 30H32V82H24ZM68 30H76V82H68Z" />
        <path d="M18 24H82V34H18Z" />
        <path d="M46 34H54V52H46Z" />
        <path d="M30 52H70V62H30Z" />
        <path d="M20 80H80V88H20Z" />
      </>
    ),
  },
  'Lead letters': {
    bg: ['grid', C.cream, C.navy],
    piece: ['pinstripe', C.sage, C.navy],
    shape: (
      <>
        <path d="M14 30H44V70H14Z" />
        <path d="M56 30H86V70H56Z" />
      </>
    ),
    detail: (
      <>
        <path d="M21 62 29 38 37 62M24 54H34" />
        <path d="M64 38V62M64 38H75Q80 38 80 44 80 50 75 50H64" />
      </>
    ),
  },
  'Ink ball': {
    bg: ['diagonal', C.cream, C.sage],
    piece: ['rings', C.navy, C.blue],
    shape: (
      <>
        <path d="M20 58Q20 26 50 26 80 26 80 58Z" />
        <path d="M45 58H55V86H45Z" />
      </>
    ),
  },
  'Composing stick': {
    bg: ['dots', C.rose, C.cream],
    piece: ['stripes', C.cream, C.olive],
    shape: (
      <>
        <path d="M10 56H90V70H10Z" />
        <path d="M10 40H18V56H10Z" />
        <path d="M24 42H32V56H24ZM35 42H43V56H35ZM46 42H54V56H46ZM57 42H65V56H57Z" />
      </>
    ),
  },
  Paper: {
    bg: ['weave', C.sage, C.cream],
    piece: ['default', C.white, C.navy],
    shape: (
      <>
        <path d="M30 22H76V84H30Z" transform="rotate(-8 53 53)" />
        <path d="M24 18H70V80H24Z" />
      </>
    ),
    detail: <path d="M32 34H62M32 44H62M32 54H62M32 64H52" />,
  },
  Quill: {
    bg: ['pinstripe', C.blue, C.cream],
    piece: ['diagonal', C.cream, C.rose],
    shape: <path d="M26 86 34 70Q38 36 76 14 72 50 42 72Z" />,
    detail: <path d="M30 80 64 30" />,
  },
  Punch: {
    bg: ['gingham', C.cream, C.sage],
    piece: ['grid', C.navy, C.cream],
    shape: (
      <>
        <path d="M42 14H58V74H42Z" />
        <path d="M44 74H56L53 86H47Z" />
        <path d="M38 14H62V22H38Z" />
      </>
    ),
  },
  Matrix: {
    bg: ['rings', C.rose, C.cream],
    piece: ['weave', C.olive, C.cream],
    shape: <path d="M26 26H74V74H26Z" />,
    detail: <path d="M40 64V38L50 52 60 38V64" />,
  },
  Globe: {
    bg: ['grid', C.blue, C.cream],
    piece: ['stripes', C.cream, C.rose],
    shape: <circle cx="50" cy="48" r="30" />,
    detail: (
      <>
        <ellipse cx="50" cy="48" rx="13" ry="30" />
        <path d="M20 48H80M24 34H76M24 62H76" />
        <path d="M34 84H66M50 78V84" />
      </>
    ),
  },
  // ---- Catch the right utensils (Maagdenhuis): sewing & lace-making tools…
  Needle: {
    bg: ['grid', C.cream, C.rose],
    piece: ['default', C.navy, C.cream],
    shape: <path d="M46 8H54V76L50 92 46 76Z" transform="rotate(35 50 50)" />,
    detail: <path d="M50 14V24" transform="rotate(35 50 50)" style={{ stroke: 'var(--cream)' }} />,
  },
  Thread: {
    bg: ['dots', C.sage, C.cream],
    piece: ['stripes', C.cream, C.burgundy],
    shape: <path d="M28 16H72V28H64V72H72V84H28V72H36V28H28Z" />,
    detail: <path d="M64 46Q84 52 78 80" />,
  },
  Bobbin: {
    bg: ['pinstripe', C.rose, C.cream],
    piece: ['diagonal', C.cream, C.olive],
    shape: <path d="M42 8H58V18H54V64Q64 70 59 90H41Q36 70 46 64V18H42Z" />,
    detail: <path d="M46 30H54M46 40H54M46 50H54" />,
  },
  Scissors: {
    bg: ['gingham', C.cream, C.blue],
    piece: ['stripes', C.cream, C.navy],
    shape: (
      <>
        <path d="M36 62 74 10 80 15 46 68Z" />
        <path d="M58 66 28 12 22 17 48 70Z" />
        <circle cx="34" cy="78" r="12" />
        <circle cx="64" cy="80" r="12" />
      </>
    ),
    detail: (
      <>
        <circle cx="34" cy="78" r="5" />
        <circle cx="64" cy="80" r="5" />
      </>
    ),
  },
  Thimble: {
    bg: ['weave', C.blue, C.cream],
    piece: ['gingham', C.rose, C.burgundy],
    shape: <path d="M28 84V46Q28 18 50 18 72 18 72 46V84Z" />,
    detail: <path d="M28 74H72M40 34H40.1M50 30H50.1M60 34H60.1M38 46H38.1M50 44H50.1M62 46H62.1M38 58H38.1M50 58H50.1M62 58H62.1" />,
  },
  Pins: {
    bg: ['stripes', C.cream, C.sage],
    piece: ['rings', C.burgundy, C.rose],
    shape: (
      <>
        <circle cx="34" cy="24" r="10" />
        <circle cx="66" cy="30" r="10" />
        <path d="M32 32H36V88L34 92 32 88Z" />
        <path d="M64 38H68V88L66 92 64 88Z" />
      </>
    ),
  },
  // …and the things that don't belong
  Fork: {
    bg: ['diagonal', C.cream, C.rose],
    piece: ['grid', C.olive, C.cream],
    shape: (
      <>
        <path d="M33 10H38V40H33ZM43 10H48V40H43ZM52 10H57V40H52ZM62 10H67V40H62Z" />
        <path d="M33 36H67Q67 54 50 54 33 54 33 36Z" />
        <path d="M46 50H54V90H46Z" />
      </>
    ),
  },
  Spoon: {
    bg: ['gingham', C.cream, C.olive],
    piece: ['pinstripe', C.blue, C.cream],
    shape: (
      <>
        <ellipse cx="50" cy="30" rx="16" ry="20" />
        <path d="M46 46H54V90H46Z" />
      </>
    ),
  },
  Knife: {
    bg: ['dots', C.blue, C.cream],
    piece: ['stripes', C.cream, C.rose],
    shape: (
      <>
        <path d="M45 8Q64 18 58 58H45Z" />
        <path d="M43 56H59V92H43Z" />
      </>
    ),
  },
  Cup: {
    bg: ['grid', C.rose, C.cream],
    piece: ['dots', C.cream, C.navy],
    shape: (
      <>
        <path d="M20 30H70V58Q70 78 45 78 20 78 20 58Z" />
        <path d="M12 84H84V90H12Z" />
      </>
    ),
    detail: <path d="M70 38Q86 38 86 50 86 62 70 62" />,
  },
  Plate: {
    bg: ['weave', C.sage, C.cream],
    piece: ['rings', C.cream, C.blue],
    shape: <circle cx="50" cy="50" r="38" />,
    detail: <circle cx="50" cy="50" r="24" />,
  },
}

/** A plain patchwork for names without their own drawing. */
const PATCHWORK = {
  bg: ['default', C.cream, C.navy],
  piece: ['gingham', C.sage, C.olive],
  shape: <path d="M22 22H78V78H22Z" />,
}

/** The fragment: a stitched patchwork of four fabrics with a torn piece on top. */
function FragmentArt({ uid }) {
  const pieces = [
    ['stripes', C.cream, C.burgundy, 'M0 0H52V48H0Z'],
    ['gingham', C.rose, C.burgundy, 'M52 0H100V56H52Z'],
    ['rings', C.blue, C.cream, 'M0 48H52V100H0Z'],
    ['grid', C.sage, C.cream, 'M52 56H100V100H52Z'],
  ]
  return (
    <svg viewBox="0 0 100 100" className="memory-art" aria-hidden="true">
      <defs>
        {pieces.map(([kind, base, thread], i) => (
          <Fabric key={i} id={`${uid}-p${i}`} kind={kind} base={base} thread={thread} />
        ))}
      </defs>
      {pieces.map(([, , , d], i) => (
        <path key={i} d={d} style={{ fill: `url(#${uid}-p${i})` }} />
      ))}
      <path d="M52 0V100M0 48H52M52 56H100" style={{ stroke: C.navy, strokeWidth: 1.2, strokeDasharray: '3 3', fill: 'none' }} />
      <path d="M30 28 72 22 78 50 70 76 34 80 24 56Z" style={{ fill: C.navy }} />
      <path d="M34 32 68 27 73 50 66 71 37 74 29 56Z" style={{ fill: 'none', stroke: C.cream, strokeWidth: 1.4, strokeDasharray: '3 2.5' }} />
    </svg>
  )
}

export default function MemoryArt({ name, isFragment }) {
  const uid = useId().replace(/:/g, '')
  if (isFragment) return <FragmentArt uid={uid} />
  const art = OBJECTS[name] ?? PATCHWORK
  const [bgKind, bgBase, bgThread] = art.bg
  const [pKind, pBase, pThread] = art.piece
  return (
    <svg viewBox="0 0 100 100" className="memory-art" aria-hidden="true">
      <defs>
        <Fabric id={`${uid}-bg`} kind={bgKind} base={bgBase} thread={bgThread} />
        <Fabric id={`${uid}-piece`} kind={pKind} base={pBase} thread={pThread} />
      </defs>
      <rect width="100" height="100" style={{ fill: `url(#${uid}-bg)` }} />
      {/* the cut-out fabric, with a soft shadow and a running stitch around it */}
      <g style={{ fill: C.navy, opacity: 0.18 }} transform="translate(2.5 2.5)">
        {art.shape}
      </g>
      <g style={{ fill: `url(#${uid}-piece)` }}>{art.shape}</g>
      <g style={{ fill: 'none', stroke: C.navy, strokeWidth: 1.3, strokeDasharray: '3 2.5', strokeLinejoin: 'round' }}>{art.shape}</g>
      {art.detail && (
        <g style={{ fill: 'none', stroke: C.navy, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}>{art.detail}</g>
      )}
    </svg>
  )
}
