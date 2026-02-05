import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Join from './pages/Join'
import Lobby from './pages/Lobby'
import Play from './pages/Play'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<Join />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/play/:code" element={<Play />} />
      </Routes>
    </BrowserRouter>
  )
}
