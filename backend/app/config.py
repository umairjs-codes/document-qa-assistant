import os
from dotenv import load_dotenv
 
load_dotenv()
 
class Settings:
    # API Keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    
    # Server
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    HOST = "0.0.0.0"
    PORT = 8000
    
    # Database
    MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME = "doc_qa_db"
    
    # File Upload
    MAX_FILE_SIZE = 104857600  # 100MB
    UPLOAD_DIR = "./uploads"
    ALLOWED_EXTENSIONS = {".pdf", ".mp3", ".mp4", ".wav", ".m4a", ".webm"}
    
    # CORS
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]
    
    # LLM
    LLM_MODEL = "llama-3.1-8b-instant"
    LLM_TEMPERATURE = 0.7
    LLM_MAX_TOKENS = 1000
 
settings = Settings()
 
 
