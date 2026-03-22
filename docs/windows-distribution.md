# Windows Distribution Guide

This guide covers building, signing, and distributing mailx for Windows.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Code Signing Setup](#code-signing-setup)
3. [Building Windows Packages](#building-windows-packages)
4. [Distribution Channels](#distribution-channels)
5. [Automated Signing](#automated-signing)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js** (v18+)
2. **pnpm** (v10+)
3. **Rust** (latest stable)
4. **Visual Studio C++ Build Tools** (for Rust compilation)
5. **Windows SDK** (for signtool.exe)

### Installing Windows SDK

```powershell
# Using winget
winget install Microsoft.WindowsSDK

# Or download from:
# https://developer.microsoft.com/windows/downloads/windows-sdk/
```

The Windows SDK provides `signtool.exe` which is required for code signing.

## Code Signing Setup

### Why Code Signing?

Code signing is **required** for Windows distribution to:
- Avoid Windows SmartScreen warnings
- Build trust with users
- Enable Microsoft Store distribution
- Comply with Windows security policies

### Obtaining a Certificate

#### Option 1: Commercial Certificate Authority (Recommended)

Purchase from a trusted CA:
- **DigiCert**: https://www.digicert.com/signing/code-signing-certificates
- **Sectigo**: https://sectigo.com/ssl-certificates-tls/code-signing
- **GlobalSign**: https://www.globalsign.com/en/code-signing-certificate

**Cost**: $200-500/year
**Validity**: 1-3 years

#### Option 2: Self-Signed Certificate (Development Only)

```powershell
# Create self-signed certificate (NOT for production)
New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=mailx Development" `
    -CertStoreLocation "Cert:\LocalMachine\My"
```

**Warning**: Self-signed certificates will trigger SmartScreen warnings. Only use for testing.

### Export Certificate as PFX

```powershell
# Open Certificate Manager
certmgr.msc

# Navigate to: Personal > Certificates
# Right-click your certificate > All Tasks > Export
# Select: Yes, export the private key
# Format: PKCS #12 (.PFX)
# Set a strong password
```

### Configure Environment

1. Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

2. Edit `.env` and fill in your credentials:
```env
WINDOWS_SIGNING_CERTIFICATE_PATH=C:\path\to\certificate.pfx
WINDOWS_SIGNING_CERTIFICATE_PASSWORD=your_password
WINDOWS_TIMESTAMP_SERVER=http://timestamp.digicert.com
```

3. **IMPORTANT**: Add `.env` to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

### Verify Setup

Run the preparation script:
```powershell
.\scripts\prepare-windows-signing.ps1 -Verbose
```

This will verify:
- Certificate file exists
- Certificate password is correct
- Certificate is valid (not expired)
- Timestamp server is reachable
- Required tools are installed

## Building Windows Packages

### NSIS Installer (Recommended for Direct Download)

```bash
npm run build:nsis
```

**Output**: `src-tauri/target/release/bundle/nsis/mailx_0.1.0_x64-setup.exe`

**Features**:
- Multi-language installer (English, Simplified Chinese, Traditional Chinese)
- Per-machine installation (requires admin)
- Custom installation directory
- Desktop and Start Menu shortcuts
- Automatic updates support

### MSIX Package (Recommended for Microsoft Store)

```bash
npm run build:msix
```

**Output**: `src-tauri/target/release/bundle/msix/mailx_0.1.0_x64.msix`

**Features**:
- Modern Windows packaging format
- Sandboxed installation
- Easy uninstallation
- Microsoft Store ready

### Build Both

```bash
npm run build:windows
```

## Distribution Channels

### Channel 1: Direct Download (Website/GitHub Releases)

**Best for**: Open-source projects, early adopters

**Steps**:
1. Build NSIS installer: `npm run build:nsis`
2. Upload to GitHub Releases
3. Update download links on website

**Pros**:
- Full control over distribution
- No platform fees
- Direct user relationship

**Cons**:
- SmartScreen warnings for new publishers
- No automatic updates
- Manual distribution

### Channel 2: Microsoft Store

**Best for**: Mainstream users, discoverability

**Requirements**:
- Microsoft Developer Account ($19 one-time fee)
- Verified publisher identity
- MSIX package

**Steps**:
1. [Register as a Microsoft Developer](https://developer.microsoft.com/store/register)
2. Create app reservation in Partner Center
3. Upload MSIX package
4. Submit for certification (1-3 days)

**Pros**:
- Built-in trust (no SmartScreen warnings)
- Automatic updates
- 7-day review process
- Access to millions of users

**Cons**:
- $19 registration fee
- 15-30% platform fee on paid apps
- Certification requirements

### Channel 3: Chocolatey Package Manager

**Best for**: Power users, developers

**Requirements**:
- Chocolatey package manifest
- Hosted package repository

**Steps**:
1. Create `package.nuspec` file
2. Submit to [Chocolatey Community Repository](https://chocolatey.org/)

**Pros**:
- Automated installation
- Version management
- Developer audience

**Cons**:
- Requires manual package updates
- Smaller audience

## Automated Signing

### Tauri Built-in Signing

Tauri v2 supports automatic code signing during build. Configure in `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "wix": { ... },
      "nsis": { ... },
      "webviewInstallMode": { "type": "embed" }
    }
  }
}
```

Tauri will automatically sign if environment variables are set.

### Manual Signing

If you need to sign separately:

```powershell
# Sign a specific file
.\scripts\sign-windows-build.ps1 -FilePath "path\to\mailx-setup.exe" -Verbose
```

### Signing in CI/CD

See [windows-ci-cd.md](./windows-ci-cd.md) for automated signing in GitHub Actions.

## Troubleshooting

### Issue: "Certificate is not valid" Error

**Cause**: Certificate expired or not yet valid

**Solution**:
```powershell
# Check certificate validity
certutil -store MY | Select-String "NotAfter", "NotBefore"

# Renew certificate if expired
```

### Issue: "signtool.exe not found"

**Cause**: Windows SDK not installed

**Solution**:
```powershell
# Install Windows SDK
winget install Microsoft.WindowsSDK

# Verify installation
where.exe signtool.exe
```

### Issue: "Timestamp server unreachable"

**Cause**: Network issue or server down

**Solution**: Try alternative timestamp servers:
```env
# DigiCert (default)
WINDOWS_TIMESTAMP_SERVER=http://timestamp.digicert.com

# Sectigo
WINDOWS_TIMESTAMP_SERVER=http://timestamp.sectigo.com

# GlobalSign
WINDOWS_TIMESTAMP_SERVER=http://timestamp.globalsign.com
```

### Issue: SmartScreen still warns after signing

**Cause**: New publisher reputation takes time to build

**Solution**:
- Sign with an EV (Extended Validation) certificate for instant trust
- Build download reputation over time
- Submit to Microsoft Store for instant trust

### Issue: NSIS installer fails to build

**Cause**: Missing NSIS tools or configuration error

**Solution**:
```bash
# Clean build
npm run build:nsis -- --verbose

# Check Tauri logs
# Located in: src-tauri/target/release/build/
```

## Best Practices

1. **Always sign your builds** - Even for development
2. **Use a timestamp server** - Ensures signatures remain valid after certificate expires
3. **Store certificates securely** - Use a hardware security module (HSM) for production
4. **Test on clean Windows machines** - Verify installation on fresh Windows installs
5. **Keep certificates backed up** - Store PFX files in secure, redundant locations
6. **Monitor certificate expiry** - Set alerts 30 days before expiration
7. **Use strong passwords** - Certificate passwords should be 20+ characters

## Additional Resources

- [Tauri Bundler Documentation](https://v2.tauri.app/distribute/bundler/)
- [Windows Code Signing Best Practices](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [Microsoft Store Certification Requirements](https://docs.microsoft.com/en-us/windows/apps/publish/publish-your-app/store-policies)

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/mailx/issues
- Documentation: See [windows-ci-cd.md](./windows-ci-cd.md) for CI/CD setup
