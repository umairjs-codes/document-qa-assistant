# Document Q&A Assistant 📄

AI-powered question answering system for PDFs, audio, and video files using Groq API.

## Features

- ✅ **PDF Q&A** - Upload PDFs and ask questions about content
- ✅ **Audio Transcription** - Transcribe audio files using Groq Whisper API
- ✅ **Video Transcription** - Extract audio from video and transcribe
- ✅ **AI Chat** - Real-time Q&A using Groq LLM
- ✅ **File Management** - Upload, delete, and manage documents
- ✅ **Responsive UI** - Works on desktop and mobile

## Tech Stack

**Backend:**
- FastAPI (Python)
- Groq API (LLM & Whisper)
- PyPDF2 (PDF extraction)
- Uvicorn (ASGI server)

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Zustand (State management)
- Axios (HTTP client)

## Prerequisites

- Python 3.12+
- Node.js 16+
- Groq API Key (free from [console.groq.com](https://console.groq.com))

## Installation

### Backend Setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # On Windows
source venv/bin/activate     # On Mac/Linux

pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local (adjust VITE_API_URL if needed)
```

## Running the Application

### Start Backend

```bash
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

Backend will run on: `http://localhost:8000`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Usage

1. **Open the application** - Visit http://localhost:5173
2. **Upload a document** - Drag & drop PDF, audio, or video file
3. **Ask questions** - Type questions about the content
4. **Get AI responses** - Powered by Groq API

### Supported Formats

- **Documents**: PDF
- **Audio**: MP3, WAV, M4A
- **Video**: MP4, WebM

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/upload` - Upload file
- `GET /api/documents` - List documents
- `POST /api/chat` - Send message
- `DELETE /api/documents/{id}` - Delete document

## Project Structure
