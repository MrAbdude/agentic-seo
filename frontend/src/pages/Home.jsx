import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      
      {/* Badge */}
      <span className="bg-blue-900 text-blue-300 text-xs px-3 py-1 rounded-full mb-6">
        New Era of Documentation
      </span>

      {/* Heading */}
      <h1 className="text-5xl font-bold mb-4">
        Make Your Docs <br />
        <span className="text-blue-400">AI-Agent Ready</span>
      </h1>

      {/* Subheading */}
      <p className="text-gray-400 text-lg max-w-xl mb-4">
        AI agents like Claude and ChatGPT read your docs differently. 
        AEO Studio audits your content and generates the files they need.
      </p>

      {/* Problem statement */}
      <p className="text-gray-500 text-sm max-w-lg mb-8">
        Stop wasting tokens. Stop getting ignored by AI agents. 
        Get a score, fix the issues, download ready-made files.
      </p>

      {/* CTA Button */}
      <button
        onClick={() => navigate('/audit')}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl transition"
      >
        Audit My Docs →
      </button>

      {/* Stats */}
      <div className="flex gap-12 mt-16 text-center">
        <div>
          <p className="text-2xl font-bold text-white">10</p>
          <p className="text-gray-500 text-sm">Checks Run</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">100</p>
          <p className="text-gray-500 text-sm">Point Score</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">3</p>
          <p className="text-gray-500 text-sm">Files Generated</p>
        </div>
      </div>

    </div>
  )
}