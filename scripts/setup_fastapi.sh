#!/bin/bash
# Script to set up the FastAPI environment

# Navigate to the FastAPI server directory
cd "$(dirname "$0")/../fastapi_server" || exit

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Installing FastAPI server dependencies..."
source venv/bin/activate
pip install -r requirements.txt

echo "FastAPI server environment set up successfully!"
