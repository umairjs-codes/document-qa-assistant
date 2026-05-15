"""
FastAPI Backend - Document Q&A Application
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings  # ← CRITICAL IMPORT!

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Document Q&A API",
    description="AI-powered Q&A on documents, audio, and video",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "groq_configured": bool(settings.GROQ_API_KEY)
    }

# Placeholder for routers 
from app.routes import upload, chat
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
#     from app.routes import upload, chat
# app.include_router(upload.router, prefix="/api", tags=["Upload"])
# app.include_router(chat.router, prefix="/api", tags=["Chat"])