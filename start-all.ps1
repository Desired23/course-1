$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ngrokExe = Join-Path $repoRoot "ngrok.exe"
$runScript = Join-Path $repoRoot "run-local-momo.ps1"
$ngrokApi = "http://127.0.0.1:4040/api/tunnels"

if (-not (Test-Path $ngrokExe)) {
    throw "Khong tim thay ngrok.exe tai $ngrokExe"
}

if (-not (Test-Path $runScript)) {
    throw "Khong tim thay run-local-momo.ps1 tai $runScript"
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
    throw "Khong lay duoc public URL tu ngrok. Hay kiem tra ngrok da dang nhap va co the ket noi internet."
}

Write-Host "Ngrok san sang tai: $publicUrl"
Write-Host "Dang chay backend local..."

powershell -ExecutionPolicy Bypass -File $runScript
