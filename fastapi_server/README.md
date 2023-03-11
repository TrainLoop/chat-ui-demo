# FastAPI Server for Chatbot UI Lite

This FastAPI server provides alternative API endpoints that mirror the functionality of the Next.js API routes in the Chatbot UI Lite application.

## Features

- Direct replacements for the Next.js API routes
- Uses the same streaming response format
- Supports OpenAI and Anthropic chat completions
- Can be toggled from the UI

## Endpoints

| FastAPI Endpoint          | Equivalent Next.js API Route | Description                                    |
|---------------------------|------------------------------|------------------------------------------------|
| `/openai-fetch`           | `/api/openai-fetch`          | Direct fetch to OpenAI (GPT-3.5 Turbo)         |
| `/openai-sdk`             | `/api/openai-sdk`            | OpenAI SDK with GPT-4o                         |
| `/anthropic-sdk`          | `/api/anthropic-sdk`         | Anthropic SDK with Claude Sonnet               |

## Integrated Setup (Recommended)

The project now includes integrated scripts to manage both the Next.js and FastAPI servers together:

1. **Install everything at once** - This sets up both the Node.js dependencies and the Python environment:

```bash
npm install
```

2. **Start both servers together** - This will launch both the Next.js and FastAPI servers:

```bash
npm run dev
```

3. Create a `.env` file in the project root with your API keys:

```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Manual Setup (Alternative)

If you prefer to manage the servers separately:

1. Install the required Python packages:

```bash
# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

2. Create a `.env` file in the `fastapi_server` directory with your API keys as shown above.

## Running Servers Separately

Start the FastAPI server:

```bash
npm run dev:fastapi
```

Start the Next.js server:

```bash
npm run dev:next
```

Next.js is already configured (in `next.config.js`) to proxy requests from `/fastapi/*` to the FastAPI server running on port 8000.

## Usage

1. Start both the Next.js development server and the FastAPI server
2. In the UI, use the toggle switch above the chat windows to switch between Next.js API and FastAPI endpoints
3. The chat functionality should work the same regardless of which backend is selected
