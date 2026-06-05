import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Play, Clock, Send, Loader, Sparkles,
  ChevronRight, X, MessageSquare, List, Volume2, Video
} from 'lucide-react'
import { sendMessage } from '../services/api'
import { useStore } from '../store/useStore'
import axios from 'axios'

const API = 'http://localhost:8000'

// ── helpers ──────────────────────────────────────────────
function fmt(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  return `${m}:${s.toString().padStart(2,'0')}`
}

async function fetchSummaryWithTopics(documentId, fullText, groqKey) {
  // Ask the backend LLM to produce a structured summary with timestamps
  const prompt = `You are analyzing a transcribed video/audio. 
Given this transcript, do TWO things:

1. Write a 3-sentence summary of what the video is about.
2. List the main TOPICS covered, each with an approximate timestamp range from the transcript.

Format your response EXACTLY like this JSON (no markdown, no extra text):
{
  "summary": "...",
  "topics": [
    {"title": "Topic name", "start": 0, "end": 30, "description": "Brief description"},
    {"title": "Topic name", "start": 30, "end": 90, "description": "Brief description"}
  ],
  "suggested_questions": ["Question 1?", "Question 2?", "Question 3?"]
}

Transcript:
${fullText.slice(0, 4000)}`

  const res = await axios.post(`${API}/api/chat`, {
    document_id: documentId,
    message: prompt,
    conversation_history: []
  })
  // Try to parse JSON from the response
  const text = res.data.response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) } catch {}
  }
  return null
}

// ── TimestampPill ─────────────────────────────────────────
function TimestampPill({ start, end, onSeek }) {
  return (
    <button
      onClick={() => onSeek(start)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold
                 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200
                 transition-all hover:scale-105 active:scale-95 cursor-pointer"
    >
      <Play size={9} className="fill-blue-600 text-blue-600" />
      {fmt(start)}{end ? `–${fmt(end)}` : ''}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────
export default function VideoQASidebar() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState(null)      // {summary, topics, suggested_questions}
  const [allTimestamps, setAllTimestamps] = useState([])
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'topics'
  const [currentSeek, setCurrentSeek] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const playerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const chatRef = useRef(null)

  const { currentDocument, chatMessages, addChatMessage, setError } = useStore()

  const isMedia = currentDocument &&
    ['.mp3', '.mp4', '.wav', '.m4a', '.webm'].includes(
      (currentDocument.file_type || '').toLowerCase()
    )
  const isVideo = currentDocument &&
    ['.mp4', '.webm'].includes((currentDocument.file_type || '').toLowerCase())

  const mediaUrl = currentDocument
    ? `${API}/api/media/${currentDocument.document_id}_${encodeURIComponent(currentDocument.filename)}`
    : null

  // Auto-load timestamps + summary when document changes
  useEffect(() => {
    if (!currentDocument || !isMedia) {
      setSummary(null)
      setAllTimestamps([])
      return
    }
    loadTimestamps(currentDocument.document_id)
  }, [currentDocument?.document_id])

  const loadTimestamps = async (docId) => {
    try {
      const res = await axios.get(`${API}/api/documents/${docId}/timestamps`)
      setAllTimestamps(res.data.timestamps || [])
    } catch (e) {
      console.warn('Could not load timestamps:', e)
    }
  }

  const handleSummarize = async () => {
    if (!currentDocument || isSummarizing) return
    setIsSummarizing(true)
    setActiveTab('topics')
    try {
      const result = await fetchSummaryWithTopics(
        currentDocument.document_id,
        chatMessages.map(m => m.content).join(' ')
      )
      setSummary(result)
    } catch (e) {
      console.error('Summary error:', e)
    } finally {
      setIsSummarizing(false)
    }
  }

  // Seek + play
  useEffect(() => {
    if (playerRef.current && currentSeek !== null) {
      playerRef.current.currentTime = currentSeek
      playerRef.current.play().catch(() => {})
    }
  }, [currentSeek])

  const handleSeek = useCallback((sec) => {
    if (currentSeek === sec) {
      setCurrentSeek(null)
      setTimeout(() => setCurrentSeek(sec), 60)
    } else {
      setCurrentSeek(sec)
    }
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentSeek])

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = async (text) => {
    const msg = text || input
    if (!msg.trim() || !currentDocument) return
    setInput('')
    addChatMessage({ role: 'user', content: msg, timestamp: new Date() })
    setIsLoading(true)
    setActiveTab('chat')
    try {
      const res = await sendMessage(currentDocument.document_id, msg)
      addChatMessage({
        role: 'assistant',
        content: res.data.response,
        timestamp: new Date(),
        relevantTimestamps: res.data.relevant_timestamps || []
      })
    } catch (e) {
      setError(e.message)
      addChatMessage({ role: 'assistant', content: 'Error: ' + (e.response?.data?.detail || e.message), timestamp: new Date(), relevantTimestamps: [] })
    } finally {
      setIsLoading(false)
    }
  }

  // ── No document ──
  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-96
                      bg-gradient-to-br from-slate-50 to-blue-50
                      rounded-2xl border-2 border-dashed border-slate-200 p-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
          <Sparkles size={28} className="text-blue-600" />
        </div>
        <p className="text-lg font-bold text-slate-700">Upload a file to start</p>
        <p className="text-sm text-slate-400 mt-1 text-center">
          PDF, MP3, MP4, WAV, or WebM
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
         style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800
                      text-white flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">
            {currentDocument.filename}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentDocument.chunks_count} segments
            {isMedia && allTimestamps.length > 0 && ` • ${allTimestamps.length} timestamps`}
          </p>
        </div>
      </div>

      {/* ── Media Player ── */}
      {isMedia && mediaUrl && (
        <div className="flex-shrink-0 bg-black">
          {isVideo ? (
            <video ref={playerRef} controls className="w-full max-h-48" src={mediaUrl} />
          ) : (
            <div className="px-4 py-3 bg-slate-900">
              <audio ref={playerRef} controls className="w-full" src={mediaUrl} />
            </div>
          )}
        </div>
      )}

      {/* ── Action Buttons ── */}
      {isMedia && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto">
          <button
            onClick={handleSummarize}
            disabled={isSummarizing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                       bg-blue-600 hover:bg-blue-700 text-white transition-all flex-shrink-0
                       disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isSummarizing ? <Loader size={11} className="animate-spin" /> : <Sparkles size={11} />}
            Summarise the video
          </button>
          {['What topics are covered?', 'Key takeaways?'].map(q => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                         bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex-shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      {isMedia && (
        <div className="flex-shrink-0 flex border-b border-slate-100">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'topics', label: 'Topics & Timestamps', icon: List },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold
                          border-b-2 transition-all flex-1 justify-center
                          ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Topics Tab ── */}
      {activeTab === 'topics' && isMedia && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isSummarizing && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
              <Loader size={18} className="animate-spin text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-700">Analysing video...</p>
                <p className="text-xs text-blue-500">Extracting topics and timestamps</p>
              </div>
            </div>
          )}

          {summary && !isSummarizing && (
            <>
              {/* Summary card */}
              <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-blue-600" />
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Summary</p>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{summary.summary}</p>
              </div>

              {/* Topics with timestamps */}
              {summary.topics && summary.topics.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
                    Core Concepts Covered
                  </p>
                  <div className="space-y-2">
                    {summary.topics.map((topic, i) => (
                      <div key={i}
                           className="flex items-start gap-3 p-3 rounded-xl bg-slate-50
                                      hover:bg-slate-100 transition-colors group">
                        <button
                          onClick={() => handleSeek(topic.start)}
                          className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700
                                     flex items-center justify-center transition-all
                                     group-hover:scale-110 shadow-sm mt-0.5"
                        >
                          <Play size={12} className="fill-white text-white ml-0.5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-800">{topic.title}</p>
                            <span className="text-xs font-mono text-blue-600 bg-blue-50
                                           border border-blue-100 px-1.5 py-0.5 rounded">
                              {fmt(topic.start)}
                              {topic.end ? ` – ${fmt(topic.end)}` : ''}
                            </span>
                          </div>
                          {topic.description && (
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              {topic.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested questions */}
              {summary.suggested_questions && summary.suggested_questions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
                    Ask a question
                  </p>
                  <div className="space-y-1.5">
                    {summary.suggested_questions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(q)}
                        className="w-full text-left flex items-center gap-2 px-3 py-2.5
                                   rounded-xl bg-white border border-slate-200
                                   hover:border-blue-300 hover:bg-blue-50
                                   text-sm text-slate-700 font-medium transition-all group"
                      >
                        <ChevronRight size={14} className="text-blue-400 flex-shrink-0
                                                           group-hover:text-blue-600 transition-colors" />
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* All raw timestamps list */}
          {allTimestamps.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
                All Transcript Segments ({allTimestamps.length})
              </p>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {allTimestamps.map((ts, i) => (
                  <button
                    key={i}
                    onClick={() => handleSeek(ts.start)}
                    className="w-full text-left flex items-start gap-2.5 px-3 py-2
                               rounded-lg hover:bg-slate-100 transition-colors group"
                  >
                    <span className="flex-shrink-0 text-xs font-mono font-bold text-blue-600
                                     bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 min-w-[3rem] text-center">
                      {fmt(ts.start)}
                    </span>
                    <span className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {ts.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isSummarizing && !summary && allTimestamps.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Clock size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Click "Summarise the video" to extract topics</p>
            </div>
          )}
        </div>
      )}

      {/* ── Chat Tab ── */}
      {(activeTab === 'chat' || !isMedia) && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" ref={chatRef}>

          {/* Suggested questions when chat is empty */}
          {chatMessages.length === 0 && isMedia && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                Try asking
              </p>
              {[
                'What is this video about?',
                'What are the key points covered?',
                'Summarize the main topics',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="w-full text-left flex items-center gap-2 px-4 py-3
                             rounded-xl border border-slate-200 hover:border-blue-300
                             hover:bg-blue-50 text-sm text-slate-700 font-medium
                             transition-all group bg-white shadow-sm"
                >
                  <ChevronRight size={14} className="text-blue-400 group-hover:text-blue-600 flex-shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          )}

          {chatMessages.length === 0 && !isMedia && (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Ask a question about the document</p>
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center
                                flex-shrink-0 mr-2 mt-1">
                  <Sparkles size={12} className="text-white" />
                </div>
              )}
              <div className={`max-w-xs rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-br-sm text-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm text-sm'
              }`}>
                <p className="leading-relaxed break-words">{msg.content}</p>

                {/* Timestamp badges */}
                {msg.role === 'assistant' && msg.relevantTimestamps?.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200">
                    <p className="text-xs text-slate-400 mb-1.5 font-medium">Jump to:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.relevantTimestamps.map((ts, ti) => (
                        <TimestampPill key={ti} start={ts.start} end={ts.end} onSeek={handleSeek} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Sparkles size={12} className="text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                         style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Input ── */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 bg-white">
        <form onSubmit={(e) => { e.preventDefault(); handleSend() }}
              className="flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about this video..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400
                       outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700
                       disabled:bg-slate-300 flex items-center justify-center
                       transition-all flex-shrink-0"
          >
            {isLoading
              ? <Loader size={13} className="animate-spin text-white" />
              : <Send size={13} className="text-white ml-0.5" />}
          </button>
        </form>
      </div>

    </div>
  )
}