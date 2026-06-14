$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "course"
$backendEnvFile = Join-Path $backendDir ".env"
$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
$ngrokExe = Join-Path $repoRoot "ngrok.exe"
$frontendUrl = "http://localhost:3000"
$ngrokApi = "http://127.0.0.1:4040/api/tunnels"
$ngrokLogFile = Join-Path $env:TEMP "course-1-ngrok.log"
$ngrokErrFile = Join-Path $env:TEMP "course-1-ngrok.err.log"

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

function Get-NgrokStartupFailureMessage {
    $logText = ""
    foreach ($path in @($ngrokLogFile, $ngrokErrFile)) {
        if (Test-Path $path) {
            try {
                $content = Get-Content $path -Raw -ErrorAction Stop
                if ($content) {
                    $logText += $content + "`n"
                }
            } catch {
            }
        }
    }

    if (-not $logText) {
        return $null
    }

    if ($logText -match "ERR_NGROK_334") {
        $reservedDomain = $null
        $domainMatch = [regex]::Match($logText, "https://[A-Za-z0-9.-]*ngrok-[A-Za-z0-9.-]+")
        if ($domainMatch.Success) {
            $reservedDomain = $domainMatch.Value
        }

        if ($reservedDomain) {
            return "Ngrok khong tao duoc URL moi vi tai khoan hien tai dang duoc gan free dev domain co dinh $reservedDomain va domain nay dang online o noi khac (ERR_NGROK_334). Hay tat endpoint/tunnel cu trong ngrok dashboard, tat may/phien dang dung domain do, hoac dung authtoken khac."
        }

        return "Ngrok khong tao duoc tunnel vi endpoint dang online o noi khac (ERR_NGROK_334). Hay tat endpoint/tunnel cu trong ngrok dashboard hoac dung authtoken khac."
    }

    if ($logText -match "ERR_NGROK_4018") {
        return "Ngrok chua san sang vi tai khoan hien tai chua xac minh hoac chua co authtoken hop le (ERR_NGROK_4018)."
    }

    $logLines = ($logText -split "(`r`n|`n|`r)") | Where-Object { $_.Trim() }
    if ($logLines.Count -gt 0) {
        return "Ngrok khoi dong that bai: " + $logLines[-1].Trim()
    }

    return $null
}

function Import-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [string[]]$ExcludedKeys = @()
    )

    if (-not (Test-Path $FilePath)) {
        return
    }

    Write-Host "Nap bien moi truong tu: $FilePath"
    Get-Content $FilePath | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $parts = $line -split "=", 2
        if ($parts.Count -ne 2) {
            return
        }

        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        if ($ExcludedKeys -contains $name) {
            return
        }
        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }


        Set-Item -Path "Env:$name" -Value $value
    }
}

Import-EnvFile -FilePath $backendEnvFile -ExcludedKeys @(
    "BACKEND_PUBLIC_URL",
    "NGROK_URL",
    "MOMO_IPN_URL",
    "MOMO_REDIRECT_URL"
)

$publicUrl = Get-NgrokPublicUrl
if (-not $publicUrl) {
    Write-Host "Dang bat ngrok cho cong 8000..."
    Remove-Item $ngrokLogFile, $ngrokErrFile -ErrorAction SilentlyContinue
    Start-Process -FilePath $ngrokExe -ArgumentList "http", "8000", "--log=stdout" -WindowStyle Hidden -RedirectStandardOutput $ngrokLogFile -RedirectStandardError $ngrokErrFile

    $deadline = (Get-Date).AddSeconds(15)
    do {
        Start-Sleep -Milliseconds 750
        $publicUrl = Get-NgrokPublicUrl
    } until ($publicUrl -or (Get-Date) -gt $deadline)
}

if (-not $publicUrl) {
    $ngrokFailureMessage = Get-NgrokStartupFailureMessage
    if ($ngrokFailureMessage) {
        throw $ngrokFailureMessage
    }
    throw "Khong lay duoc public URL tu ngrok. Hay kiem tra ngrok da dang nhap va chay duoc chua."
}

$env:NGROK_URL = $publicUrl
$env:BACKEND_PUBLIC_URL = $publicUrl
$env:MOMO_IPN_URL = "$publicUrl/api/momo/ipn/"
$env:MOMO_REDIRECT_URL = "$publicUrl/api/momo/payment-return/"
$env:FRONTEND_URL = $frontendUrl
$env:LEARNING_PATH_PROVIDER = if ([string]::IsNullOrWhiteSpace($env:LEARNING_PATH_PROVIDER)) { "auto" } else { $env:LEARNING_PATH_PROVIDER }
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "Ngrok URL: $publicUrl"
Write-Host "MOMO_IPN_URL: $env:MOMO_IPN_URL"
Write-Host "MOMO_REDIRECT_URL: $env:MOMO_REDIRECT_URL"
Write-Host "LEARNING_PATH_PROVIDER: $env:LEARNING_PATH_PROVIDER"
$geminiKeyLength = if ([string]::IsNullOrEmpty($env:GEMINI_API_KEY)) { 0 } else { $env:GEMINI_API_KEY.Length }
Write-Host "GEMINI_API_KEY length: $geminiKeyLength"
Write-Host "LEARNING_PATH_FORCE_GEMINI: $env:LEARNING_PATH_FORCE_GEMINI"
if ($geminiKeyLength -eq 0) {
    if ($env:LEARNING_PATH_FORCE_GEMINI -eq "True") {
        Write-Warning "GEMINI_API_KEY dang rong va LEARNING_PATH_FORCE_GEMINI=True. Advisor se tra loi loi cau hinh thay vi fallback rule-based."
    } else {
        Write-Warning "GEMINI_API_KEY dang rong. Advisor se dung rule_based thay vi Gemini."
    }
}
Write-Host "Dang chay Django server..."

Set-Location $backendDir
if (Test-Path $venvPython) {
    $venvReady = $false
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        & $venvPython -c "import django, django_extensions" *> $null
        $venvReady = ($LASTEXITCODE -eq 0)
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($venvReady) {
        Write-Host "Su dung Python tu .venv: $venvPython"
        & $venvPython manage.py runserver
        exit $LASTEXITCODE
    }

    Write-Warning ".venv ton tai nhung chua du dependency. Fallback sang python he thong."
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Khong tim thay python he thong de chay backend."
}

if (-not (Test-Path $venvPython)) {
    Write-Host "Khong tim thay .venv, su dung python he thong"
} else {
    Write-Host "Su dung python he thong"
}

python manage.py runserver
