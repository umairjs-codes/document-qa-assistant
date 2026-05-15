from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from app.config import settings
from app.services.document_service import DocumentService
from app.models.schemas import UploadResponse
import os
from datetime import datetime
import uuid
 
router = APIRouter()
doc_service = DocumentService()
 
@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a PDF, audio, or video file for Q&A
    Supported: .pdf, .mp3, .mp4, .wav, .m4a, .webm
    """
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    try:
        # Generate unique document ID
        document_id = str(uuid.uuid4())
        
        # Save file
        file_path = os.path.join(settings.UPLOAD_DIR, f"{document_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Process document
        chunks = await doc_service.process_document(
            file_path,
            document_id,
            file_ext
        )
        
        return UploadResponse(
            document_id=document_id,
            filename=file.filename,
            file_type=file_ext,
            message="File uploaded and processed successfully",
            chunks_count=len(chunks)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )
 
 
@router.get("/documents")
async def list_documents():
    """Get list of uploaded documents"""
    # This is simplified - in production, query your database
    try:
        documents = await doc_service.get_all_documents()
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
 
@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    try:
        await doc_service.delete_document(document_id)
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))