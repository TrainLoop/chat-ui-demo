#!/bin/bash

# Script to set up Google Cloud authentication for the Go server

echo "Setting up Google Cloud authentication for Vertex AI..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install it first:"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "No active gcloud authentication found."
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set up Application Default Credentials
echo "Setting up Application Default Credentials..."
gcloud auth application-default login

# Check if project ID is set in environment
if [ -z "$GOOGLE_PROJECT_ID" ]; then
    # Try to read from .env.local
    if [ -f "../.env.local" ]; then
        export $(grep GOOGLE_PROJECT_ID ../.env.local | xargs)
    fi
fi

if [ -n "$GOOGLE_PROJECT_ID" ]; then
    echo "Setting default project to: $GOOGLE_PROJECT_ID"
    gcloud config set project $GOOGLE_PROJECT_ID
else
    echo "Warning: GOOGLE_PROJECT_ID not found in environment"
    echo "Please set it in your .env.local file or run:"
    echo "gcloud config set project YOUR_PROJECT_ID"
fi

echo ""
echo "Authentication setup complete!"
echo ""
echo "To verify your setup:"
echo "1. Check active account: gcloud auth list"
echo "2. Check ADC: gcloud auth application-default print-access-token"
echo "3. Check project: gcloud config get-value project"
echo ""
echo "If you encounter issues, you may need to:"
echo "1. Enable Vertex AI API: gcloud services enable aiplatform.googleapis.com"
echo "2. Grant necessary permissions to your account"
