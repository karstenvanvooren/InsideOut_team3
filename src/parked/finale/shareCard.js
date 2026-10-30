// Draws the "solved case card" on a canvas.
// Colors are read from the CSS variables so the card follows the theme.

const WIDTH = 1080
const HEIGHT = 1350 // 4:5, works well on Instagram

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function drawCaseCard(canvas, { title, tagline, found, total, date }) {
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')

  const bg = cssVar('--color-bg', '#0b0a10')
  const surface = cssVar('--color-surface', '#16141d')
  const text = cssVar('--color-text', '#ece8f5')
  const muted = cssVar('--color-text-muted', '#8c8599')
  const accent = cssVar('--color-accent', '#751FFE')
  const font = cssVar('--font-body', 'system-ui, sans-serif')
  const mono = cssVar('--font-mono', 'ui-monospace, monospace')

  // Background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  const glow = ctx.createRadialGradient(WIDTH * 0.8, HEIGHT * 0.15, 0, WIDTH * 0.8, HEIGHT * 0.15, 800)
  glow.addColorStop(0, accent)
  glow.addColorStop(1, 'transparent')
  ctx.globalAlpha = 0.35
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.globalAlpha = 1

  // Card panel
  const pad = 80
  ctx.fillStyle = surface
  ctx.fillRect(pad, pad, WIDTH - pad * 2, HEIGHT - pad * 2)
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.strokeRect(pad, pad, WIDTH - pad * 2, HEIGHT - pad * 2)

  const x = pad + 70
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = muted
  ctx.font = `600 34px ${mono}`
  ctx.fillText('CASE FILE', x, pad + 130)

  ctx.fillStyle = text
  ctx.font = `800 110px ${font}`
  ctx.fillText(title.toUpperCase(), x, pad + 270)

  ctx.fillStyle = muted
  ctx.font = `400 38px ${font}`
  wrapText(ctx, tagline, x, pad + 340, WIDTH - pad * 2 - 140, 50)

  // "SOLVED" stamp
  ctx.save()
  ctx.translate(WIDTH / 2, HEIGHT / 2 + 40)
  ctx.rotate(-0.18)
  ctx.strokeStyle = accent
  ctx.lineWidth = 10
  ctx.strokeRect(-280, -90, 560, 180)
  ctx.fillStyle = accent
  ctx.font = `900 130px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('SOLVED', 0, 8)
  ctx.restore()

  // Stats
  ctx.textAlign = 'left'
  ctx.fillStyle = text
  ctx.font = `800 96px ${font}`
  ctx.fillText(`${found}/${total}`, x, HEIGHT - pad - 230)
  ctx.fillStyle = muted
  ctx.font = `500 36px ${font}`
  ctx.fillText('fragments found', x, HEIGHT - pad - 175)

  ctx.font = `500 34px ${mono}`
  ctx.fillText(date, x, HEIGHT - pad - 80)
  ctx.textAlign = 'right'
  ctx.fillStyle = accent
  ctx.fillText('#InsideOutAntwerp', WIDTH - pad - 70, HEIGHT - pad - 80)
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = ''
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, y)
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png'),
  )
}
