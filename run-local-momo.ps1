$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "course"
$ngrokExe = Join-Path $repoRoot "ngrok.exe"
$frontendUrl = "http://localhost:3000"
$ngrokApi = "http://127.0.0.1:4040/api/tunnels"

if (-not (Test-Path $ngrokExe)) {
    throw "Khong tim thay ngrok.exe tai $ngrokExe"
}

function Get-NgrokPublicUrl {
    try {
        $response = Invoke-RestMethod -Uri $ngrokApi -TimeoutSec 2
        $httpsTunnel = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($httpsTunnel -and $httpsTunnel.public_url) {
            return $httpsTunnel.public_url.TrimEnd("/")
        }
    } catch {
        return $null
    }
    return $null
}

$publicUrl = Get-NgrokPublicUrl
if (-not $publicUrl) {
    Write-Host "Dang bat ngrok cho cong 8000..."
    Start-Process -FilePath $ngrokExe -ArgumentList "http", "8000", "--log=stdout" -WindowStyle Hidden

    $deadline = (Get-Date).AddSeconds(15)
    do {
        Start-Sleep -Milliseconds 750
        $publicUrl = Get-NgrokPublicUrl
    } until ($publicUrl -or (Get-Date) -gt $deadline)
}

if (-not $publicUrl) {
    throw "Khong lay duoc public URL tu ngrok. Hay kiem tra ngrok da dang nhap va chay duoc chua."
}

$env:NGROK_URL = $publicUrl
$env:BACKEND_PUBLIC_URL = $publicUrl
$env:MOMO_IPN_URL = "$publicUrl/api/momo/ipn/"
$env:MOMO_REDIRECT_URL = "$publicUrl/api/momo/payment-return/"
$env:FRONTEND_URL = $frontendUrl
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "Ngrok URL: $publicUrl"
Write-Host "MOMO_IPN_URL: $env:MOMO_IPN_URL"
Write-Host "MOMO_REDIRECT_URL: $env:MOMO_REDIRECT_URL"
Write-Host "Dang chay Django server..."

Set-Location $backendDir
python manage.py runserver
