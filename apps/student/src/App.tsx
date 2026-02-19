import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Join from './pages/Join'
import Lobby from './pages/Lobby'
import Play from './pages/Play'
import { OfflineBanner } from './components/OfflineBanner'

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<Join />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/play/:code" element={<Play />} />
      </Routes>
    </BrowserRouter>
  )
}
