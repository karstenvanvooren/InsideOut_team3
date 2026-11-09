// The phone keyboard must slide OVER the app (and the bottom nav), not push it up.
// Some browsers shrink the page when the keyboard opens, which makes everything
// that sticks to the bottom of the screen jump up. So we remember the real screen
// height in --app-h and only update it when no text field is being typed in
// (rotation, browser bars). Fixed full-screen parts use --app-h instead of bottom: 0.

const TEXT_INPUTS = ['text', 'search', 'email', 'url', 'tel', 'number', 'password']

const isTyping = () => {
  const el = document.activeElement
  if (!el || !el.isConnected) return false
  if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true
  return el.tagName === 'INPUT' && TEXT_INPUTS.includes(el.type || 'text')
}

export function trackAppHeight() {
  const root = document.documentElement
  // While typing, the bottom nav hides: whatever the browser does with the page,
  // the keyboard never ends up with the nav on top of it (html.is-typing in global.css)
  // A focused field that disappears (e.g. the riddle card closes after a right answer)
  // sends no focusout, so while typing we also check twice a second.
  // Hidden only while a text field has focus AND the keyboard is really on screen
  // (the visible part of the page is clearly shorter than the full app height).
  let height = 0
  const keyboardOpen = () => {
    const vv = window.visualViewport
    if (!vv) return true
    return vv.height < Math.max(height, window.innerHeight) - 120
  }
  let watch = null
  const markTyping = () => {
    const typing = isTyping() && keyboardOpen()
    root.classList.toggle('is-typing', typing)
    if (isTyping() && !watch) watch = setInterval(markTyping, 500)
    if (!isTyping() && watch) {
      clearInterval(watch)
      watch = null
    }
  }
  document.addEventListener('focusin', markTyping)
  document.addEventListener('focusout', () => setTimeout(markTyping, 50))
  window.visualViewport?.addEventListener('resize', markTyping)
  // The visible part of the page (above the keyboard), for screens that must stay usable while typing (the chat)
  const vv = window.visualViewport
  const setVisible = () => {
    if (!vv) return
    root.style.setProperty('--vv-h', `${Math.round(vv.height)}px`)
    root.style.setProperty('--vv-top', `${Math.round(vv.offsetTop)}px`)
  }
  vv?.addEventListener('resize', setVisible)
  vv?.addEventListener('scroll', setVisible)
  setVisible()
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
