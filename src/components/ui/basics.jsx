// Small building blocks of the hi-fi style. Styles in src/styles/global.css.

/** 12px bold uppercase label. tone: 'burgundy' (default) or 'blue' (challenge cards). */
export function Eyebrow({ tone, className = '', children }) {
  return <div className={`eyebrow ${tone === 'blue' ? 'eyebrow-blue' : ''} ${className}`}>{children}</div>
}

/** Full-width burgundy button. Any extra props go to the <button>. */
export function PrimaryButton({ className = '', type = 'button', children, ...props }) {
  return (
    <button type={type} className={`btn btn-block ${className}`} {...props}>
      {children}
    </button>
  )
}

/** Rounded pill. tone: 'reward' (rose) or 'counter' (navy). */
export function Chip({ tone = 'reward', className = '', children }) {
  return <span className={`chip chip-${tone} ${className}`}>{children}</span>
}
