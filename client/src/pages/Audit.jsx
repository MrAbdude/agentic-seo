import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Audit() {
  const [mode, setMode] = useState('url') // 'url' | 'paste' | 'github' | 'zip'
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [zipFile, setZipFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleAudit() {
    setLoading(true)
    setError('')
    try {
      let res

      if (mode === 'url') {
        res = await axios.post('https://agentic-seo-system.up.railway.app/audit', { url })

      } else if (mode === 'paste') {
        res = await axios.post('https://agentic-seo-system.up.railway.app/audit', { text })

      } else if (mode === 'github') {
        res = await axios.post('https://agentic-seo-system.up.railway.app/audit-github', { githubUrl })

      } else if (mode === 'zip') {
        const formData = new FormData()
        formData.append('zip', zipFile)
        res = await axios.post('https://agentic-seo-system.up.railway.app/audit-zip', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      navigate('/results', { state: res.data })

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  const modes = [
    { id: 'url', label: 'URL' },
    { id: 'paste', label: 'Paste Text' },
    { id: 'github', label: 'GitHub Repo' },
    { id: 'zip', label: 'Upload ZIP' },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">

      <h2 className="text-3xl font-bold mb-2">Audit Your Docs</h2>
      <p className="text-gray-400 mb-8">Enter a URL, paste text, or import your codebase</p>

      {/* Mode Toggle */}
      <div className="flex bg-gray-800 rounded-xl p-1 mb-6 flex-wrap gap-1">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              mode === m.id ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="w-full max-w-xl">

        {mode === 'url' && (
          <input
            type="text"
            placeholder="https://docs.yourproject.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        )}

        {mode === 'paste' && (
          <textarea
            placeholder="Paste your documentation here..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        )}

        {mode === 'github' && (
          <input
            type="text"
            placeholder="https://github.com/username/repo"
            value={githubUrl}
            onChange={e => setGithubUrl(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        )}

        {mode === 'zip' && (
          <div className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-6 text-center">
            <input
              type="file"
              accept=".zip"
              onChange={e => setZipFile(e.target.files[0])}
              className="hidden"
              id="zip-upload"
            />
            <label htmlFor="zip-upload" className="cursor-pointer">
              {zipFile ? (
                <p className="text-white font-medium">{zipFile.name}</p>
              ) : (
                <>
                  <p className="text-gray-400 text-sm">Click to upload your project ZIP</p>
                  <p className="text-gray-600 text-xs mt-1">Max recommended: 50MB</p>
                </>
              )}
            </label>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <button
          onClick={handleAudit}
          disabled={loading || (mode === 'zip' && !zipFile)}
          className="w-full mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition"
        >
          {loading ? 'Analyzing...' : 'Run Audit →'}
        </button>

      </div>
    </div>
  )
}
