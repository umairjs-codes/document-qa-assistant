import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader, Play, Clock, Volume2 } from 'lucide-react'
import { sendMessage } from '../services/api'
import { useStore } from '../store/useStore'

// Converts seconds to MM:SS  e.g. 75.3 => "1:15"
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ChatInterface() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSeek, setCurrentSeek] = useState(null)
  const playerRef = useRef(null)
  const messagesEndRef = useRef(null)

  const { currentDocument, chatMessages, addChatMessage, setError } = useStore()

  const isMediaFile = currentDocument &&
    ['.mp3', '.mp4', '.wav', '.m4a', '.webm'].includes(
      (currentDocument.file_type || '').toLowerCase()
    )

  const isVideo = currentDocument &&
    ['.mp4', '.webm'].includes(
      (currentDocument.file_type || '').toLowerCase()
    )

  // Use document_id + filename in URL — backend finds file by UUID prefix
  const mediaUrl = currentDocument
    ? `http://localhost:8000/api/media/${currentDocument.document_id}_${encodeURIComponent(currentDocument.filename)}`
    : null

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [chatMessages])

  // Seek + play whenever currentSeek changes
  useEffect(() => {
    if (playerRef.current && currentSeek !== null) {
      console.log(`Seeking to ${currentSeek}s`)
      playerRef.current.currentTime = currentSeek
      playerRef.current.play().catch((e) => {
        console.warn('Autoplay blocked by browser:', e)
      })
    }
  }, [currentSeek])

  const handlePlayTimestamp = (startSeconds) => {
    console.log(`Play button clicked: ${startSeconds}s`)
    if (playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    if (currentSeek === startSeconds) {
      setCurrentSeek(null)
      setTimeout(() => setCurrentSeek(startSeconds), 80)
    } else {
      setCurrentSeek(startSeconds)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !currentDocument) return

    const userMessage = { role: 'user', content: input, timestamp: new Date() }
    addChatMessage(userMessage)
    setInput('')
    setIsLoading(true)

    try {
      const response = await sendMessage(currentDocument.document_id, input)
      addChatMessage({
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        relevantChunks: response.data.relevant_chunks,
        relevantTimestamps: response.data.relevant_timestamps || []
      })
    } catch (error) {
      setError(error.message)
      addChatMessage({
        role: 'assistant',
        content: `Error: ${error.response?.data?.detail || 'Failed to get response'}`,
        timestamp: new Date(),
        relevantTimestamps: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentDocument) {
    return (
      <div className="h-96 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300">
        <div className="text-center text-slate-500">
          <p className="text-lg font-semibold">Upload a document first</p>
          <p className="text-sm mt-1">Then you can start asking questions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white flex-shrink-0">
        <p className="font-semibold truncate">{currentDocument.filename}</p>
        <p className="text-sm opacity-90">
          {currentDocument.chunks_count} chunks loaded
          {isMediaFile && ' • Audio/Video – timestamps enabled'}
        </p>
      </div>

      {/* Inline Media Player */}
      {isMediaFile && mediaUrl && (
        <div className="px-4 pt-3 pb-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 size={14} className="text-blue-600" />
            <p className="text-xs font-semibold text-slate-600">
              Click any timestamp badge below to jump and play
            </p>
          </div>
          {isVideo ? (
            <video
              ref={playerRef}
              controls
              className="w-full rounded-lg max-h-52 bg-black"
              src={mediaUrl}
            />
          ) : (
            <audio
              ref={playerRef}
              controls
              className="w-full"
              src={mediaUrl}
            />
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p>Ask a question about your {isMediaFile ? 'audio/video' : 'document'}...</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-100 text-slate-900 rounded-bl-none'
              }`}>
                <p className="break-words leading-relaxed">{msg.content}</p>

                {/* Timestamp Badges */}
                {msg.role === 'assistant' &&
                  msg.relevantTimestamps &&
                  msg.relevantTimestamps.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-300">
                      <p className="text-xs text-slate-500 mb-2">
                        Jump to relevant moment{msg.relevantTimestamps.length > 1 ? 's' : ''}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.relevantTimestamps.map((ts, tsIdx) => (
                          <button
                            key={tsIdx}
                            onClick={() => handlePlayTimestamp(ts.start)}
                            title={ts.text}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5
                                       rounded-full text-xs font-semibold cursor-pointer
                                       bg-blue-600 hover:bg-blue-700 active:scale-95
                                       text-white shadow transition-all"
                          >
                            <Play size={10} className="fill-white" />
                            <Clock size={10} />
                            {formatTime(ts.start)}
                            {ts.end ? ` – ${formatTime(ts.end)}` : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-none">
              <Loader size={20} className="animate-spin text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4 bg-slate-50 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isMediaFile ? 'Ask about the audio/video content...' : 'Ask a question...'}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300
                       text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {isLoading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>

    </div>
  )
}