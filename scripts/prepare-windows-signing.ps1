# Windows Code Signing Preparation Script
# This script prepares the Windows build environment for code signing

param(
    [switch]$SkipVerification,
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
Write-Info "Windows Code Signing Preparation Script"
Write-Info "======================================"

# Check if .env file exists
$envPath = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envPath)) {
    Write-Warning ".env file not found. Creating from .env.example..."
    $envExamplePath = Join-Path $PSScriptRoot "..\.env.example"
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Success "Created .env file. Please edit it with your credentials."
        Write-Warning "IMPORTANT: Add .env to your .gitignore file!"
        exit 0
    } else {
        Write-Error ".env.example not found. Cannot create .env file."
        exit 1
    }
}

# Load environment variables
Write-Info "Loading environment variables from .env..."
Get-Content $envPath | Where-Object { $_ -match '^[^#]+=.' } | ForEach-Object {
    $key, $value = $_ -split '=', 2
    Set-Item -Path "env:$($key.Trim())" -Value $value.Trim()
}

# Verify required environment variables
Write-Info "`nVerifying required environment variables..."
$requiredVars = @(
    'WINDOWS_SIGNING_CERTIFICATE_PATH',
    'WINDOWS_SIGNING_CERTIFICATE_PASSWORD',
    'WINDOWS_TIMESTAMP_SERVER'
)

$missingVars = @()
foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missingVars += $var
        Write-Warning "$var is not set"
    } else {
        if ($Verbose) {
            Write-Success "$var is set"
        }
    }
}

if ($missingVars.Count -gt 0) {
    Write-Error "Missing required environment variables: $($missingVars -join ', ')"
    Write-Info "`nPlease set these in your .env file and try again."
    exit 1
}

# Verify certificate exists
$certPath = [Environment]::GetEnvironmentVariable('WINDOWS_SIGNING_CERTIFICATE_PATH')
Write-Info "`nVerifying certificate at: $certPath"

if (-not (Test-Path $certPath)) {
    Write-Error "Certificate file not found at: $certPath"
    Write-Info "`nTo obtain a code signing certificate:"
    Write-Info "1. Purchase from a Certificate Authority (DigiCert, Sectigo, etc.)"
    Write-Info "2. Export as PFX format with private key"
    Write-Info "3. Store in a secure location"
    exit 1
}

# Verify certificate is valid PFX
try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $cert.Import($certPath, [Environment]::GetEnvironmentVariable('WINDOWS_SIGNING_CERTIFICATE_PASSWORD'), 'PersistKeySet')
    Write-Success "Certificate loaded successfully"
    Write-Info "  Subject: $($cert.Subject)"
    Write-Info "  Issuer: $($cert.Issuer)"
    Write-Info "  Valid Until: $($cert.NotAfter)"

    if ($cert.NotBefore -gt (Get-Date)) {
        Write-Warning "Certificate is not yet valid (valid from $($cert.NotBefore))"
    }

    if ($cert.NotAfter -lt (Get-Date)) {
        Write-Error "Certificate has expired (expired on $($cert.NotAfter))"
        exit 1
    }
} catch {
    Write-Error "Failed to load certificate: $_"
    Write-Info "`nCommon issues:"
    Write-Info "1. Wrong password - check WINDOWS_SIGNING_CERTIFICATE_PASSWORD"
    Write-Info "2. Corrupted PFX file - re-export from certificate store"
    Write-Info "3. Invalid PFX format - ensure it's a PKCS#12 (.pfx) file"
    exit 1
}

# Verify timestamp server
$timestampServer = [Environment]::GetEnvironmentVariable('WINDOWS_TIMESTAMP_SERVER')
Write-Info "`nVerifying timestamp server: $timestampServer"

if (-not $SkipVerification) {
    try {
        $response = Invoke-WebRequest -Uri $timestampServer -Method GET -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Success "Timestamp server is reachable"
        }
    } catch {
        Write-Warning "Could not verify timestamp server: $_"
        Write-Info "This may be temporary. Continuing..."
    }
}

# Check for required tools
Write-Info "`nChecking for required tools..."

# Check for signtool.exe (part of Windows SDK)
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

if ($signtool) {
    Write-Success "signtool.exe found at: $signtool"
} else {
    Write-Warning "signtool.exe not found"
    Write-Info "Install Windows SDK from: https://developer.microsoft.com/windows/downloads/windows-sdk/"
}

# Check for Tauri CLI
Write-Info "`nChecking for Tauri CLI..."
try {
    $tauriVersion = tauri --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tauri CLI installed: $tauriVersion"
    } else {
        Write-Warning "Tauri CLI not found in PATH"
    }
} catch {
    Write-Warning "Tauri CLI not found: $_"
}

# Summary
Write-Info "`n======================================"
Write-Success "Environment preparation complete!"
Write-Info "`nNext steps:"
Write-Info "1. Run: npm run build:nsis"
Write-Info "2. Run: npm run build:msix"
Write-Info "3. Sign the generated executables manually (if needed)"
Write-Info "`nNote: Tauri will automatically sign during build if configured correctly."
Write-Info "See docs/windows-distribution.md for details."
