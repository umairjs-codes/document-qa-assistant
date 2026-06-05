from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
from app.config import settings
from app.services.document_service import DocumentService

router = APIRouter()
doc_service = DocumentService()


@router.get("/media/{document_id}")
async def serve_media(document_id: str):
    """
    Serve uploaded audio/video files to the frontend media player.
    Uses document_id to find the correct file in the uploads folder.
    """
    # Look up the file path from document service memory
    if document_id in doc_service.documents_db:
        file_path = doc_service.documents_db[document_id]["file_path"]
        
        if os.path.exists(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            media_type_map = {
                ".mp3": "audio/mpeg",
                ".wav": "audio/wav",
                ".m4a": "audio/mp4",
                ".mp4": "video/mp4",
                ".webm": "video/webm",
            }
            media_type = media_type_map.get(ext, "application/octet-stream")
            
            return FileResponse(
                path=file_path,
                media_type=media_type,
                headers={"Accept-Ranges": "bytes"}
            )

    # Fallback: search uploads folder for file starting with document_id
    upload_dir = settings.UPLOAD_DIR
    if os.path.exists(upload_dir):
        for f in os.listdir(upload_dir):
            if f.startswith(document_id):
                file_path = os.path.join(upload_dir, f)
                ext = os.path.splitext(file_path)[1].lower()
                media_type_map = {
                    ".mp3": "audio/mpeg",
                    ".wav": "audio/wav",
                    ".m4a": "audio/mp4",
                    ".mp4": "video/mp4",
                    ".webm": "video/webm",
                }
                media_type = media_type_map.get(ext, "application/octet-stream")
                return FileResponse(
                    path=file_path,
                    media_type=media_type,
                    headers={"Accept-Ranges": "bytes"}
                )

    raise HTTPException(
        status_code=404,
        detail=f"Media file not found for document: {document_id}"
    )