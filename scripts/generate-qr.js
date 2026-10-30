// npm run qr
// Makes a printable QR code (PNG) for the start and every hook in src/data/story.json.
// Locations have no QR (arriving there is location-based).
// The URL inside each code is BASE_URL + /hook/<qrId>. Set BASE_URL in .env.
import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'qr-codes')
const baseUrl = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '')

const story = JSON.parse(await fs.readFile(path.join(root, 'src/data/story.json'), 'utf8'))

const qrOptions = {
  errorCorrectionLevel: 'H', // survives scratches, stickers and street-art paint
  margin: 2,
  width: 1024,
  color: { dark: '#000000', light: '#ffffff' },
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// Start clean, so codes of removed hooks don't linger
await fs.rm(outDir, { recursive: true, force: true })
await fs.mkdir(outDir, { recursive: true })

// One code per QR: the start first, then the hooks in route order
const codes = [
  { qrId: story.start.qrId, title: `START · ${story.start.name}`, where: story.start },
  ...story.hooks.map((hook) => ({ qrId: hook.qrId, title: `${hook.content?.title ?? hook.id} · ${hook.leg}`, where: hook })),
]

const cards = []
for (const code of codes) {
  const url = `${baseUrl}/hook/${encodeURIComponent(code.qrId)}`
  await QRCode.toFile(path.join(outDir, `${code.qrId}.png`), url, qrOptions)
  cards.push({ ...code, url })
  console.log(`✔ ${code.qrId}.png  →  ${url}`)
}

// One code per printed page (open qr-codes/print.html in a browser → Print)
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Inside Out — QR codes (${cards.length})</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: system-ui, sans-serif; margin: 0; color: #111; }
  .sheet { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem 1rem; box-sizing: border-box; page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .test { display: inline-block; padding: 2px 10px; border: 2px solid #751ffe; color: #751ffe; border-radius: 99px; font: 700 12px/1.6 monospace; letter-spacing: .15em; }
  img { width: min(14cm, 85vw); height: auto; margin: 1rem 0; }
  h1 { margin: .5rem 0 .25rem; font-size: 2rem; }
  p { margin: .25rem 0; }
  .url { font: 12px monospace; color: #666; word-break: break-all; }
</style>
${cards
  .map(
    ({ qrId, title, where, url }) => `<section class="sheet">
  <span class="test">TEST</span>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(qrId)} · ${where.lat}, ${where.lng} · radius ${where.radius ?? 50} m</p>
  <img src="${escapeHtml(qrId)}.png" alt="QR code ${escapeHtml(qrId)}">
  <p class="url">${escapeHtml(url)}</p>
</section>`,
  )
  .join('\n')}
</html>
`
await fs.writeFile(path.join(outDir, 'print.html'), html)

console.log(`\n${cards.length} QR codes written to qr-codes/ (open qr-codes/print.html to print them)`)
if (/localhost|127\.0\.0\.1|192\.168\.|10\.\d/.test(baseUrl)) {
  console.log('Note: BASE_URL is a local address — these codes only work on your own network. Set BASE_URL in .env to your Netlify URL.')
}
