import { Icon } from './icons.jsx'

/** The tile that stands for a hook (toast, collection). */
export function HookThumb({ className = '' }) {
  return (
    <span className={`hook-thumb ${className}`} aria-hidden="true">
      <Icon name="hook" size={24} strokeWidth={2.2} />
    </span>
  )
}
