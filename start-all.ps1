$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ngrokExe = Join-Path $repoRoot "ngrok.exe"
$runScript = Join-Path $repoRoot "run-local-momo.ps1"

if (-not (Test-Path $ngrokExe)) {
    throw "Khong tim thay ngrok.exe tai $ngrokExe"
}

if (-not (Test-Path $runScript)) {
    throw "Khong tim thay run-local-momo.ps1 tai $runScript"
}

# Doc NGROK_AUTHTOKEN tu file .env neu chua co override tu moi truong shell
$envFile = Join-Path $repoRoot "course\.env"
if (-not $env:NGROK_AUTHTOKEN -and (Test-Path $envFile)) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*NGROK_AUTHTOKEN\s*=\s*(.+)$') {
            $env:NGROK_AUTHTOKEN = $Matches[1].Trim()
        }
    }
}

# Tu dong login ngrok neu co authtoken
if ($env:NGROK_AUTHTOKEN) {
    & $ngrokExe config add-authtoken $env:NGROK_AUTHTOKEN | Out-Null
}

# Kill tunnel cu de tranh conflict
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

Write-Host "Dang chay backend local voi ngrok URL dong..."

powershell -ExecutionPolicy Bypass -File $runScript
