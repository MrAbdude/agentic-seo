import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Audit() {
  const [mode, setMode] = useState('url') // 'url' or 'paste'
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleAudit() {
    setLoading(true)
    setError('')
    try {
      const payload = mode === 'url' ? { url } : { text }
      const res = await axios.post('http://localhost:3001/audit', payload)
      navigate('/results', { state: res.data })
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your URL or try pasting text.')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      
      <h2 className="text-3xl font-bold mb-2">Audit Your Docs</h2>
      <p className="text-gray-400 mb-8">Enter a URL or paste your documentation</p>

      {/* Mode Toggle */}
      <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
        <button
          onClick={() => setMode('url')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'url' ? 'bg-blue-500 text-white' : 'text-gray-400'
          }`}
        >
          Enter URL
        </button>
        <button
          onClick={() => setMode('paste')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'paste' ? 'bg-blue-500 text-white' : 'text-gray-400'
          }`}
        >
          Paste Text
        </button>
      </div>

      {/* Input */}
      <div className="w-full max-w-xl">
        {mode === 'url' ? (
          <input
            type="text"
            placeholder="https://docs.yourproject.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        ) : (
          <textarea
            placeholder="Paste your documentation here..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        )}

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <button
          onClick={handleAudit}
          disabled={loading}
          className="w-full mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition"
        >
          {loading ? 'Analyzing...' : 'Run Audit →'}
        </button>
      </div>

    </div>
  )
}