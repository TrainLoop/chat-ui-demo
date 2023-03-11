from typing import List, Dict, Optional, AsyncGenerator
import json
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from sse_starlette.sse import EventSourceResponse

# Get logger
logger = logging.getLogger("fastapi-server")

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "gpt-3.5-turbo"
    systemPrompt: Optional[str] = "You are a helpful, friendly, assistant."
    temperature: Optional[float] = 0.0
    maxTokens: Optional[int] = 800


async def fetch_openai_stream(
    messages: List[Dict[str, str]],
    model: str,
    system_prompt: str,
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    """Direct fetch to OpenAI API with streaming."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not set")
        yield f"data: {json.dumps({'error': 'OPENAI_API_KEY not set'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # Prepare messages including system message
    prepared_messages = [{"role": "system", "content": system_prompt}]

    # Apply character limit
    char_limit = 12000
    char_count = 0
    for message in messages:
        if char_count + len(message["content"]) > char_limit:
            break
        char_count += len(message["content"])
        prepared_messages.append(message)

    # Create the request payload
    payload = {
        "model": model,
        "messages": prepared_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True,
    }

    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
            timeout=60.0,
        ) as response:
            if response.status_code != 200:
                error_msg = await response.aread()
                logger.error(f"OpenAI API error: {error_msg}")
                yield f"data: {json.dumps({'error': f'OpenAI API error: {error_msg}'})}\n\n"
                yield "data: [DONE]\n\n"
                return

            # Process the streaming response
            async for line in response.aiter_lines():
                if not line.strip():
                    continue

                if line.startswith("data: "):
                    data = line[6:]  # Remove 'data: ' prefix

                    if data == "[DONE]":
                        yield "[DONE]"
                        break

                    try:
                        json_data = json.loads(data)
                        content = (
                            json_data.get("choices", [{}])[0]
                            .get("delta", {})
                            .get("content")
                        )

                        if content:
                            response_data = json.dumps({"text": content})
                            # Let EventSourceResponse handle the SSE formatting
                            yield response_data
                    except json.JSONDecodeError as e:
                        print(f"Error parsing JSON: {e}")
                        continue


@router.post("/")
async def openai_fetch_endpoint(request: ChatRequest):
    """Direct fetch to OpenAI API endpoint."""
    logger.info("=== FASTAPI: openai_fetch_endpoint called ===")
    logger.info(f"Messages: {len(request.messages)} | Model: {request.model}")
    logger.info("OpenAI key is configured: %s...", os.getenv("OPENAI_API_KEY")[:4])

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    return EventSourceResponse(
        fetch_openai_stream(
            messages=messages,
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
