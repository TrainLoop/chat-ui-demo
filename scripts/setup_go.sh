#!/bin/bash
# Script to setup the Go server environment

echo "Setting up Go server environment..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Go is not installed. Please install Go first."
    echo "Visit https://golang.org/dl/ for installation instructions."
    exit 1
fi

echo "Go version: $(go version)"

# Navigate to the Go server directory
cd "$(dirname "$0")/../go-server" || exit

# Download Go module dependencies
echo "Downloading Go dependencies..."
go mod download

# Copy the .env file from root if it exists and we don't have one
if [ ! -f ".env" ] && [ -f "../.env" ]; then
    echo "Copying .env file from project root..."
    cp "../.env" ".env"
fi

# Create .env file from example if neither exists
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "Creating .env file from .env.example..."
    cp ".env.example" ".env"
    echo "Please update the .env file with your API keys."
fi

echo "Go server setup complete!"
