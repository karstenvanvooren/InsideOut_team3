import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Hook from './pages/Hook.jsx'
import NotFound from './pages/NotFound.jsx'

// "/" is the whole game (one screen per phase). /hook/:qrId is the phone-camera
// deep link for the start QR and the hooks. /collection can be opened from the game
// (Layout keeps the game mounted underneath it).
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* "/" and "/collection" are drawn by Layout: the map stays mounted under the stash */}
        <Route index element={null} />
        <Route path="hook/:qrId" element={<Hook />} />
        <Route path="collection" element={null} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
