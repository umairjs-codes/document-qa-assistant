from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
 
class UploadResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    message: str
    chunks_count: int
 
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None
 
class ChatRequest(BaseModel):
    document_id: str
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
 
class ChatResponse(BaseModel):
    response: str
    document_id: str
    timestamp: datetime
    tokens_used: Optional[int] = None
    relevant_chunks: Optional[List[str]] = []
 
class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    file_type: str
    created_at: datetime
    summary: Optional[str] = None
    chunks_count: int
 
class SummaryRequest(BaseModel):
    document_id: str
    max_length: Optional[int] = 500
 