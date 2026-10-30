import { Navigate, useParams } from 'react-router-dom'

// Phone-camera deep link for every QR (start + hooks): /hook/:qrId.
// Hands the scan to the phase screen ("/"), which runs the same checks as the in-app scanner.
export default function Hook() {
  const { qrId } = useParams()
  return <Navigate to="/" replace state={{ scanned: qrId }} />
}
