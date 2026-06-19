$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "course"
$frontendDir = Join-Path $repoRoot "course_fe"
$frontendEnvLocalFile = Join-Path $frontendDir ".env.local"
$backendUrl = "http://127.0.0.1:8080"
$frontendUrl = "http://localhost:3000"

function Set-EnvFileValues {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [hashtable]$Values
    )

    $lines = @()
    if (Test-Path $FilePath) {
        $lines = @(Get-Content $FilePath)
    }

    $seenKeys = @{}
    $updatedLines = foreach ($line in $lines) {
        $matched = $false
        foreach ($key in $Values.Keys) {
            if ($line -match "^\s*$([regex]::Escape($key))\s*=") {
                $seenKeys[$key] = $true
                $matched = $true
                "$key=$($Values[$key])"
                break
            }
        }

        if (-not $matched) {
            $line
        }
    }

    foreach ($key in $Values.Keys) {
        if (-not $seenKeys.ContainsKey($key)) {
            $updatedLines += "$key=$($Values[$key])"
        }
    }

    Set-Content -Path $FilePath -Value $updatedLines -Encoding UTF8
}

function Test-PythonHasDjango {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PythonPath
    )

    if (-not (Test-Path $PythonPath) -and -not (Get-Command $PythonPath -ErrorAction SilentlyContinue)) {
        return $false
    }

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $PythonPath -c "import django" *> $null
        return $LASTEXITCODE -eq 0
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

function Resolve-DjangoPython {
    $candidates = @(
        (Join-Path $repoRoot ".venv\Scripts\python.exe"),
        (Join-Path $backendDir ".venv\Scripts\python.exe"),
        (Join-Path $repoRoot "venv\Scripts\python.exe"),
        (Join-Path $backendDir "venv\Scripts\python.exe")
    )

    $commandPython = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($commandPython) {
        $candidates += $commandPython.Source
    }

    foreach ($candidate in $candidates) {
        if (Test-PythonHasDjango -PythonPath $candidate) {
            return $candidate
        }
    }

    throw "Cannot find a Python executable with Django installed. Activate/install backend dependencies, then run this script again."
}

New-Item -ItemType Directory -Force -Path "C:\tmp" | Out-Null

$env:PAYMENT_GATEWAY_MODE = "local"
$env:PAYMENT_FINALIZE_ON_RETURN = "True"
$env:FRONTEND_URL = $frontendUrl
$env:PAYMENT_RESULT_URL = "$frontendUrl/payment/result"
$env:BACKEND_PUBLIC_URL = $backendUrl
$env:NGROK_URL = ""
$env:VNPAY_RETURN_URL = "$backendUrl/api/vnpay/payment-return/"
$env:MOMO_REDIRECT_URL = "$backendUrl/api/momo/payment-return/"
$env:MOMO_IPN_URL = "$backendUrl/api/momo/ipn/"
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

if (Test-Path $frontendDir) {
    Set-EnvFileValues -FilePath $frontendEnvLocalFile -Values @{
        "VITE_API_BASE_URL" = "$backendUrl/api"
    }
}

$pythonExe = Resolve-DjangoPython

Write-Host ""
Write-Host "Starting backend only"
Write-Host "  Backend:  $backendUrl/api"
Write-Host "  Frontend: run separately at $frontendUrl"
Write-Host "  Mode:     PAYMENT_GATEWAY_MODE=local"
Write-Host ""
Write-Host "Backend logs will stream in this terminal. Press Ctrl+C to stop backend."
Write-Host ""

Push-Location $backendDir
try {
    & $pythonExe manage.py runserver 127.0.0.1:8080
}
finally {
    Pop-Location
}
