import { create } from 'zustand'
import { getDocuments } from '../services/api'

export const useStore = create((set) => ({
  documents: [],
  currentDocument: null,
  chatMessages: [],
  loading: false,
  error: null,
  uploadProgress: 0,

  setDocuments: (documents) => set({ documents }),
  setCurrentDocument: (doc) => set({ currentDocument: doc }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  clearChatMessages: () => set({ chatMessages: [] }),

  setChatMessages: (messages) => set({ chatMessages: messages }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  fetchDocuments: async () => {
  set({ loading: true })
  try {
    const response = await getDocuments()
    // Backend returns: { documents: [...] }
    const docsArray = response.data.documents || []
    set({ documents: docsArray })
  } catch (err) {
    set({ error: err.message })
  } finally {
    set({ loading: false })
  }
},

  reset: () =>
    set({
      documents: [],
      currentDocument: null,
      chatMessages: [],
      loading: false,
      error: null,
      uploadProgress: 0,
    }),
}))