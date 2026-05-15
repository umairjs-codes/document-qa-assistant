import PyPDF2
import os
from typing import List
from datetime import datetime
from groq import Groq
from app.config import settings

# Global persistent storage
_documents_db = {}

class DocumentService:
    """Handle document processing (PDF, audio, video with Whisper transcription)"""
    
    def __init__(self):
        global _documents_db
        self.documents_db = _documents_db
        self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
    
    async def process_document(self, file_path: str, doc_id: str, file_ext: str) -> List[str]:
        """Process document and return chunks"""
        
        print(f"DEBUG: Processing document {doc_id} with extension {file_ext}")
        
        if file_ext == ".pdf":
            text = await self._extract_pdf_text(file_path)
        elif file_ext in [".mp3", ".mp4", ".wav", ".m4a", ".webm"]:
            # Transcribe audio/video using Groq Whisper
            text = await self._transcribe_audio(file_path, file_ext)
        else:
            text = ""
        
        # Split into chunks
        chunks = self._chunk_text(text, chunk_size=1000, overlap=200)
        
        print(f"DEBUG: Extracted {len(chunks)} chunks from {file_path}")
        print(f"DEBUG: First chunk preview: {chunks[0][:200] if chunks else 'No chunks'}")
        
        # Store in global memory
        self.documents_db[doc_id] = {
            "filename": os.path.basename(file_path),
            "file_path": file_path,
            "text": text,
            "chunks": chunks,
            "created_at": str(datetime.now()),
            "file_type": file_ext
        }
        
        print(f"DEBUG: Stored document {doc_id} with {len(chunks)} chunks")
        print(f"DEBUG: Total documents in memory: {len(self.documents_db)}")
        
        return chunks
    
    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                num_pages = len(reader.pages)
                print(f"DEBUG: PDF has {num_pages} pages")
                
                for page_num, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    text += page_text + "\n"
                    print(f"DEBUG: Extracted page {page_num + 1}: {len(page_text)} chars")
                
                print(f"DEBUG: Total text extracted: {len(text)} chars")
        except Exception as e:
            print(f"ERROR extracting PDF: {e}")
            text = "[Error extracting PDF content]"
        
        if not text or len(text.strip()) == 0:
            print("WARNING: No text extracted from PDF!")
            text = "[PDF content could not be extracted]"
        
        return text
    
    async def _transcribe_audio(self, file_path: str, file_ext: str) -> str:
        """
        Transcribe audio/video file using Groq Whisper API
        
        Supported formats:
        - Audio: .mp3, .wav, .m4a
        - Video: .mp4, .webm
        """
        filename = os.path.basename(file_path)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        
        print(f"DEBUG: Starting transcription for {filename} ({file_size_mb:.2f} MB)")
        print(f"DEBUG: File type: {file_ext}")
        
        try:
            # Open audio file in binary mode
            with open(file_path, "rb") as audio_file:
                print(f"DEBUG: Sending to Groq Whisper API...")
                
                # Determine mime type based on extension
                mime_type_map = {
                    ".mp3": "audio/mpeg",
                    ".wav": "audio/wav",
                    ".m4a": "audio/mp4",
                    ".mp4": "video/mp4",
                    ".webm": "video/webm"
                }
                
                mime_type = mime_type_map.get(file_ext, f"audio/{file_ext[1:]}")
                
                # Call Groq Whisper API
                transcript = self.groq_client.audio.transcriptions.create(
                    file=(filename, audio_file, mime_type),
                    model="whisper-large-v3-turbo",  # Fast turbo model
                    language="en"  # English language
                )
                
                transcribed_text = transcript.text
                print(f"DEBUG: Transcription complete! Length: {len(transcribed_text)} chars")
                print(f"DEBUG: Preview: {transcribed_text[:200]}")
                
                if not transcribed_text or len(transcribed_text.strip()) == 0:
                    print("WARNING: Transcription returned empty text!")
                    return "[Audio transcription returned empty content]"
                
                # Return transcribed text
                return transcribed_text
        
        except Exception as e:
            error_msg = str(e)
            print(f"ERROR during transcription: {error_msg}")
            
            # Return fallback message with details
            fallback_text = f"""
TRANSCRIPTION ERROR
===================

File: {filename}
Type: {file_ext}
Size: {file_size_mb:.2f} MB

Error Details: {error_msg}

Possible causes:
1. File format not supported by Whisper
2. Audio quality too poor
3. Audio too long (max ~25 minutes recommended)
4. API rate limit exceeded
5. Network connectivity issue

Troubleshooting:
- Try a shorter audio file (under 25 minutes)
- Ensure audio is clear and in supported format
- Check your internet connection
- Wait a moment and try again
- Verify your Groq API key is valid

Supported formats:
- Audio: MP3, WAV, M4A
- Video: MP4, WebM
"""
            return fallback_text
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size]
            if chunk.strip():
                chunks.append(chunk)
        
        if not chunks:
            chunks = [text]
        
        print(f"DEBUG: Created {len(chunks)} chunks from text")
        return chunks
    
    async def search_chunks(self, doc_id: str, query: str, top_k: int = 5) -> List[str]:
        """Find relevant chunks"""
        print(f"DEBUG: Searching for '{query}' in document {doc_id}")
        print(f"DEBUG: Available documents: {list(self.documents_db.keys())}")
        
        if doc_id not in self.documents_db:
            print(f"ERROR: Document {doc_id} not found!")
            return []
        
        doc_data = self.documents_db[doc_id]
        chunks = doc_data.get("chunks", [])
        
        print(f"DEBUG: Found {len(chunks)} chunks in document")
        
        if not chunks:
            print("DEBUG: No chunks available!")
            return []
        
        # Improved relevance scoring
        scored_chunks = []
        query_words = [word.lower() for word in query.split() if len(word) > 2]
        
        print(f"DEBUG: Query words: {query_words}")
        
        for chunk in chunks:
            chunk_lower = chunk.lower()
            # Count how many query words appear in this chunk
            score = sum(chunk_lower.count(word) for word in query_words)
            # Also check for exact phrase match
            if query.lower() in chunk_lower:
                score += 10
            
            if score > 0:
                scored_chunks.append((chunk, score))
        
        print(f"DEBUG: Found {len(scored_chunks)} chunks with matches")
        
        # If no relevant chunks found, return all chunks
        if not scored_chunks:
            print(f"DEBUG: No matching chunks, returning all chunks")
            return chunks[:top_k]
        
        # Sort by score and return top_k
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        result = [chunk for chunk, score in scored_chunks[:top_k]]
        
        print(f"DEBUG: Returning {len(result)} relevant chunks")
        return result
    
    async def get_full_text(self, doc_id: str) -> str:
        """Get full text of document"""
        if doc_id not in self.documents_db:
            return ""
        return self.documents_db[doc_id]["text"]
    
    async def store_summary(self, doc_id: str, summary: str):
        """Store summary in database"""
        if doc_id in self.documents_db:
            self.documents_db[doc_id]["summary"] = summary
    
    async def get_all_documents(self) -> List[dict]:
        """Get list of all documents"""
        return [
            {
                "document_id": doc_id,
                "filename": info["filename"],
                "created_at": info["created_at"],
                "chunks_count": len(info.get("chunks", [])),
                "file_type": info.get("file_type", "unknown")
            }
            for doc_id, info in self.documents_db.items()
        ]
    
    async def delete_document(self, doc_id: str):
        """Delete document"""
        if doc_id in self.documents_db:
            file_path = self.documents_db[doc_id]["file_path"]
            try:
                os.remove(file_path)
            except:
                pass
            del self.documents_db[doc_id]