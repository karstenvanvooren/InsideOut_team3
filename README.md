# Inside Out

A mystery game that turns Antwerp into a book. Players start at the Stadsfeestzaal, solve a riddle that names the next location, walk there on an in-game 3D map, and unlock story fragments with a challenge on the spot. On the way between locations they can collect **hooks**: small QR codes hidden in the street. The finale happens in a museum (KMSKA).

This repo is the **engine**. All story content is placeholder and lives in `src/data/story.json` (places, riddles, challenges, fragments, hooks) and `src/data/onboarding.json` (the intro screens). Game design switches are in `src/config.js`.

Tech: React + Vite, plain JavaScript, plain CSS, MapLibre (OpenFreeMap tiles). No backend, no login. Progress is saved in the browser (localStorage).

## The game

The app always opens where the player is (`src/game/gameState.js`, the single source of truth, saved in localStorage). A reload never resets a player; there is no "continue later" screen.

After the start QR, the **map is the main screen** for the rest of the game. Everything else is a **pop-up** on top of it (one `BottomSheet` component: a white sheet sliding up onto the bottom nav; the map is dimmed only for pop-ups that need focus). The current **phase decides which pop-up is open**.

From the riddle phase on, a game-style **bottom nav** is always visible: **Map** (back to the current game screen) · **Scan** (scan a hook) · **Collection** (with a badge counting fragments + hooks). It is hidden on the locked screen and during the intros.

```
locked → hooksIntro → tutorial → riddleIntro → riddle → navigating → atLocation → fragmentUnlocked
                                                 ↑                                      │
                                                 └──────── next location ───────────────┘
                                                            (after the last one → finale)
```

| Phase              | What the player sees (on top of the map)                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `locked`           | Black screen, pulsing lock, "Scan the QR to begin". The **Scan** button stays locked (grey, small lock, shakes when tapped) until the player is at the Stadsfeestzaal (live location + `checkAtLocation`), then it unlocks and glows. A phone-camera scan of the start QR runs the same check ("This only opens at the start."). |
| `hooksIntro`, `tutorial`, `riddleIntro` | Step pop-ups one after another (text from `onboarding.json`), "Next" / "Start". Can't be closed by tapping outside. |
| `riddle`           | Riddle pop-up ("Riddle 1/6"). Every wrong answer shows the next hint; after 3 wrong answers the answer is shown. Can be minimised to a pill above the nav. The map shows the player but **no destination or route** yet. |
| `navigating`       | No pop-up: the route and the direction card at the top (next turn, then "6 min · 450 m · destination"; its "?" re-opens the solved riddle). |
| `atLocation`       | Automatic when inside the location's radius (no QR at locations). Arrived pop-up with the challenge card → **Solve challenge** opens the challenge as a full screen (placeholder: **Solve challenge** again). |
| `fragmentUnlocked` | Centered fragment card ("Fragments 1 & 2", counter x/12) → **Continue** → straight to the riddle pop-up for the next location (or the finale). |
| `finale`           | Finale placeholder pop-up.                                                                                 |

Only valid transitions are allowed (e.g. you can't jump from `riddle` to `atLocation`).

**Hooks** are optional collectibles. They are **not** location-locked: scanning a valid hook QR (Scan button or phone camera) always collects it, in every phase after the start. Scanning never changes the phase:

- new hook → "Hook collected!" → saved in the collection
- already collected → "You already found this one."
- game not started yet (locked or intros) → "Start the game at the Stadsfeestzaal first."
- the start QR again → "You've already started."

Hook coordinates in `story.json` are only used for `showHooksOnMap` and the dev panel. The **start QR** stays location-locked, and locations stay location-based.

The **Collection** (`/collection`) has two tabs, fragments and hooks, each with a counter. Tap a found card to see it in full.

**Config** (`src/config.js`): `showDistanceOnLock` (show the distance to the start on the locked screen, default off) and `showHooksOnMap` (show hooks as small map markers, default off so players look around).

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
| `npm run qr`        | Generate QR codes for the start and all hooks into `qr-codes/` |

### The dev panel (fake your location)

You don't have to walk around Antwerp to test. The yellow **DEV** button (it shows the current phase) appears **only** after you open any page with **`?dev=1`**, e.g. `http://localhost:5173/?dev=1` or `https://your-site.netlify.app/?dev=1`, also in `npm run dev`. The device remembers it; `?dev=0` hides it again. Players never see it.

In the panel:

- **Live info**: phase, current location and leg (e.g. `start→loc1`), distance to the location, nearest hook + distance, fragments and hooks collected, GPS accuracy.
- **Skip to phase…**: pick a phase and a location and jump there; the right pop-up opens (bypasses the rules; dev only). **Close all pop-ups** hides them (they come back as a pill).
- **Solve challenge** (in `atLocation`), **Reset game**, **Skip location check** (the start and every location count as reached; ignored without `?dev=1`).
- **Teleport** to the start, any location or any hook; **Far away**.
- **Fake scan** the start or any hook (same path as a real scan, no camera needed; hooks work from anywhere).
- **Use real GPS / Use fake location**, the **map** (tap to put yourself there; yellow = start, purple = locations, green = hooks) and lat/lng input.
- **Fake GPS accuracy** (±0 / ±40 / ±150 m, to test "Looking for a better GPS signal").
- **Compass slider** (0–359°) and **Simulate walk** (while navigating: walks the fake location along the route at 1.3 m/s or ×5).

The fake location is saved, so it survives a reload. Turn it **off** before testing real GPS.

**Other way on a PC: Chrome DevTools.** Press F12 → ⋮ (top right of DevTools) → **More tools → Sensors** → under *Location* pick "Other…" and type e.g. `51.2210` / `4.4044`. Keep DevTools open while testing. The dev panel must be on **Use real GPS** for this, otherwise the fake location wins.

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
- **In-app scanner (the Scan buttons):** browsers only allow the camera on `https` (or `localhost`). Run `npm run dev:https` and open `https://192.168.x.x:5173`. Your phone will warn that the certificate is not trusted; that's normal for testing, so tap "Advanced" → "Continue".

**Add to home screen:** in Safari tap Share → "Add to Home Screen"; in Chrome tap ⋮ → "Add to Home screen". The app then opens full screen like a normal app.

**Vibration** only works on Android (Chrome). iPhones don't support it, so the game never depends on it.

---

## 3. How the QR codes work

Only the **start** and the **hooks** have a QR code; locations don't (arriving there is location-based). Every code contains a URL with its `qrId`:

```
https://your-site.com/hook/start     ← the start (Stadsfeestzaal)
https://your-site.com/hook/hk01      ← a hook
```

Scanning with the phone camera opens that URL; the app then runs exactly the same checks as the in-app scanner (start: are you at the Stadsfeestzaal? hook: has the game started? already collected?). An unknown id shows "This QR code isn't part of Inside Out."

**NFC tags** work the same way: write a "URL / URI" record with the URL using a free app like *NFC Tools*.

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

You get one PNG per code (`qr-codes/start.png`, `qr-codes/hk01.png`, …) plus `qr-codes/print.html`. Open it in a browser and print: one big code per page, with its name, coordinates and a "TEST" label. The folder is emptied first, so codes of removed hooks disappear.

⚠️ **Generate the final QR codes only once you know the final web address.** Codes made with `localhost` or a Wi-Fi IP won't work for real players.

---

## 5. Edit the story (`src/data/story.json`)

No coding needed. Just keep the JSON valid (commas, quotes). If you break it, `npm run dev` will show an error. Tip: paste it into https://jsonlint.com to check.

```json
{
  "meta":      { "title": "...", "tagline": "..." },
  "start":     { "id": "start", "name": "Stadsfeestzaal", "lat": 51.2175, "lng": 4.4097,
                 "radius": 60, "maxAccuracy": 80, "qrId": "start" },
  "locations": [ ... ],
  "hooks":     [ ... ],
  "fragments": [ ... ]
}
```

- **`start`**: where the game begins. `radius` (m) and `maxAccuracy` (m, the worst GPS accuracy we accept) are generous because the Stadsfeestzaal is indoors.
- **`locations`**: the route, **in order**. Each location owns the riddle that leads *to* it.
- **`hooks`**: collectibles on the way. `leg` says between which places they are.
- **`fragments`**: the story pieces the locations unlock.

### A location

```json
{
  "id": "loc1",
  "name": "Sint-Carolus Borromeuskerk",
  "address": "Hendrik Conscienceplein, 2000 Antwerpen",
  "lat": 51.221, "lng": 4.4044, "radius": 50,
  "riddle": {
    "question": "The riddle whose answer is THIS location.",
    "answers": ["Sint-Carolus Borromeuskerk", "Carolus Borromeus"],
    "hints": ["Shown after 1 wrong answer.", "Shown after 2 wrong answers."]
  },
  "challenge": { "type": "placeholder", "title": "...", "text": "..." },
  "fragments": ["f01"]
}
```

- `lat`/`lng`: in Google Maps right-click → click the numbers to copy them. `radius` in meters; 50 m is a good default (GPS between tall buildings can be off by 20–40 m). Optional `maxAccuracy` like the start.
- `riddle.answers`: every accepted answer. Capitals, accents, spaces, hyphens and the words "de", "het" and "the" are ignored, so `"Plantin-Moretus"` also matches `"het plantin moretus"`.
- `challenge`: placeholder for now (one "Solve challenge" button).
- `fragments`: fragment ids unlocked by the challenge (two per location). Fragments are numbered by their order in the `fragments` list ("Fragment 1"), so keep that list in route order.

### A hook

```json
{
  "id": "hook01", "qrId": "hk01",
  "lat": 51.21867, "lng": 4.40793, "radius": 30,
  "leg": "start→loc1",
  "content": { "type": "placeholder", "title": "Hook 01", "text": "..." }
}
```

- `qrId` is what goes in the QR URL (`/hook/hk01`). Keep it short, lowercase, no spaces. **Don't change a qrId after its QR code is printed.**
- `lat`/`lng`/`radius`: only used to show it on the map (`showHooksOnMap`) and to teleport in the dev panel. Collecting works anywhere.
- `content`: what the hook gives (not decided yet; shown in the collection).

After adding hooks, run `npm run qr` again.

### A fragment

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

`caption` and `meta` are optional. **Media files** go in `public/fragments/`; refer to them as `"/fragments/my-file.jpg"`. Keep images small (under ~500 KB).

### The intro screens (`src/data/onboarding.json`)

`hooksIntro`, `tutorial` and `riddleIntro` each have a list of `steps`: `{ "title": "...", "text": "...", "image": "/fragments/optional.jpg" }`. Add, remove or reorder steps freely.

---

## 6. Change the look

The hi-fi style ("Hi-fi – chosen style" in Figma) lives in **`src/styles/tokens.css`**: the palette (navy, burgundy, olive, cream, rose, blue, sage, white), their opacity variants, type sizes, radii and shadows. Components never use raw colours; change a token and the whole app follows. Everything else is in `src/styles/global.css`.

- **Two modes.** The start/locked phase is dark (`.theme-dark`: navy background, cream text). Everything after the start is light (white, navy text, burgundy buttons). Components use the semantic tokens (`--bg`, `--text`, `--primary`, ...), so they follow the mode they're in.
- **Fonts:** Syne Bold for titles, riddles and big numbers, Inter for everything else (npm packages `@fontsource/syne` and `@fontsource/inter`, imported in `src/main.jsx`).
- **Shared components** in `src/components/ui/`: `BottomSheet`, `Toast`, `Eyebrow`, `PrimaryButton`, `Chip`, icons (incl. the lock).
- **The map** reads its colours from the `--map-*` tokens (`src/map/mapTheme.js` only sets how strong each one is).
- **Mobile first:** the app is a 430px column, centered on desktop.

---

## 7. Where things are

```
src/
  config.js                  ← game design switches (showDistanceOnLock, showHooksOnMap)
  data/story.json            ← ALL story content: start, locations, hooks, fragments
  data/onboarding.json       ← text of the intro step screens
  game/                      ← THE GAME
    gameState.js             ← phases + transitions, location, riddle attempts, hooks, fragments (localStorage)
    GameProvider.jsx         ← React context: useGame()
    PhaseScreen.jsx          ← "/": the locked screen, or MainScreen after the start
    MainScreen.jsx           ← the map + the pop-up for the current phase
    GameWorld.jsx            ← the map under the pop-ups: route, banner, info strip
    popups/                  ← Steps (intros), RiddlePopup, Arrived pop-up + challenge screen, Fragment/Finale pop-ups
    scans.js                 ← what a scanned QR means (start / hook, location check)
    ScanProvider.jsx         ← in-app scanner + scan results on top of every screen
    BottomNav.jsx            ← Map · Scan · Collection (from the riddle phase on)
    screens/                 ← LockedScreen, UnlockAnimation
  map/                       ← the MapLibre game map
    GameMap.jsx              ← player, beacon, trail, off-screen pointer, optional hook markers
    mapTheme.js              ← the map style, built from the --map-* design tokens
    useGameScreen.js         ← full-screen plumbing (banner/sheet refs, no page scroll)
  lib/story.js               ← helpers to read story.json (getStart, getLocation, getHooks, findQr, ...)
  lib/location.js            ← GPS (or fake location), Haversine, checkAtLocation (far / weak-signal / there)
  lib/usePosition.js         ← live position hook with retry
  lib/answers.js             ← forgiving answer check for riddles
  lib/route.js               ← walking route with steps (OSRM), straight-line fallback
  lib/navigation.js          ← turn-by-turn: position on the route, next maneuver, English instructions
  lib/useHeading.js          ← compass (iPhone/Android), dev fake heading, or direction of movement
  lib/storage.js, vibrate.js
  components/QrScanner.jsx   ← in-app QR scanner (html5-qrcode) + camera-denied help
  components/Riddle.jsx      ← riddle form (hints, answer after 3 wrong tries)
  components/ui/             ← BottomSheet (every pop-up), Toast, Eyebrow, PrimaryButton, Chip, icons
  components/                ← Layout, FragmentViewer, ProgressBar
  dev/                       ← dev panel (only with ?dev=1), dev options, simulate walk
  pages/                     ← Collection, Hook (deep link /hook/:qrId), NotFound
  parked/                    ← code kept for later, not in the build (finale + share card)
  styles/                    ← tokens.css (design tokens) + global.css
scripts/generate-qr.js       ← npm run qr (start + hooks)
public/fragments/            ← story media (images, audio)
```

Routes: `/` the game (current phase) · `/hook/:qrId` QR deep link · `/collection` · anything else → 404.

**Game state** (localStorage key `insideout.game.v2`): phase, location index, riddle attempts, collected hooks and unlocked fragments. It's per phone and per browser; clearing browser data starts over. **Reset game** in the dev panel clears it.

---

## 8. Putting it online

Any static host works (Netlify, Vercel, GitHub Pages...). Build with `npm run build` and upload `dist/`.

Important: URLs like `/hook/hk01` must serve `index.html`. This is already set up for **Netlify** (`public/_redirects`) and **Vercel** (`vercel.json`). For other hosts, look up "SPA fallback".

The real site must use **https** (all of the hosts above do this automatically). Without https, GPS doesn't work.

### Netlify Drop, step by step

The QR codes are **not** part of the website. They only contain its address. So the site never needs a rebuild because of the QR codes, but the codes must be made **after** you know the final address.

1. `npm run build` → creates the `dist/` folder (it already contains `_redirects`).
2. Go to **https://app.netlify.com/drop** and drag the **`dist` folder** (not the project folder) onto the page.
3. **Log in / sign up and claim the site.** Without an account, a drop is temporary and every new drop gets a new random URL, which would break printed QR codes.
4. Optional: *Site configuration → Change site name* → e.g. `insideout-team3` → your URL becomes `https://insideout-team3.netlify.app`. **Do this before step 5.**
5. In `.env` set `BASE_URL=https://insideout-team3.netlify.app` (no slash at the end).
6. `npm run qr` → print `qr-codes/print.html`.
7. Test: scan a code with your phone camera. It should open the Netlify site at `/hook/start` or `/hook/hk01`.

**Updating the site later** (story or code changed): `npm run build`, then open your site in Netlify → **Deploys** → drag the new `dist` folder onto the "drag and drop" area there. The URL stays the same, so printed codes keep working. You only need `npm run qr` again if you added hooks, changed a `qrId` or changed the address.

---

## 9. What's still placeholder

- **Story content** in `story.json` and `onboarding.json`: route 1 (Stadsfeestzaal → Sint-Carolus Borromeuskerk → Plantin-Moretus → MoMu → Bourla → Maagdenhuis → KMSKA), its coordinates and the **riddles** are real; challenges, hooks, fragments and intro texts are still marked "TODO" / placeholder.
- **Hooks**: 2 placeholder hooks per leg, on the straight line between two places (some are inside buildings). Their `content` isn't decided yet.
- **Challenges**: one "Solve challenge" button per location.
- **Finale**: phase `finale` is a placeholder screen. The old museum test (simulated artwork scan + share card) is parked in `src/parked/finale/`.
- **Media**: `public/fragments/photo-01.svg`, `artwork.svg`, `memo-01.wav` (a beep, not a voice).
- **App icons**: `public/icons/` (simple generated placeholders).
- **No offline mode** yet (no service worker).
#   I n s i d e O u t _ t e a m 3  
 