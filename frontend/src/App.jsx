import { useState, useEffect } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status === 'ok' ? 'Online' : 'Offline'))
      .catch(() => setApiStatus('Offline (Backend not running)'))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full text-2xl font-bold">
          🛒
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Role-Based E-Commerce
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            FastAPI + React.js + Tailwind CSS
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">Backend API Status:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              apiStatus === 'Online'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {apiStatus}
          </span>
        </div>

        <div className="text-xs text-slate-400">
          Tailwind CSS configured & ready for Milestone 2.
        </div>
      </div>
    </div>
  )
}

export default App
