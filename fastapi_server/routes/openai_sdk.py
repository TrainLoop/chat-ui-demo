from typing import List, Optional, AsyncGenerator
import json
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, AsyncGenerator
import json
import os
import logging
from openai import AsyncOpenAI, AsyncStream
from openai.types.chat import ChatCompletion, ChatCompletionChunk
from sse_starlette.sse import EventSourceResponse


# Get logger
logger = logging.getLogger("fastapi-server")

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "gpt-4o"
    systemPrompt: Optional[str] = "You are a helpful, friendly, assistant."
    temperature: Optional[float] = 0.0
    maxTokens: Optional[int] = 800


async def stream_openai_response(
    messages: List[Message],
    model: str,
    system_prompt: str,
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    """Stream the response from OpenAI API using the SDK."""
    # Initialize the OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    logger.info(
        f"OpenAI API key found: {bool(api_key)}, Key prefix: {api_key[:4] if api_key else 'None'}..."
    )

    # Make sure we're passing a valid API key to the SDK
    if not api_key:
        logger.error("No OpenAI API key found in environment variables!")
        client = None
    else:
        # The OpenAI AsyncClient expects the API key property
        client = AsyncOpenAI(api_key=api_key)
    # Apply character limit
    char_limit = 12000
    char_count = 0
    messages_to_send = []

    for message in messages:
        if char_count + len(message.content) > char_limit:
            break
        char_count += len(message.content)
        messages_to_send.append(message)

    # Prepare messages including system message
    openai_messages = [{"role": "system", "content": system_prompt}]

    for message in messages_to_send:
        openai_messages.append({"role": message.role, "content": message.content})

    try:
        # Use the OpenAI SDK with streaming
        stream: AsyncStream[ChatCompletionChunk] = await client.chat.completions.create(
            model=model,
            messages=openai_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        # Process the stream events
        logger.info("Starting to receive stream from OpenAI")
        chunk_count = 0
        async for chunk in stream:
            chunk_count += 1

            if (
                chunk.choices
                and chunk.choices[0].delta
                and chunk.choices[0].delta.content
            ):
                text = chunk.choices[0].delta.content
                response_data = json.dumps({"text": text})
                # Let EventSourceResponse handle the SSE formatting
                yield response_data

        # Stream is complete
        yield "[DONE]"

    except Exception as e:
        logger.error(f"Error in OpenAI SDK: {str(e)}")
        # Don't raise an exception here, just return an error message as an SSE event
        yield json.dumps({"error": f"OpenAI SDK error: {str(e)}"})
        yield "[DONE]"


@router.post("/")
async def openai_sdk_endpoint(request: ChatRequest):
    """OpenAI SDK endpoint."""
    logger.info("=== FASTAPI: openai_sdk_endpoint called ===")
    logger.info(f"Messages: {len(request.messages)} | Model: {request.model}")
    logger.info("OpenAI key is configured: %s...", os.getenv("OPENAI_API_KEY")[:4])

    return EventSourceResponse(
        stream_openai_response(
            messages=request.messages,
            model=request.model,
            system_prompt=request.systemPrompt,
            temperature=request.temperature,
            max_tokens=request.maxTokens,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
        },
    )
