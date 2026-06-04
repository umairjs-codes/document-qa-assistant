from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
from app.config import settings

router = APIRouter()


@router.get("/media/{filename}")
async def serve_media(filename: str):
    """
    Serve uploaded audio/video files to the frontend media player.
    The frontend requests e.g. GET /api/media/my_audio.mp3
    """
    # Security: strip any directory traversal
    safe_filename = os.path.basename(filename)

    # Search in the uploads directory
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    if not os.path.exists(file_path):
        # Also try searching for files that start with the given name
        # (since we store files as {uuid}_{original_name})
        upload_dir = settings.UPLOAD_DIR
        if os.path.exists(upload_dir):
            for f in os.listdir(upload_dir):
                if f.endswith(safe_filename) or safe_filename in f:
                    file_path = os.path.join(upload_dir, f)
                    break

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Media file not found: {safe_filename}")

    # Determine media type
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