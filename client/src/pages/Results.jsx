import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useState } from 'react'

export default function Results() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [files, setFiles] = useState(null)
  const [generating, setGenerating] = useState(false)

  if (!state) {
    navigate('/')
    return null
  }

  const { result, analysis } = state

  const gradeColor = {
    A: 'text-green-400',
    B: 'text-blue-400',
    C: 'text-yellow-400',
    D: 'text-orange-400',
    F: 'text-red-400'
  }

  async function handleGenerate() {
  setGenerating(true)
  try {
    const res = await axios.post('http://localhost:3001/generate', {
      // WHY: use real project name extracted from page title
      // instead of hardcoded "My Project"
      name: analysis.projectName || analysis.title || 'My Project',
      description: analysis.metaDescription || 'A project audited by AEO Studio',
      headings: analysis.headings.map(h => ({ text: h })),
      tokenCount: analysis.tokenCount,
      wordCount: analysis.wordCount,
      codeBlocks: analysis.codeBlocks,
      // WHY: pass all crawled pages
      // so llms.txt lists every page properly
      allPages: analysis.allPages || []
    })
    setFiles(res.data.files)
  } catch (err) {
    console.error('Generate error:', err.message)
  }
  setGenerating(false)
}

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">

      {/* Score */}
      <div className="text-center mb-10">
        <p className="text-gray-400 mb-2">Your AEO Score</p>
        <p className={`text-8xl font-bold ${gradeColor[result.grade]}`}>
          {result.grade}
        </p>
        <p className="text-gray-300 text-xl mt-2">{result.score} / 100</p>
      </div>

      {/* Findings */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4">Findings</h3>
        <div className="flex flex-col gap-3">
          {result.findings.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={
                f.type === 'success' ? 'text-green-400' :
                f.type === 'error' ? 'text-red-400' : 'text-yellow-400'
              }>
                {f.type === 'success' ? '✅' : f.type === 'error' ? '❌' : '⚠️'}
              </span>
              <div>
                <p className="text-xs text-gray-500">{f.category}</p>
                <p className="text-sm text-gray-200">{f.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pages found */}
      {analysis.allPages && analysis.allPages.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-lg mb-2">
            Pages Scanned ({analysis.allPages.length})
          </h3>
          <div className="flex flex-col gap-2">
            {analysis.allPages.map((page, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-300 truncate max-w-xs">
                  {page.title || page.url}
                </span>
                <span className="text-gray-500 ml-4">
                  ~{page.tokenCount} tokens
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Info */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-lg mb-2">Token Analysis</h3>
        <p className="text-gray-400 text-sm">Total tokens: <span className="text-white font-bold">{analysis.tokenCount}</span></p>
        <p className="text-gray-400 text-sm">Status: <span className={
          analysis.tokenStatus.status === 'good' ? 'text-green-400' :
          analysis.tokenStatus.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
        }>{analysis.tokenStatus.message}</span></p>
      </div>

      {/* Generate Files */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-lg mb-2">Generate AEO Files</h3>
        <p className="text-gray-400 text-sm mb-4">Auto-generate llms.txt, AGENTS.md and skill.md for your project</p>
        
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition"
        >
          {generating ? 'Generating...' : 'Generate Files →'}
        </button>

        {files && (
          <div className="mt-4 flex flex-col gap-3">
            {Object.entries(files).map(([filename, content]) => (
              <div key={filename} className="flex justify-between items-center bg-gray-800 px-4 py-3 rounded-xl">
                <span className="text-sm text-gray-300">{filename}</span>
                <button
                  onClick={() => downloadFile(filename, content)}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  Download ↓
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back */}
      <button
        onClick={() => navigate('/audit')}
        className="w-full border border-gray-700 text-gray-400 hover:text-white py-3 rounded-xl transition"
      >
        ← Run Another Audit
      </button>

    </div>
  )
}