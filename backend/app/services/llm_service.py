from groq import Groq
from app.config import settings
import os
 
class GroqChatService:
    """Handle LLM interactions using Groq API"""
    
    def __init__(self):
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment")
        
        self.client = Groq(api_key=api_key)
        self.model = settings.LLM_MODEL
    
    async def chat_with_context(self, query: str, context: str) -> str:
        """
        Send a chat message with document context
        Returns the AI response
        """
        system_prompt = f"""You are a helpful AI assistant specialized in analyzing documents.
You have access to relevant information from the user's documents.
 
CONTEXT FROM DOCUMENTS:
{context}
 
INSTRUCTIONS:
- Answer questions based on the provided context
- If the answer isn't in the context, clearly state that
- Be concise but thorough
- Cite the relevant information from the context when applicable
"""
        
        try:
            message = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
            )
            
            return message.choices[0].message.content
        
        except Exception as e:
            print(f"Groq API Error: {e}")
            raise Exception(f"LLM Error: {str(e)}")
    
    async def chat_stream(self, query: str, context: str):
        """
        Stream chat response token by token
        """
        system_prompt = f"""You are a helpful AI assistant analyzing documents.
 
CONTEXT:
{context}
 
Answer based on the context provided."""
        
        try:
            with self.client.messages.stream(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                max_tokens=settings.LLM_MAX_TOKENS,
            ) as stream:
                for text in stream.text_stream:
                    yield text
        
        except Exception as e:
            yield f"Error: {str(e)}"
    
    async def summarize(self, text: str, max_length: int = 500) -> str:
        """
        Generate a summary of the provided text
        """
        prompt = f"""Please provide a concise summary of the following text in approximately {max_length} words:
 
{text}
 
Summary:"""
        
        try:
            message = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_length // 4 + 50,  # Rough token to word conversion
            )
            
            return message.choices[0].message.content
        
        except Exception as e:
            raise Exception(f"Summarization Error: {str(e)}")