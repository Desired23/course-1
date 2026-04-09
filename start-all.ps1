$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ngrokExe = Join-Path $repoRoot "ngrok.exe"
$runScript = Join-Path $repoRoot "run-local-momo.ps1"
$ngrokApi = "http://127.0.0.1:4040/api/tunnels"
$fixedNgrokUrl = "https://amber-electrosynthetic-dolorously.ngrok-free.dev"

if (-not (Test-Path $ngrokExe)) {
    throw "Khong tim thay ngrok.exe tai $ngrokExe"
}

if (-not (Test-Path $runScript)) {
    throw "Khong tim thay run-local-momo.ps1 tai $runScript"
}

function Get-NgrokPublicUrl {
    param(
        [string]$ExpectedUrl
    )

    try {
        $response = Invoke-RestMethod -Uri $ngrokApi -TimeoutSec 2
        $httpsTunnels = $response.tunnels | Where-Object { $_.proto -eq "https" }
        if ($ExpectedUrl) {
            $httpsTunnel = $httpsTunnels | Where-Object { $_.public_url -eq $ExpectedUrl } | Select-Object -First 1
        }
        if (-not $httpsTunnel) {
            $httpsTunnel = $httpsTunnels | Select-Object -First 1
        }
        if ($httpsTunnel -and $httpsTunnel.public_url) {
            return $httpsTunnel.public_url.TrimEnd("/")
        }
    } catch {
        return $null
    }
    return $null
}

$publicUrl = Get-NgrokPublicUrl -ExpectedUrl $fixedNgrokUrl
if ($publicUrl -ne $fixedNgrokUrl) {
    Write-Host "Dang bat ngrok cho cong 8000 voi URL co dinh: $fixedNgrokUrl"
    Start-Process -FilePath $ngrokExe -ArgumentList "http", "8000", "--url=$fixedNgrokUrl", "--log=stdout" -WindowStyle Hidden

    $deadline = (Get-Date).AddSeconds(15)
    do {
        Start-Sleep -Milliseconds 750
        $publicUrl = Get-NgrokPublicUrl -ExpectedUrl $fixedNgrokUrl
    } until (($publicUrl -eq $fixedNgrokUrl) -or (Get-Date) -gt $deadline)
}

if ($publicUrl -ne $fixedNgrokUrl) {
    throw "Khong lay duoc public URL co dinh tu ngrok: $fixedNgrokUrl. Hay kiem tra domain da reserve, tunnel cu da tat, va ngrok da dang nhap."
}

Write-Host "Ngrok san sang tai: $publicUrl"
Write-Host "Dang chay backend local..."

powershell -ExecutionPolicy Bypass -File $runScript
