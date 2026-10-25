# ==============================================================================
# n8n Startup Script with SameSite=None Cross-Site Iframe Cookie Support
# ==============================================================================

$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*N8N_PUBLIC_URL\s*=\s*(.+)$") {
            $env:N8N_PUBLIC_URL = $matches[1].Trim()
        }
    }
}

if (-not $env:N8N_PUBLIC_URL) {
    $env:N8N_PUBLIC_URL = "http://localhost:5678"
}

$env:N8N_PORT = "5678"
$env:N8N_SAMESITE_COOKIE = "none"
$env:N8N_SECURE_COOKIE = "true"
$env:N8N_PROXY_HOPS = "1"
$env:N8N_EDITOR_BASE_URL = $env:N8N_PUBLIC_URL
$env:WEBHOOK_URL = "$($env:N8N_PUBLIC_URL.TrimEnd('/'))/"
$env:N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = "false"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting n8n with SameSite=None iframe cookie support" -ForegroundColor Green
Write-Host "  N8N_PUBLIC_URL:       $env:N8N_PUBLIC_URL" -ForegroundColor Yellow
Write-Host "  N8N_SAMESITE_COOKIE:  $env:N8N_SAMESITE_COOKIE" -ForegroundColor Yellow
Write-Host "  N8N_SECURE_COOKIE:    $env:N8N_SECURE_COOKIE" -ForegroundColor Yellow
Write-Host "  N8N_PROXY_HOPS:       $env:N8N_PROXY_HOPS" -ForegroundColor Yellow
Write-Host "  N8N_EDITOR_BASE_URL:  $env:N8N_EDITOR_BASE_URL" -ForegroundColor Yellow
Write-Host "  WEBHOOK_URL:          $env:WEBHOOK_URL" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

npx n8n start
