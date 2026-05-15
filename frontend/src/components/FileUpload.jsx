import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { uploadFile } from '../services/api'
import { useStore } from '../store/useStore'

export default function FileUpload() {
  const [uploadStatus, setUploadStatus] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const setCurrentDocument = useStore((state) => state.setCurrentDocument)
  const fetchDocuments = useStore((state) => state.fetchDocuments)

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]

    const allowedExtensions = ['.pdf', '.mp3', '.mp4', '.wav', '.m4a', '.webm']
    const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`

    if (!allowedExtensions.includes(fileExtension)) {
      setUploadStatus('error')
      setStatusMessage(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`)
      return
    }

    setUploadStatus('uploading')
    setStatusMessage('Uploading and processing...')

    try {
      const response = await uploadFile(file, (progress) => {
        setUploadProgress(progress)
      })

      setUploadStatus('success')
      setStatusMessage(`✓ ${response.data.filename} uploaded successfully!`)
      setCurrentDocument(response.data)

      await fetchDocuments()

      setTimeout(() => {
        setUploadStatus(null)
        setUploadProgress(0)
      }, 3000)
    } catch (error) {
      setUploadStatus('error')
      const errorMsg = error.response?.data?.detail || error.message || 'Upload failed'
      setStatusMessage(errorMsg)
      console.error('Upload error:', error)
    }
  }, [setCurrentDocument, fetchDocuments])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  })

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg">
      <div
        {...getRootProps()}
        className={`p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-slate-300 hover:border-blue-400 bg-white'
        }`}
      >
        <input {...getInputProps()} />

        <div className="text-center">
          <Upload
            size={48}
            className={`mx-auto mb-4 ${
              isDragActive ? 'text-blue-500' : 'text-slate-400'
            }`}
          />

          {isDragActive ? (
            <p className="text-lg font-semibold text-blue-600">Drop files here...</p>
          ) : (
            <>
              <p className="text-lg font-semibold text-slate-800">
                Drag & drop your file here
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Supported: PDF, MP3, MP4, WAV, WebM (Max 100MB)
              </p>
            </>
          )}
        </div>
      </div>

      {uploadStatus && (
        <div
          className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
            uploadStatus === 'uploading'
              ? 'bg-blue-50 text-blue-700'
              : uploadStatus === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {uploadStatus === 'uploading' && <Loader size={20} className="animate-spin" />}
          {uploadStatus === 'success' && <CheckCircle size={20} />}
          {uploadStatus === 'error' && <AlertCircle size={20} />}

          <div>
            <p className="font-semibold">{statusMessage}</p>
            {uploadStatus === 'uploading' && (
              <div className="mt-2 bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}