// Line icons used across the game (24×24, stroke = currentColor).
const paths = {
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16',
  collection: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  chevronDown: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  locate: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  hook: 'M12 3v9a4 4 0 1 1-8 0M12 3l3 3M12 3 9 6',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
}

export function Icon({ name, size = 24, strokeWidth = 2, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

/**
 * Padlock. `open`: the shackle swings up (animated when it changes).
 * Sized by its container (viewBox 78×108, the body is 78×60 at the bottom).
 */
export function LockIcon({ open = false, className = '' }) {
  return (
    <svg className={`lock-icon ${open ? 'is-open' : ''} ${className}`} viewBox="0 0 78 108" fill="none" aria-hidden="true">
      <path className="lock-icon-shackle" d="M17 50V31a22 22 0 0 1 44 0v19" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      <rect x="2" y="46" width="74" height="60" rx="12" fill="currentColor" />
      <circle className="lock-icon-hole" cx="39" cy="72" r="6" />
      <rect className="lock-icon-hole" x="36" y="74" width="6" height="14" rx="3" />
    </svg>
  )
}
