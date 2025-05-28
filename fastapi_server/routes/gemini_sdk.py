from typing import List, Optional, AsyncGenerator
import json
import os
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
from google.genai.types import HttpOptions, Part, Content
from sse_starlette.sse import EventSourceResponse


# Get logger
logger = logging.getLogger("fastapi-server")

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "gemini-2.0-flash-001"
    systemPrompt: Optional[str] = "You are a helpful, friendly, assistant."
    temperature: Optional[float] = 0.0
    maxTokens: Optional[int] = 800


async def stream_vertex_ai_response(
    messages: List[Message],
    model: str,
    system_prompt: str,
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    """Stream the response from Vertex AI using the Google GenAI SDK."""
    # Apply character limit
    char_limit = 12000
    char_count = 0

    # Check for required environment variables
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "True")
    
    logger.info(f"Project ID: {project_id}")
    logger.info(f"Location: {location}")
    logger.info(f"Use Vertex AI: {use_vertex}")

    # Initialize the Vertex AI client
    client = genai.Client(
        http_options=HttpOptions(api_version="v1"),
        vertexai=use_vertex.lower() == "true",
        project=project_id,
        location=location
    )

    # Build the conversation history
    contents = []
    
    # Add system prompt as the first message if provided
    if system_prompt:
        contents.append(Content(role="user", parts=[Part.from_text(system_prompt)]))
        contents.append(Content(role="model", parts=[Part.from_text("I understand. I'll act according to those instructions.")]))
    
    # Process messages with character limit
    for message in messages:
        message_content = message.content
        message_length = len(message_content)

        if char_count + message_length > char_limit:
            break

        # Convert role names: assistant -> model
        role = "model" if message.role == "assistant" else message.role
        contents.append(Content(role=role, parts=[Part.from_text(message_content)]))
        char_count += message_length

    try:
        # Generate streaming response
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "stream": True,
            }
        )
        
        # Stream the response
        for chunk in response:
            if chunk.text:
                yield f"data: {json.dumps({'content': chunk.text})}\n\n"
        
        # Send the done signal
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        logger.error(f"Error in Vertex AI streaming: {str(e)}")
        error_message = f"Error: {str(e)}"
        yield f"data: {json.dumps({'error': error_message})}\n\n"
        yield "data: [DONE]\n\n"


@router.post("/api/chat/gemini-sdk")
async def gemini_sdk_endpoint(request: ChatRequest):
    """Vertex AI Gemini endpoint."""
    logger.info(f"Received Vertex AI request with model: {request.model}")
    logger.info(f"Number of messages: {len(request.messages)}")
    logger.info(f"Temperature: {request.temperature}")
    logger.info(f"Max tokens: {request.maxTokens}")

    return EventSourceResponse(
        stream_vertex_ai_response(
            messages=request.messages,
            model=request.model,
            system_prompt=request.systemPrompt,
            temperature=request.temperature,
            max_tokens=request.maxTokens,
        )
    )
