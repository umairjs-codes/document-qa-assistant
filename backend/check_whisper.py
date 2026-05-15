#!/usr/bin/env python3
"""
Check Groq Whisper API Availability
This script checks if your Groq account has access to Whisper models
"""

from dotenv import load_dotenv
import os
from groq import Groq

def main():
    print("=" * 60)
    print("GROQ WHISPER AVAILABILITY CHECK")
    print("=" * 60)
    
    # Load environment variables from .env file
    load_dotenv()
    
    # Get the API key
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        print("\n❌ ERROR: GROQ_API_KEY not found in .env file!")
        print("\nPlease make sure:")
        print("  1. .env file exists in the backend directory")
        print("  2. It contains: GROQ_API_KEY=gsk_xxxxx")
        return False
    
    print(f"\n✅ API Key found: {api_key[:20]}...")
    
    try:
        print("\n⏳ Connecting to Groq API...")
        client = Groq(api_key=api_key)
        
        print("⏳ Fetching available models...")
        models = client.models.list()
        
        # Find Whisper models
        whisper_models = [m.id for m in models.data if 'whisper' in m.id]
        
        if whisper_models:
            print(f"\n✅ SUCCESS! WHISPER MODELS AVAILABLE:")
            print("=" * 60)
            for model in whisper_models:
                print(f"  ✓ {model}")
            print("=" * 60)
            print("\n🎉 You can use Groq Whisper API for audio/video transcription!")
            return True
        else:
            print(f"\n  WARNING: No Whisper models found")
            print("\nAvailable models on your account:")
            print("=" * 60)
            for m in models.data[:10]:
                print(f"  • {m.id}")
            print("=" * 60)
            print("\n💡 Whisper might not be available on your account.")
            print("   You can still use audio metadata approach instead.")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}")
        print(f"Details: {str(e)}")
        print("\n Could not connect to Groq API")
        print("Please check:")
        print("  1. Your internet connection")
        print("  2. Your API key is correct")
        print("  3. Your Groq account is active")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)