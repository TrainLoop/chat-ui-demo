# Go Chatbot Server

A Go implementation of the chatbot UI backend that provides streaming chat completion endpoints for OpenAI, Anthropic, and Google Gemini APIs.

## Features

- Server-Sent Events (SSE) streaming responses
- Support for multiple AI providers:
  - OpenAI (both raw HTTP and SDK implementations)
  - Anthropic SDK
  - Google Gemini/Vertex AI SDK
- Character limit enforcement (12,000 chars)
- Environment variable configuration
- Runs on port 8001 (different from FastAPI server on port 8000)

## Setup

1. Install Go (version 1.21 or higher recommended)

2. Install dependencies:
   ```bash
   go mod download
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` or use parent directory `.env` files
   - Add your API keys:
     - `OPENAI_API_KEY`
     - `ANTHROPIC_API_KEY`
     - `GOOGLE_PROJECT_ID` (for Gemini)
     - `GOOGLE_LOCATION` (defaults to us-central1)

4. Run the server:
   ```bash
   go run main.go
   ```

## Endpoints

- `GET /` - Health check
- `POST /openai-fetch` - OpenAI chat completion (raw HTTP implementation)
- `POST /openai-sdk` - OpenAI chat completion (SDK implementation)
- `POST /anthropic-sdk` - Anthropic chat completion
- `POST /gemini-sdk` - Google Gemini chat completion

## Request Format

All endpoints accept the same JSON request format:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "model": "gpt-4o",  // optional, defaults vary by endpoint
  "systemPrompt": "You are a helpful assistant",  // optional
  "temperature": 0.7,  // optional
  "maxTokens": 800  // optional
}
```

## Response Format

Responses are streamed as Server-Sent Events (SSE):

```
data: {"text": "Hello"}
data: {"text": " there!"}
data: [DONE]
```

## Development

To build the binary:
```bash
go build -o chatbot-server
```

To run tests (if any):
```bash
go test ./...
```
