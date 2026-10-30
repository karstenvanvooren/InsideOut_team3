import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Hook from './pages/Hook.jsx'
import Riddle from './pages/Riddle.jsx'
import Chapter from './pages/Chapter.jsx'
import Collection from './pages/Collection.jsx'
import Finale from './pages/Finale.jsx'
import Share from './pages/Share.jsx'
import Scan from './pages/Scan.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="hook/:id" element={<Hook />} />
        <Route path="riddle/:id" element={<Riddle />} />
        <Route path="chapter/:id" element={<Chapter />} />
        <Route path="collection" element={<Collection />} />
        <Route path="finale" element={<Finale />} />
        <Route path="share" element={<Share />} />
        <Route path="scan" element={<Scan />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
