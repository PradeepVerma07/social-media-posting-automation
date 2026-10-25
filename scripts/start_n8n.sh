#!/usr/bin/env bash
# ==============================================================================
# n8n Startup Script with SameSite=None Cross-Site Iframe Cookie Support
# ==============================================================================

if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E '^N8N_PUBLIC_URL' | xargs 2>/dev/null)
fi

export N8N_PUBLIC_URL="${N8N_PUBLIC_URL:-http://localhost:5678}"
export N8N_PORT="5678"
export N8N_SAMESITE_COOKIE="none"
export N8N_SECURE_COOKIE="true"
export N8N_PROXY_HOPS="1"
export N8N_EDITOR_BASE_URL="${N8N_PUBLIC_URL}"
export WEBHOOK_URL="${N8N_PUBLIC_URL%/}/"
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS="false"

echo "=========================================================="
echo "Starting n8n with SameSite=None iframe cookie support"
echo "  N8N_PUBLIC_URL:       $N8N_PUBLIC_URL"
echo "  N8N_SAMESITE_COOKIE:  $N8N_SAMESITE_COOKIE"
echo "  N8N_SECURE_COOKIE:    $N8N_SECURE_COOKIE"
echo "  N8N_PROXY_HOPS:       $N8N_PROXY_HOPS"
echo "  N8N_EDITOR_BASE_URL:  $N8N_EDITOR_BASE_URL"
echo "  WEBHOOK_URL:          $WEBHOOK_URL"
echo "=========================================================="

npx n8n start
