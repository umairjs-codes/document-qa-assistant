import React from 'react'
import FileUpload from './components/FileUpload'
import ChatInterface from './components/ChatInterface'
import DocumentList from './components/DocumentList'
import { useStore } from './store/useStore'

export default function App() {
  const { error, setError } = useStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold">📄 Document Q&A Assistant</h1>
          <p className="text-blue-100 mt-2">
            Upload documents, audio, or video files and ask questions powered by AI
          </p>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <FileUpload />
            <DocumentList />
          </div>

          <div className="lg:col-span-2">
            <ChatInterface />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-700 mt-16 py-8 text-center text-slate-400">
        <p>Document Q&A Assistant • Powered by Groq API • React + FastAPI</p>
      </footer>
    </div>
  )
}