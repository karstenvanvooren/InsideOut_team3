export default function ProgressBar({ value, max, label = 'Progress' }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="progress-label">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
