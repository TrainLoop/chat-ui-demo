import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn
from trainloop_llm_logging import collect

collect("../trainloop/trainloop.config.yaml")

# Import routes
from routes.openai_fetch import router as openai_fetch_router
from routes.openai_sdk import router as openai_sdk_router
from routes.anthropic_sdk import router as anthropic_sdk_router
from routes.gemini_sdk import router as gemini_sdk_router

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("fastapi-server")

try:
    # Try different paths for .env file
    env_paths = [
        "../.env.local",  # Relative to current directory
        "../.env",  # Fallback to .env
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "../.env.local"
        ),  # Absolute path
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "../.env"
        ),  # Absolute path
    ]

    for path in env_paths:
        logger.info(f"Trying to load env from: {path}")
        if os.path.exists(path):
            logger.info(f"Found .env file at {path}")
            load_dotenv(path)
            break

    # Log all environment variables for debugging
    logger.info(f"OPENAI_API_KEY exists: {bool(os.getenv('OPENAI_API_KEY'))}")
    logger.info(f"ANTHROPIC_API_KEY exists: {bool(os.getenv('ANTHROPIC_API_KEY'))}")
    logger.info(f"GEMINI_API_KEY exists: {bool(os.getenv('GEMINI_API_KEY'))}")

    # If not found, try loading from actual env variables
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("ANTHROPIC_API_KEY"):
        logger.warning(
            "No API keys found in .env files, will use system environment variables if available"
        )
except Exception as e:
    logger.error(f"Error loading environment variables: {e}")

app = FastAPI(title="Chatbot-UI-Lite FastAPI Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    # Allow all origins for development - restrict this in production
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type", "Content-Length"],
)

# Include routers
app.include_router(openai_fetch_router, prefix="/openai-fetch")
app.include_router(openai_sdk_router, prefix="/openai-sdk")
app.include_router(anthropic_sdk_router, prefix="/anthropic-sdk")
app.include_router(gemini_sdk_router, prefix="/gemini-sdk")


@app.get("/")
async def root():
    return {"message": "Welcome to Chatbot-UI-Lite FastAPI Server"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
