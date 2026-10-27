// npm run qr
// Makes a printable QR code (PNG) for every hook in src/data/story.json.
// The URL inside each code is BASE_URL + /hook/<id>. Set BASE_URL in .env.
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

await fs.mkdir(outDir, { recursive: true })

const cards = []
for (const hook of story.hooks) {
  const url = `${baseUrl}/hook/${encodeURIComponent(hook.id)}`
  const file = path.join(outDir, `${hook.id}.png`)
  await QRCode.toFile(file, url, qrOptions)
  cards.push({ hook, url })
  console.log(`✔ ${hook.id}.png  →  ${url}`)
}

// A simple page to print all codes at once (open qr-codes/print.html in a browser)
const html = `<!doctype html>
<meta charset="utf-8">
<title>Inside Out — QR codes</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(6cm, 1fr)); gap: 1.5cm; }
  figure { margin: 0; text-align: center; break-inside: avoid; }
  img { width: 6cm; height: 6cm; }
  figcaption { font-size: 12px; } small { color: #666; word-break: break-all; }
</style>
<h1>Inside Out — QR codes</h1>
<p>Base URL: ${escapeHtml(baseUrl)}</p>
<div class="grid">
${cards
  .map(
    ({ hook, url }) =>
      `<figure><img src="${escapeHtml(hook.id)}.png" alt=""><figcaption><b>${escapeHtml(hook.id)}</b> · ${escapeHtml(hook.label)}<br><small>${escapeHtml(url)}</small></figcaption></figure>`,
  )
  .join('\n')}
</div>
`
await fs.writeFile(path.join(outDir, 'print.html'), html)

console.log(`\n${cards.length} QR codes written to ${path.relative(root, outDir)}/ (open print.html to print them)`)
if (baseUrl.includes('localhost')) {
  console.log('Note: BASE_URL is localhost — these codes will NOT work on a phone. Set BASE_URL in .env.')
}
