# Google Cloud Authentication for Go Server

## Overview

The Go server's Gemini SDK endpoint requires Google Cloud authentication to work with Vertex AI. This is different from the Python FastAPI server, which may use different authentication methods.

## Authentication Error

If you see this error:
```
rpc error: code = Unauthenticated desc = transport: per-RPC creds failed due to error: auth: "invalid_grant" "reauth related error (invalid_rapt)"
```

This means the Application Default Credentials (ADC) are not properly set up.

## Setup Instructions

### 1. Install Google Cloud SDK

If you haven't already, install the Google Cloud SDK:
- macOS: `brew install google-cloud-sdk`
- Or visit: https://cloud.google.com/sdk/docs/install

### 2. Run the Authentication Setup Script

We've provided a script to help set up authentication:

```bash
cd scripts
./setup_gcloud_auth.sh
```

This script will:
- Check if gcloud is installed
- Set up Application Default Credentials
- Configure your default project

### 3. Manual Setup (Alternative)

If you prefer to set up manually:

```bash
# Login to Google Cloud
gcloud auth login

# Set up Application Default Credentials
gcloud auth application-default login

# Set your project (replace with your project ID)
gcloud config set project trainloop-k8s-poc

# Enable Vertex AI API if needed
gcloud services enable aiplatform.googleapis.com
```

### 4. Verify Setup

To verify your authentication is working:

```bash
# Check active account
gcloud auth list

# Check ADC token
gcloud auth application-default print-access-token

# Check project
gcloud config get-value project
```

## Environment Variables

Make sure these are set in your `.env.local`:
```
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_LOCATION=us-central1  # or your preferred region
```

## Permissions Required

Your Google Cloud account needs the following permissions:
- Vertex AI User (`roles/aiplatform.user`)
- Service Usage Consumer (`roles/serviceusage.serviceUsageConsumer`)

## Troubleshooting

1. **"invalid_grant" error**: Your credentials may be expired. Run `gcloud auth application-default login` again.

2. **"API not enabled" error**: Enable the Vertex AI API:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

3. **Permission denied**: Ensure your account has the necessary IAM roles in the Google Cloud project.

4. **Wrong location**: Make sure `GOOGLE_LOCATION` is set to a valid Vertex AI region (not "global").

## Notes

- The Go SDK uses Application Default Credentials (ADC), which is different from API keys
- ADC credentials are stored locally and are user-specific
- You may need to re-authenticate periodically if tokens expire
- The authentication is per-machine, so you'll need to set it up on each development machine
