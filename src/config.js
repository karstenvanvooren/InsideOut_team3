// Game design switches. Change them here; nothing else needs to change.
export const config = {
  // Locked screen: show how far the player is from the start? (Players know the
  // start from the campaign, so by default the locked screen gives nothing away.)
  showDistanceOnLock: false,

  // Show the hooks on the map as small markers? Hidden by default, so players
  // have to look around while they walk.
  showHooksOnMap: false,

  // BRouter profile for the walking route (https://brouter.de). "hiking-mountain"
  // is BRouter's walking profile; if the server doesn't have it, "shortest" is used.
  routeProfile: 'hiking-mountain',

  // How blurred the map is per colour stage (the mystery clears up while you play).
  // Values in px; 0 = sharp. Change them in src/styles/tokens.css (--map-blur).
}
