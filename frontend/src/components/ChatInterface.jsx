import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader, AlertCircle } from 'lucide-react'
import { sendMessage } from '../services/api'
import { useStore } from '../store/useStore'

export default function ChatInterface() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const { currentDocument, chatMessages, addChatMessage, setError } = useStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [chatMessages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !currentDocument) return

    const userMessage = { role: 'user', content: input, timestamp: new Date() }
    addChatMessage(userMessage)
    setInput('')
    setIsLoading(true)

    try {
      const response = await sendMessage(currentDocument.document_id, input)

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        relevantChunks: response.data.relevant_chunks,
      }
      addChatMessage(assistantMessage)
    } catch (error) {
      setError(error.message)
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.detail || 'Failed to get response'}`,
        timestamp: new Date(),
      }
      addChatMessage(errorMessage)
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
        <p className="font-semibold">{currentDocument.filename}</p>
        <p className="text-sm opacity-90">{currentDocument.chunks_count} chunks loaded</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p>Ask a question about your document...</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-900 rounded-bl-none'
                }`}
              >
                <p className="break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-4 py-2 rounded-lg rounded-bl-none">
              <Loader size={20} className="animate-spin text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            {isLoading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  )
}