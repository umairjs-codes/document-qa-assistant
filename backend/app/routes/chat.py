from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest, ChatResponse
from app.services.llm_service import GroqChatService
from app.services.document_service import DocumentService
from datetime import datetime
import json

router = APIRouter()
llm_service = GroqChatService()
doc_service = DocumentService()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message and get AI response based on document context.
    Also returns relevant timestamps for audio/video documents.
    """
    try:
        # Find relevant text chunks
        relevant_chunks = await doc_service.search_chunks(
            request.document_id,
            request.message,
            top_k=5
        )

        context = "\n".join(relevant_chunks) if relevant_chunks else "No relevant information found."

        # Get LLM response
        response = await llm_service.chat_with_context(
            query=request.message,
            context=context
        )

        # Find relevant timestamps (only for audio/video)
        relevant_timestamps = await doc_service.find_relevant_timestamps(
            request.document_id,
            request.message,
            top_k=3
        )

        print(f"DEBUG: Found {len(relevant_timestamps)} relevant timestamps for query")

        return ChatResponse(
            response=response,
            document_id=request.document_id,
            timestamp=datetime.now(),
            relevant_chunks=relevant_chunks[:2],
            relevant_timestamps=relevant_timestamps
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}/timestamps")
async def get_document_timestamps(document_id: str):
    """
    Get all timestamps for an audio/video document.
    Used to show full transcript with clickable timestamps.
    """
    timestamps = doc_service.get_all_timestamps(document_id)
    if not timestamps:
        return {"document_id": document_id, "timestamps": [], "message": "No timestamps available"}
    return {
        "document_id": document_id,
        "timestamps": timestamps,
        "count": len(timestamps)
    }


@router.get("/chat/stream")
async def chat_stream(doc_id: str, msg: str):
    """Streaming chat response for real-time updates"""
    async def generate():
        try:
            relevant_chunks = await doc_service.search_chunks(doc_id, msg, top_k=5)
            context = "\n".join(relevant_chunks) if relevant_chunks else "No context."

            async for chunk in llm_service.chat_stream(msg, context):
                yield f"data: {json.dumps({'token': chunk})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/summarize")
async def summarize_document(document_id: str):
    """Get a summary of the entire document"""
    try:
        all_text = await doc_service.get_full_text(document_id)
        summary = await llm_service.summarize(all_text)
        await doc_service.store_summary(document_id, summary)
        return {"summary": summary, "document_id": document_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))