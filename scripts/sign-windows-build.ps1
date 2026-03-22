# Windows Build Signing Script
# Signs Windows executables and installers after build

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath,

    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green "✓ $args" }
function Write-Warning { Write-ColorOutput Yellow "⚠ $args" }
function Write-Error { Write-ColorOutput Red "✗ $args" }
function Write-Info { Write-ColorOutput Cyan "ℹ $args" }

# Script starts
Write-Info "Windows Build Signing Script"
Write-Info "============================"

# Load environment variables
$envPath = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envPath)) {
    Write-Error ".env file not found. Run prepare-windows-signing.ps1 first."
    exit 1
}

Get-Content $envPath | Where-Object { $_ -match '^[^#]+=.' } | ForEach-Object {
    $key, $value = $_ -split '=', 2
    Set-Item -Path "env:$($key.Trim())" -Value $value.Trim()
}

# Check if skipping signing
$skipSigning = [Environment]::GetEnvironmentVariable('WINDOWS_SKIP_SIGNING')
if ($skipSigning -eq 'true') {
    Write-Warning "Skipping code signing (WINDOWS_SKIP_SIGNING=true)"
    exit 0
}

# Verify file exists
if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

# Get certificate details
$certPath = [Environment]::GetEnvironmentVariable('WINDOWS_SIGNING_CERTIFICATE_PATH')
$certPassword = [Environment]::GetEnvironmentVariable('WINDOWS_SIGNING_CERTIFICATE_PASSWORD')
$timestampServer = [Environment]::GetEnvironmentVariable('WINDOWS_TIMESTAMP_SERVER')

Write-Info "Signing: $FilePath"
Write-Info "Certificate: $certPath"
Write-Info "Timestamp: $timestampServer"

# Find signtool.exe
$signtoolPaths = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe",
    "${env:ProgramFiles(x86)}\Windows Kits\8.1\bin\x64\signtool.exe"
)

$signtool = $null
foreach ($path in $signtoolPaths) {
    $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $signtool = $found.FullName
        break
    }
}

if (-not $signtool) {
    Write-Error "signtool.exe not found. Install Windows SDK."
    exit 1
}

# Build signtool arguments
$args = @(
    'sign'
    '/f', $certPath
    '/p', $certPassword
    '/tr', $timestampServer
    '/td', 'sha256'
    '/fd', 'sha256'
)

if ($Verbose) {
    $args += '/v'
}

$args += $FilePath

# Execute signing
Write-Info "`nExecuting signtool..."
try {
    $result = & $signtool $args 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "File signed successfully!"
        if ($Verbose) {
            Write-Output $result
        }
    } else {
        Write-Error "Signing failed with exit code: $LASTEXITCODE"
        Write-Output $result
        exit 1
    }
} catch {
    Write-Error "Signing failed: $_"
    exit 1
}

# Verify signature
Write-Info "`nVerifying signature..."
$verifyArgs = @('verify', '/pa', '/v', $FilePath)
$verifyResult = & $signtool $verifyArgs 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Signature verified successfully!"
} else {
    Write-Warning "Signature verification returned warnings:"
    Write-Output $verifyResult
}
