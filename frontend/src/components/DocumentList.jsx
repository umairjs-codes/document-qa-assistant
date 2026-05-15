import React, { useEffect } from 'react'
import { Trash2, FileText, Music, Video, Loader } from 'lucide-react'
import { deleteDocument } from '../services/api'
import { useStore } from '../store/useStore'

export default function DocumentList() {
  const { documents, currentDocument, setCurrentDocument, fetchDocuments, loading } = useStore()

  useEffect(() => {
    fetchDocuments()
  }, [])

  const getFileIcon = (type) => {
    if (type === '.pdf') return <FileText size={20} className="text-red-500" />
    if (['.mp3', '.wav', '.m4a'].includes(type)) return <Music size={20} className="text-purple-500" />
    if (['.mp4', '.webm'].includes(type)) return <Video size={20} className="text-blue-500" />
    return <FileText size={20} className="text-slate-500" />
  }

  const handleDelete = async (docId) => {
    if (window.confirm('Delete this document?')) {
      await deleteDocument(docId)
      await fetchDocuments()
      if (currentDocument?.document_id === docId) {
        setCurrentDocument(null)
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col max-h-64">
      {/* Header - Fixed height */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4 text-white flex-shrink-0">
        <h2 className="font-bold text-lg">Your Documents</h2>
      </div>

      {/* List - Scrollable */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200 min-h-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <Loader size={24} className="mx-auto animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No documents yet. Upload one to get started!</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.document_id}
              onClick={() => setCurrentDocument(doc)}
              className={`p-4 cursor-pointer hover:bg-slate-50 transition flex items-center justify-between gap-2 flex-shrink-0 ${
                currentDocument?.document_id === doc.document_id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
              }`}
            >
              {/* Left side: Icon and text */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate text-xs">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-slate-500">{doc.chunks_count} chunks</p>
                </div>
              </div>

              {/* Right side: Delete button - always visible */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(doc.document_id)
                }}
                className="p-2 hover:bg-red-100 text-red-600 rounded transition flex-shrink-0"
                title="Delete document"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}