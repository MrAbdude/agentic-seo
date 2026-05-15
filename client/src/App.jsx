import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Audit from './pages/Audit'
import Results from './pages/Results'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </div>
  )
}