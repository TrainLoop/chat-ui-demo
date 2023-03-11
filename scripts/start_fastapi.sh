#!/bin/bash
# Script to start the FastAPI server

# Navigate to the FastAPI server directory
cd "$(dirname "$0")/../fastapi_server" || exit

# Check if virtual environment exists
if [ ! -d "venv" ]; then
  echo "Python virtual environment not found. Setting up environment first..."
  "$(dirname "$0")/setup_fastapi.sh"
fi

# Activate virtual environment
source venv/bin/activate

# Copy the .env file from root if it exists and we don't have one
if [ ! -f ".env" ] && [ -f "../.env" ]; then
  echo "Copying .env file from project root..."
  cp "../.env" ".env"
fi

# Start FastAPI server
echo "Starting FastAPI server..."
uvicorn main:app --reload --port 8000
