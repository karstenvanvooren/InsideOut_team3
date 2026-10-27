# Inside Out

A mystery game that turns Antwerp into a book. Players scan street-art "hooks" (QR code or NFC tag) around the city. Each hook opens a chapter with story fragments and a clue to the next hooks. The finale happens in a museum, in front of the artwork. At the end, players get a shareable "solved case card".

**The game loop**

1. A **clue** tells the player where to go.
2. They find the **hook** (street art + QR code / NFC tag) and scan it → the app opens `/hook/:id`.
3. **Location check:** the app checks their GPS. Not within the hook's radius → "You're not there yet · 240 m" + *Check again*.
4. **Challenge:** a question about the place. Two wrong answers → the hint appears.
5. **Reward:** correct → the chapter and its fragments unlock.
6. The chapter shows the **next clue** → back to step 1. After the last hook, the clue leads to the museum (`/finale`).

Hooks can depend on each other (`requires`). Scanning a hook too early shows "You haven't found the trace that leads here yet".

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

### The dev panel (fake your location)

You don't have to walk to Groenplaats to test. A small yellow **DEV** button floats above the bottom nav:

- always visible while running `npm run dev`
- on the live site: open any page with **`?dev=1`** at the end, e.g. `https://your-site.netlify.app/?dev=1`. Your phone remembers it. `?dev=0` hides it again.

In the panel:

- **Use real GPS / Use fake location**: when fake is on, the whole app uses the fake position.
- **Map** (OpenStreetMap): tap anywhere to put yourself there. Purple circles are the hooks and their radius; the red dot is you.
- **Quick buttons**: "I'm at Groenplaats", "I'm at Grote Markt", "Far away", or type a lat/lng.
- **Live distance** to every hook (green ✓ = inside the radius) and the hook's status (locked / open / completed).
- **Skip challenge**, links to open each hook, and **Reset progress**.

The fake location is saved, so it survives a reload. Turn it **off** before testing real GPS.

**Other way on a PC: Chrome DevTools.** Press F12 → ⋮ (top right of DevTools) → **More tools → Sensors** → under *Location* pick "Other…" and type e.g. `51.21928` / `4.40108`. Keep DevTools open while testing. The dev panel must be on **Use real GPS** for this, otherwise the fake location wins.

---

## 2. Test on your phone

1. Your phone and computer must be on the **same Wi-Fi**.
2. Run `npm run dev`. Vite prints a `Network:` address, for example `http://192.168.1.20:5173`.
3. Type that address in your phone's browser.

If it doesn't load: Windows may ask to allow Node.js through the firewall. Click "Allow" (private networks). School/eduroam Wi-Fi often blocks this. A phone hotspot usually works.

**GPS needs https.** Browsers only share your location on `https` pages (or `localhost`). So on `http://192.168.x.x:5173` the real location check shows "Location needs a secure connection". You can:

- use the dev panel's **fake location** (works fine over http), or
- run `npm run dev:https` (accept the certificate warning), or
- test the deployed Netlify site, which is always https.

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

1. checks the hook's `requires` (are the earlier hooks done?),
2. checks the player's location,
3. asks the challenge question,
4. unlocks the chapter and its fragments.

Once a hook is completed, scanning it again goes straight to its chapter.

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

You get one PNG per hook (`qr-codes/h01.png`, `qr-codes/h02.png`) plus `qr-codes/print.html`. Open it in a browser and print: one big code per page, with the hook name, location and a "TEST" label. The folder is emptied first, so codes of removed hooks disappear.

⚠️ **Generate the final QR codes only once you know the final web address.** Codes made with `localhost` or a Wi-Fi IP won't work for real players.

---

## 5. Edit the story (`src/data/story.json`)

No coding needed. Just keep the JSON valid (commas, quotes). If you break it, `npm run dev` will show an error. Tip: paste it into https://jsonlint.com to check.

The file has four parts:

```json
{
  "meta":      { "title": "...", "tagline": "...", "intro": "...",
                 "finaleChapter": "c03", "finaleRequires": ["h01", "h02"] },
  "hooks":     [ ... ],
  "chapters":  [ ... ],
  "fragments": [ ... ]
}
```

How they connect: **hook (location + challenge) → opens one chapter → chapter shows fragments + the clue to the next hooks.**

`finaleRequires` lists the hooks that must be completed before the museum finale opens.

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
  "id": "h03",
  "label": "The Cellar Door",
  "location": { "name": "Vleeshuis", "lat": 51.2229, "lng": 4.3988, "radius": 50 },
  "chapter": "c05",
  "requires": ["h02"],
  "challenge": {
    "question": "What colour is the door next to the trace?",
    "answers": ["red", "rood", "dark red"],
    "hint": "Look down, not up."
  }
}
```

- `id` is what goes in the URL (`/hook/h03`). Keep it short, lowercase, no spaces. **Don't change an id after its QR code is printed.**
- `location`: `lat`/`lng` of the spot (in Google Maps: right-click → click the numbers to copy them) and `radius` in meters. 50 m is a good default; GPS between tall buildings can be off by 20–40 m.
- `chapter`: the chapter this hook opens.
- `requires`: hooks that must be completed first. `[]` = always open (entry hook).
- `challenge.answers`: every accepted answer. Capitals, extra spaces, accents and punctuation are ignored, so `"rubens"` also matches `"  Rúbens!"`. Add Dutch and English versions.
- `challenge.hint`: shown after 2 wrong answers.

Remember to point the previous chapter's `nextHooks` and `clue` at the new hook, and add it to `meta.finaleRequires` if it must be done before the museum.

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
  lib/useProgress.js         ← React hook: completedHooks, foundFragments, unlockedChapters, finaleUnlocked, reset
  lib/location.js            ← GPS (or fake location), Haversine distance, "is the player there?"
  lib/answers.js             ← forgiving answer check for challenges
  lib/storage.js             ← localStorage that never crashes
  components/LocationCheck.jsx, Challenge.jsx ← the steps of /hook/:id
  dev/                       ← dev panel (map, fake location, skip, reset)
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

**Progress** (localStorage key `insideout.progress.v2`): per hook it saves when it was scanned, when the location was verified, the number of wrong answers and when the challenge was completed, plus whether the finale is unlocked. Chapters and fragments only count after the challenge. Unlocked chapters and found fragments are calculated from `story.json`, so editing the story doesn't break saved progress. Progress is per phone and per browser. Clearing browser data or switching browsers starts over.

---

## 8. Putting it online

Any static host works (Netlify, Vercel, GitHub Pages...). Build with `npm run build` and upload `dist/`.

Important: URLs like `/hook/h01` must serve `index.html`. This is already set up for **Netlify** (`public/_redirects`) and **Vercel** (`vercel.json`). For other hosts, look up "SPA fallback".

The real site must use **https** (all of the hosts above do this automatically). Without https, GPS doesn't work.

### Netlify Drop, step by step

The QR codes are **not** part of the website. They only contain its address. So the site never needs a rebuild because of the QR codes, but the codes must be made **after** you know the final address.

1. `npm run build` → creates the `dist/` folder (it already contains `_redirects`).
2. Go to **https://app.netlify.com/drop** and drag the **`dist` folder** (not the project folder) onto the page.
3. **Log in / sign up and claim the site.** Without an account, a drop is temporary and every new drop gets a new random URL, which would break printed QR codes.
4. Optional: *Site configuration → Change site name* → e.g. `insideout-team3` → your URL becomes `https://insideout-team3.netlify.app`. **Do this before step 5.**
5. In `.env` set `BASE_URL=https://insideout-team3.netlify.app` (no slash at the end).
6. `npm run qr` → print `qr-codes/print.html`.
7. Test: scan a code with your phone camera. It should open the Netlify site at `/hook/h01`.

**Updating the site later** (story or code changed): `npm run build`, then open your site in Netlify → **Deploys** → drag the new `dist` folder onto the "drag and drop" area there. The URL stays the same, so printed codes keep working. You only need `npm run qr` again if you added hooks or changed the address.

---

## 9. What's still placeholder

- **Story texts and fragments** in `story.json`. The 2 test locations (Groenplaats, Grote Markt), their questions and clues are real; the chapter intros and fragments are placeholder.
- **Media**: `public/fragments/photo-01.svg`, `artwork.svg`, `memo-01.wav` (a beep, not a voice).
- **Museum finale**: "Scan the artwork" only simulates success. Real image recognition (e.g. MindAR) can be added in `src/finale/artworkRecognizer.js`. An example outline is in the comments. The page itself doesn't need to change.
- **Visual design**: dark theme with purple accent, intentionally minimal.
- **App icons**: `public/icons/` (simple generated placeholders).
- **Share card layout**: `src/lib/shareCard.js`.
- **No offline mode** yet (no service worker).
#   I n s i d e O u t _ t e a m 3  
 