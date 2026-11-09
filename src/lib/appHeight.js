// The phone keyboard must slide OVER the app (and the bottom nav), not push it up.
// Some browsers shrink the page when the keyboard opens, which makes everything
// that sticks to the bottom of the screen jump up. So we remember the real screen
// height in --app-h and only update it when no text field is being typed in
// (rotation, browser bars). Fixed full-screen parts use --app-h instead of bottom: 0.

const isTyping = () => {
  const el = document.activeElement
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
}

export function trackAppHeight() {
  const root = document.documentElement
  // While typing, the bottom nav hides: whatever the browser does with the page,
  // the keyboard never ends up with the nav on top of it (html.is-typing in global.css)
  const markTyping = () => root.classList.toggle('is-typing', isTyping())
  document.addEventListener('focusin', markTyping)
  document.addEventListener('focusout', () => setTimeout(markTyping, 50))
  let height = 0
  const set = (force = false) => {
    const h = window.innerHeight
    if (!force && isTyping() && h < height) return // keyboard open: keep the old height
    height = h
    root.style.setProperty('--app-h', `${h}px`)
  }
  set(true)
  window.addEventListener('resize', () => set())
  window.addEventListener('orientationchange', () => setTimeout(() => set(true), 300))
  // after typing: the keyboard is gone, measure again (and undo any scroll iOS left behind)
  document.addEventListener('focusout', () =>
    setTimeout(() => {
      if (isTyping()) return
      set(true)
      if (window.scrollY) window.scrollTo(0, 0)
    }, 250),
  )
}
