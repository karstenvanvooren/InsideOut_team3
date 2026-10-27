import { useProgress } from '../lib/useProgress.js'

// Testing helper: wipes all saved progress on this device.
export default function ResetButton() {
  const { reset } = useProgress()

  const onClick = () => {
    if (window.confirm('Reset all progress on this device?')) reset()
  }

  return (
    <button type="button" className="btn btn-danger btn-block" onClick={onClick}>
      Reset progress (testing)
    </button>
  )
}
