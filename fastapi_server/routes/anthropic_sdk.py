from typing import List, Optional, AsyncGenerator
import json
import os
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from anthropic import Anthropic
from sse_starlette.sse import EventSourceResponse


# Get logger
logger = logging.getLogger("fastapi-server")

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "claude-3-5-sonnet-20241022"
    systemPrompt: Optional[str] = "You are a helpful, friendly, assistant."
    temperature: Optional[float] = 0.0
    maxTokens: Optional[int] = 800


async def stream_anthropic_response(
    messages: List[Message],
    model: str,
    system_prompt: str,
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    """Stream the response from Anthropic API using the SDK."""
    # Apply character limit
    char_limit = 12000
    char_count = 0
    messages_to_send = []

    # Initialize the Anthropic client
    api_key = os.getenv("ANTHROPIC_API_KEY")
    logger.info(
        f"Anthropic API key found: {bool(api_key)}, Key prefix: {api_key[:4] if api_key else 'None'}..."
    )

    # The Anthropic client expects the API key directly, not in a dictionary
    client = Anthropic(api_key=api_key)

    for message in messages:
        if char_count + len(message.content) > char_limit:
            break
        char_count += len(message.content)
        messages_to_send.append(message)

    # Convert messages to Anthropic format
    anthropic_messages = []
    for message in messages_to_send:
        # Anthropic only accepts 'user' and 'assistant' roles
        role = "user" if message.role == "user" else "assistant"
        anthropic_messages.append({"role": role, "content": message.content})

    logger.info(
        f"Using Anthropic API with model {model} and system prompt: {system_prompt[:50]}..."
    )

    try:
        logger.info(f"Making Anthropic API request with model {model}")
        # Use the Anthropic SDK with streaming - NOT using await with stream
        with client.messages.stream(
            model=model,
            messages=anthropic_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
        ) as stream:
            # Log the start of streaming
            logger.info("Starting to receive stream from Anthropic")
            chunk_count = 0

            # Process each message in the stream
            for chunk in stream:
                chunk_count += 1

                if chunk.type == "content_block_delta" and chunk.delta.text:
                    text = chunk.delta.text
                    response_data = json.dumps({"text": text})
                    # Let EventSourceResponse handle the SSE formatting
                    yield response_data

        # Stream is complete
        yield "[DONE]"

    except Exception as e:
        logger.error(f"Error in Anthropic SDK: {str(e)}")
        # Don't raise an exception here, just return an error message as an SSE event
        yield json.dumps({"error": f"Anthropic SDK error: {str(e)}"})
        yield "[DONE]"


@router.post("/")
async def anthropic_sdk_endpoint(request: ChatRequest):
    """Anthropic SDK endpoint."""
    logger.info("=== FASTAPI: anthropic_sdk_endpoint called ===")
    logger.info(f"Messages: {len(request.messages)} | Model: {request.model}")
    logger.info(
        "Anthropic key is configured: %s...", os.getenv("ANTHROPIC_API_KEY")[:4]
    )

    return EventSourceResponse(
        stream_anthropic_response(
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
