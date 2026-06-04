import PyPDF2
import os
from typing import List, Dict
from datetime import datetime
from groq import Groq
from app.config import settings

# Global persistent storage
_documents_db = {}

class DocumentService:
    """Handle document processing - PDF, audio, video with timestamps"""

    def __init__(self):
        global _documents_db
        self.documents_db = _documents_db
        self.groq_client = Groq(api_key=settings.GROQ_API_KEY)

    async def process_document(self, file_path: str, doc_id: str, file_ext: str) -> List[str]:
        """Process document and return chunks"""
        print(f"DEBUG: Processing document {doc_id} with extension {file_ext}")

        if file_ext == ".pdf":
            text = await self._extract_pdf_text(file_path)
            timestamps = []
        elif file_ext in [".mp3", ".mp4", ".wav", ".m4a", ".webm"]:
            text, timestamps = await self._transcribe_audio_with_timestamps(file_path, file_ext)
        else:
            text = ""
            timestamps = []

        chunks = self._chunk_text(text, chunk_size=1000, overlap=200)

        print(f"DEBUG: Extracted {len(chunks)} chunks, {len(timestamps)} timestamp segments")
        print(f"DEBUG: First chunk preview: {chunks[0][:200] if chunks else 'No chunks'}")

        self.documents_db[doc_id] = {
            "filename": os.path.basename(file_path),
            "file_path": file_path,
            "text": text,
            "chunks": chunks,
            "timestamps": timestamps,   # [{start, end, text}, ...]
            "created_at": str(datetime.now()),
            "file_type": file_ext
        }

        print(f"DEBUG: Stored document {doc_id} with {len(chunks)} chunks and {len(timestamps)} timestamps")
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

    async def _transcribe_audio_with_timestamps(self, file_path: str, file_ext: str):
        """
        Transcribe audio/video using Groq Whisper with verbose_json to get timestamps.
        Returns (full_text, timestamps_list)
        timestamps_list = [{"start": 0.0, "end": 2.5, "text": "Hello world"}, ...]
        """
        filename = os.path.basename(file_path)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"DEBUG: Transcribing {filename} ({file_size_mb:.2f} MB) with timestamps...")

        mime_type_map = {
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".mp4": "video/mp4",
            ".webm": "video/webm"
        }
        mime_type = mime_type_map.get(file_ext, f"audio/{file_ext[1:]}")

        try:
            with open(file_path, "rb") as audio_file:
                print("DEBUG: Sending to Groq Whisper API (verbose_json for timestamps)...")

                # Use verbose_json response format to get word/segment timestamps
                transcript = self.groq_client.audio.transcriptions.create(
                    file=(filename, audio_file, mime_type),
                    model="whisper-large-v3-turbo",
                    response_format="verbose_json",
                    language="en"
                )

            # Extract full text
            full_text = transcript.text
            print(f"DEBUG: Transcription complete! Length: {len(full_text)} chars")

            # Extract segment-level timestamps
            timestamps = []
            if hasattr(transcript, 'segments') and transcript.segments:
                for segment in transcript.segments:
                    timestamps.append({
                        "start": round(float(segment.get("start", 0)), 2),
                        "end": round(float(segment.get("end", 0)), 2),
                        "text": segment.get("text", "").strip()
                    })
                print(f"DEBUG: Extracted {len(timestamps)} timestamp segments")
                if timestamps:
                    print(f"DEBUG: Sample timestamp: {timestamps[0]}")
            else:
                print("DEBUG: No segment timestamps available, generating estimated timestamps")
                # Fallback: estimate timestamps based on word count (~2.5 words/second)
                timestamps = self._estimate_timestamps(full_text)

            return full_text, timestamps

        except Exception as e:
            error_msg = str(e)
            print(f"ERROR during transcription: {error_msg}")
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
3. Audio too long (max ~25 minutes)
4. API rate limit exceeded

Please try a shorter audio file or a different format.
"""
            return fallback_text, []

    def _estimate_timestamps(self, text: str) -> List[Dict]:
        """
        Fallback: estimate timestamps by splitting text into ~10-second chunks.
        Assumes average speaking pace of ~2.5 words/second.
        """
        words = text.split()
        words_per_10s = 25  # ~2.5 words/sec × 10 sec
        timestamps = []
        for i in range(0, len(words), words_per_10s):
            chunk_words = words[i:i + words_per_10s]
            chunk_text = " ".join(chunk_words)
            start = round((i / max(len(words), 1)) * (len(words) / 2.5), 2)
            end = round(((i + len(chunk_words)) / max(len(words), 1)) * (len(words) / 2.5), 2)
            timestamps.append({"start": start, "end": end, "text": chunk_text})
        print(f"DEBUG: Generated {len(timestamps)} estimated timestamp segments")
        return timestamps

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
        """Find relevant chunks with improved scoring"""
        print(f"DEBUG: Searching for '{query}' in document {doc_id}")
        print(f"DEBUG: Available documents: {list(self.documents_db.keys())}")

        if doc_id not in self.documents_db:
            print(f"ERROR: Document {doc_id} not found!")
            return []

        doc_data = self.documents_db[doc_id]
        chunks = doc_data.get("chunks", [])
        print(f"DEBUG: Found {len(chunks)} chunks in document")

        if not chunks:
            return []

        scored_chunks = []
        query_words = [w.lower() for w in query.split() if len(w) > 2]
        for chunk in chunks:
            chunk_lower = chunk.lower()
            score = sum(chunk_lower.count(word) for word in query_words)
            if query.lower() in chunk_lower:
                score += 10
            if score > 0:
                scored_chunks.append((chunk, score))

        if not scored_chunks:
            return chunks[:top_k]

        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        result = [chunk for chunk, score in scored_chunks[:top_k]]
        print(f"DEBUG: Returning {len(result)} relevant chunks")
        return result

    async def find_relevant_timestamps(self, doc_id: str, query: str, top_k: int = 3) -> List[Dict]:
        """
        Find timestamps most relevant to the user's query.
        Returns list of {start, end, text} dicts sorted by relevance.
        """
        if doc_id not in self.documents_db:
            return []

        timestamps = self.documents_db[doc_id].get("timestamps", [])
        if not timestamps:
            return []

        query_words = [w.lower() for w in query.split() if len(w) > 2]
        scored = []
        for ts in timestamps:
            ts_text_lower = ts["text"].lower()
            score = sum(ts_text_lower.count(word) for word in query_words)
            if query.lower() in ts_text_lower:
                score += 10
            if score > 0:
                scored.append((ts, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [ts for ts, score in scored[:top_k]]

    def get_all_timestamps(self, doc_id: str) -> List[Dict]:
        """Return full list of timestamps for a document"""
        if doc_id not in self.documents_db:
            return []
        return self.documents_db[doc_id].get("timestamps", [])

    async def get_full_text(self, doc_id: str) -> str:
        if doc_id not in self.documents_db:
            return ""
        return self.documents_db[doc_id]["text"]

    async def store_summary(self, doc_id: str, summary: str):
        if doc_id in self.documents_db:
            self.documents_db[doc_id]["summary"] = summary

    async def get_all_documents(self) -> List[dict]:
        return [
            {
                "document_id": doc_id,
                "filename": info["filename"],
                "created_at": info["created_at"],
                "chunks_count": len(info.get("chunks", [])),
                "file_type": info.get("file_type", "unknown"),
                "has_timestamps": len(info.get("timestamps", [])) > 0,
                "timestamps_count": len(info.get("timestamps", []))
            }
            for doc_id, info in self.documents_db.items()
        ]

    async def delete_document(self, doc_id: str):
        if doc_id in self.documents_db:
            file_path = self.documents_db[doc_id]["file_path"]
            try:
                os.remove(file_path)
            except:
                pass
            del self.documents_db[doc_id]