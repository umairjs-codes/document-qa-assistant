import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

export const uploadFile = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  return api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(percentCompleted)
      }
    },
  })
}

export const sendMessage = async (documentId, message) => {
  return api.post('/api/chat', {
    document_id: documentId,
    message: message,
    conversation_history: [],
  })
}

export const getDocuments = async () => {
  return api.get('/api/documents')
}

export const deleteDocument = async (documentId) => {
  return api.delete(`/api/documents/${documentId}`)
}

export const healthCheck = async () => {
  return api.get('/api/health')
}

export default api