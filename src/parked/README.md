# Parked code

Code kept for later. **Nothing in here is imported by the app**, so it isn't in the build.

- `finale/`: the museum finale from the test version — `Finale.jsx` (simulated "scan the artwork"), `artworkRecognizer.js` (where real image recognition, e.g. MindAR, would go), `Share.jsx` + `shareCard.js` (the shareable "solved case card"). They still use the old progress store, so they need rewiring to `src/game/gameState.js` when the finale phase is built (now a placeholder: `src/game/screens/FinaleScreen.jsx`).

When something here is used again, move it back into `src/` and import it there. Delete it once the real version exists.
