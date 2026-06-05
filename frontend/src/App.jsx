import React from 'react'
import FileUpload from './components/FileUpload'
import VideoQASidebar from './components/VideoQASidebar'
import ChatInterface from './components/ChatInterface'
import DocumentList from './components/DocumentList'
import { useStore } from './store/useStore'

export default function App() {
  const { error, setError, currentDocument } = useStore()

  // Use VideoQASidebar for audio/video, ChatInterface for PDFs
  const isMedia = currentDocument &&
    ['.mp3', '.mp4', '.wav', '.m4a', '.webm'].includes(
      (currentDocument.file_type || '').toLowerCase()
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-5 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-lg">📄</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Q&A Assistant</h1>
            <p className="text-blue-100 text-sm">
              Upload PDFs, audio or video — ask questions powered by AI
            </p>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold ml-4">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-1 space-y-5">
            <FileUpload />
            <DocumentList />
          </div>

          {/* Right column — Gemini sidebar for media, regular chat for PDF */}
          <div className="lg:col-span-2 min-h-[600px]">
            {isMedia
              ? <VideoQASidebar />
              : <ChatInterface />
            }
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-700 mt-16 py-6 text-center text-slate-400 text-sm">
        Document Q&A Assistant • Powered by Groq API • React + FastAPI
      </footer>
    </div>
  )
}