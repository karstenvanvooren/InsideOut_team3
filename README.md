# Inside Out

A mystery game that turns Antwerp into a book. Players scan street-art "hooks" (QR code or NFC tag) around the city. Each hook opens a chapter with story fragments and a clue to the next hooks. The finale happens in a museum, in front of the artwork. At the end, players get a shareable "solved case card".

This repo is the **engine**. All story content is placeholder and lives in one file: `src/data/story.json`.

Tech: React + Vite, plain JavaScript, plain CSS. No backend, no login. Progress is saved in the browser (localStorage).

---

## 1. Run it

You need [Node.js](https://nodejs.org) (version 18 or newer).

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

| Command             | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm run dev`       | Start the dev server (also reachable from your phone)         |
| `npm run dev:https` | Same, but with https, so the in-app camera scanner works on a phone |
| `npm run build`     | Make the production version in `dist/`                        |
| `npm run preview`   | Try the production version locally                            |
| `npm run qr`        | Generate QR codes for all hooks into `qr-codes/`              |

**Testing tip:** while running `npm run dev`, the Home page shows "Dev only" links to every hook, so you can test without scanning. There is also a **Reset progress** button at the bottom of Home.

---

## 2. Test on your phone

1. Your phone and computer must be on the **same Wi-Fi**.
2. Run `npm run dev`. Vite prints a `Network:` address, for example `http://192.168.1.20:5173`.
3. Type that address in your phone's browser.

If it doesn't load: Windows may ask to allow Node.js through the firewall. Click "Allow" (private networks). School/eduroam Wi-Fi often blocks this. A phone hotspot usually works.

**Scanning QR codes on the phone:**

- **Easiest:** use the phone's normal camera app. It reads the QR code and opens the link. This always works.
- **In-app scanner (`/scan`):** browsers only allow the camera on `https` (or `localhost`). Run `npm run dev:https` and open `https://192.168.x.x:5173`. Your phone will warn that the certificate is not trusted; that's normal for testing, so tap "Advanced" → "Continue".

**Add to home screen:** in Safari tap Share → "Add to Home Screen"; in Chrome tap ⋮ → "Add to Home screen". The app then opens full screen like a normal app.

**Vibration** only works on Android (Chrome). iPhones don't support it, so the game never depends on it.

---

## 3. How hooks, QR codes and NFC work

Every hook has its own URL:

```
https://your-site.com/hook/h01
```

A QR code and an NFC tag both simply contain that URL, so the app doesn't care which one was used. Opening the URL:

1. marks the hook as found (saved on the phone),
2. sends the player to that hook's chapter.

An unknown id (e.g. `/hook/xyz`) shows a friendly "This trace doesn't exist" page.

**NFC tags:** write a "URL / URI" record with the hook URL using a free app like *NFC Tools*. iPhones and Android phones open it automatically when tapped.

---

## 4. Generate QR codes

1. Copy `.env.example` to a new file called `.env`.
2. Set `BASE_URL` to the address the phones will use:
   - testing on Wi-Fi: `BASE_URL=http://192.168.1.20:5173` (your computer's address from step 2)
   - real game: `BASE_URL=https://your-real-site.com`
3. Run:

   ```bash
   npm run qr
   ```

You get `qr-codes/h01.png`, `h02.png`, … plus `qr-codes/print.html` (open it in a browser and print to get all codes on one page with labels).

⚠️ **Generate the final QR codes only once you know the final web address.** Codes made with `localhost` or a Wi-Fi IP won't work for real players.

---

## 5. Edit the story (`src/data/story.json`)

No coding needed. Just keep the JSON valid (commas, quotes). If you break it, `npm run dev` will show an error. Tip: paste it into https://jsonlint.com to check.

The file has four parts:

```json
{
  "meta":      { "title": "...", "tagline": "...", "intro": "...", "finaleChapter": "c04" },
  "hooks":     [ ... ],
  "chapters":  [ ... ],
  "fragments": [ ... ]
}
```

How they connect: **hook → opens one chapter → chapter shows fragments + points to next hooks.**

### Add a fragment

Add an object to `fragments`. The `id` must be unique.

```json
{
  "id": "f08",
  "type": "text",
  "title": "Receipt",
  "content": "Two coffees. 23:47.\nWho drinks coffee at midnight?",
  "caption": "Found under a bench.",
  "meta": { "date": "12 May" }
}
```

| type       | Looks like                | Uses                                  |
| ---------- | ------------------------- | ------------------------------------- |
| `text`     | yellow handwritten note   | `content` (use `\n` for a new line)   |
| `document` | torn paper letter         | `content`, optional `src` image       |
| `image`    | photo                     | `src`                                 |
| `audio`    | audio player (voice memo) | `src` (mp3, m4a or wav)               |

`caption` and `meta` are optional. Every value inside `meta` is shown in small text under the fragment.

**Media files** go in `public/fragments/`. Refer to them as `"/fragments/my-file.jpg"` (no `public` in the path). Keep images small (under ~500 KB) for players on mobile data.

### Add a chapter

```json
{
  "id": "c05",
  "title": "Chapter 5 — The Cellar",
  "intro": "Short text shown at the top.",
  "fragments": ["f08"],
  "nextHooks": ["h01"],
  "clue": "The clue that points to the next hook(s)."
}
```

- `fragments`: the fragment ids shown in this chapter, in order.
- `nextHooks`: hook ids the player should look for next (can be `[]`).
- The finale chapter has `"isFinale": true` and its id is set in `meta.finaleChapter`. It is unlocked in the museum, not by a hook.

### Add a hook

```json
{
  "id": "h04",
  "label": "The Cellar Door",
  "location": { "name": "Vleeshuis", "lat": 51.2229, "lng": 4.3988 },
  "chapter": "c05"
}
```

- `id` is what goes in the URL (`/hook/h04`). Keep it short, lowercase, no spaces. **Don't change an id after its QR code is printed.**
- `chapter`: the chapter this hook opens.
- `location` isn't shown in the app yet; it's there for a future map.

Then run `npm run qr` again to get the new QR code.

---

## 6. Change the look

All colors, fonts and spacing are CSS variables in **`src/styles/variables.css`**. Change `--color-accent` and the whole app (and the share card) follows. Everything else is in `src/styles/global.css`.

---

## 7. Where things are

```
src/
  data/story.json            ← ALL story content
  lib/story.js               ← helpers to read the story (getHook, getChapter, ...)
  lib/progress.js            ← saving/loading progress in localStorage
  lib/useProgress.js         ← React hook: foundHooks, foundFragments, unlockedChapters, finaleUnlocked, reset
  lib/shareCard.js           ← draws the solved case card on a canvas
  lib/vibrate.js             ← vibration (only if supported)
  finale/artworkRecognizer.js← museum artwork scan (simulated for now)
  components/                ← Layout (bottom nav), ProgressBar, FragmentViewer, ResetButton
  pages/                     ← one file per page
  styles/                    ← variables.css + global.css
scripts/generate-qr.js       ← npm run qr
public/fragments/            ← story media (images, audio)
public/manifest.webmanifest  ← "add to home screen" settings
```

Pages: `/` Home · `/hook/:id` · `/chapter/:id` · `/collection` · `/finale` · `/share` · `/scan` · anything else → 404.

**Progress:** only the found hooks (and whether the finale is unlocked) are saved. Unlocked chapters and found fragments are calculated from `story.json`, so editing the story doesn't break saved progress. Progress is per phone and per browser. Clearing browser data or switching browsers starts over.

---

## 8. Putting it online

Any static host works (Netlify, Vercel, GitHub Pages...). Build with `npm run build` and upload `dist/`.

Important: URLs like `/hook/h01` must serve `index.html`. This is already set up for **Netlify** (`public/_redirects`) and **Vercel** (`vercel.json`). For other hosts, look up "SPA fallback".

The real site must use **https** (all of the hosts above do this automatically).

---

## 9. What's still placeholder

- **All story content**: texts, clues, hook names and locations in `story.json`.
- **Media**: `public/fragments/photo-01.svg`, `artwork.svg`, `memo-01.wav` (a beep, not a voice).
- **Museum finale**: "Scan the artwork" only simulates success. Real image recognition (e.g. MindAR) can be added in `src/finale/artworkRecognizer.js`. An example outline is in the comments. The page itself doesn't need to change.
- **Visual design**: dark theme with purple accent, intentionally minimal.
- **App icons**: `public/icons/` (simple generated placeholders).
- **Share card layout**: `src/lib/shareCard.js`.
- **No offline mode** yet (no service worker).
#   I n s i d e O u t _ t e a m 3  
 