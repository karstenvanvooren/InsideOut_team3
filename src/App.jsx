import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import PhaseScreen from './game/PhaseScreen.jsx'
import Hook from './pages/Hook.jsx'
import Collection from './pages/Collection.jsx'
import NotFound from './pages/NotFound.jsx'

// "/" is the whole game (one screen per phase). /hook/:qrId is the phone-camera
// deep link for the start QR and the hooks. /collection can be opened from the game.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PhaseScreen />} />
        <Route path="hook/:qrId" element={<Hook />} />
        <Route path="collection" element={<Collection />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
