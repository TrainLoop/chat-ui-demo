#!/bin/bash
# Script to start the Go server with optional watch mode

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

# Check Google Cloud authentication for Vertex AI
if [ -n "$GOOGLE_PROJECT_ID" ] || [ -f "../.env.local" ]; then
    # Load GOOGLE_PROJECT_ID from .env.local if not already set
    if [ -z "$GOOGLE_PROJECT_ID" ] && [ -f "../.env.local" ]; then
        export $(grep GOOGLE_PROJECT_ID ../.env.local | xargs)
    fi
    
    # Check if gcloud is available and ADC is set up
    if command -v gcloud &> /dev/null; then
        if ! gcloud auth application-default print-access-token &> /dev/null; then
            echo ""
            echo "Warning: Google Cloud Application Default Credentials not found."
            echo "The Gemini SDK endpoint will not work without proper authentication."
            echo ""
            echo "To fix this, run: ./scripts/setup_gcloud_auth.sh"
            echo "Or manually run: gcloud auth application-default login"
            echo ""
        else
            echo "Google Cloud authentication detected "
        fi
    else
        echo ""
        echo "Warning: gcloud CLI not found. Gemini SDK endpoint may not work."
        echo "Install gcloud CLI: https://cloud.google.com/sdk/docs/install"
        echo ""
    fi
fi

# Function to start the server with watch mode
start_with_watch() {
    echo "Starting Go server with watch mode on port 8001..."
    
    # Check if air is installed
    if command -v air &> /dev/null; then
        echo "Using air for hot reloading..."
        air
    # Check if entr is available (common on macOS via brew)
    elif command -v entr &> /dev/null; then
        echo "Using entr for hot reloading..."
        find . -name "*.go" | entr -r go run main.go
    # Check if fswatch is available (common on macOS)
    elif command -v fswatch &> /dev/null; then
        echo "Using fswatch for hot reloading..."
        echo "Starting Go server..."
        go run main.go &
        GO_PID=$!
        
        # Watch for changes and restart
        fswatch -o . | while read f; do
            echo "File change detected, restarting server..."
            kill $GO_PID 2>/dev/null
            go run main.go &
            GO_PID=$!
        done
    else
        echo "No watch tool found. Installing air for hot reloading..."
        go install github.com/air-verse/air@latest
        if command -v air &> /dev/null; then
            air
        else
            echo "Failed to install air. Running without watch mode..."
            go run main.go
        fi
    fi
}

# Check for watch flag
if [ "$1" = "--watch" ] || [ "$1" = "-w" ]; then
    start_with_watch
else
    # Start Go server normally
    echo "Starting Go server on port 8001..."
    echo "Tip: Use './scripts/start_go.sh --watch' for hot reloading"
    go run main.go
fi
