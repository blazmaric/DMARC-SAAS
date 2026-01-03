#!/bin/bash
# DMARC Email Ingest Script
# Forwards incoming DMARC emails to the Next.js application via HTTP POST

# Read the entire email from stdin
EMAIL_CONTENT=$(cat)

# Get environment variables
APP_URL="${APP_URL:-http://app:3000}"
INGEST_SECRET="${INGEST_SECRET}"

# Forward to the ingest API
curl -X POST \
  -H "X-Ingest-Token: ${INGEST_SECRET}" \
  -H "Content-Type: message/rfc822" \
  --data-binary "${EMAIL_CONTENT}" \
  "${APP_URL}/api/ingest/email" \
  --silent \
  --show-error \
  --max-time 30

# Always exit 0 to prevent mail bounces
exit 0
