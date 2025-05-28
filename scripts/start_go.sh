#!/bin/bash
# Script to start the Go server

# Navigate to the Go server directory
cd "$(dirname "$0")/../go-server" || exit

# Check if go.mod exists
if [ ! -f "go.mod" ]; then
    echo "Go modules not initialized. Running setup first..."
    "$(dirname "$0")/setup_go.sh"
fi

# Copy the .env file from root if it exists and we don't have one
if [ ! -f ".env" ] && [ -f "../.env" ]; then
    echo "Copying .env file from project root..."
    cp "../.env" ".env"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. The server may not work properly without API keys."
    echo "Please create a .env file with your API keys."
fi

# Start Go server
echo "Starting Go server on port 8001..."
go run main.go
