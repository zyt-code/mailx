# Windows CI/CD Pipeline Guide

This guide covers setting up automated Windows builds, signing, and distribution using GitHub Actions.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Actions Setup](#github-actions-setup)
4. [Secrets Configuration](#secrets-configuration)
5. [Workflow Files](#workflow-files)
6. [Release Automation](#release-automation)
7. [Testing and Validation](#testing-and-validation)

## Overview

The Windows CI/CD pipeline automates:
- Building NSIS and MSIX packages on Windows runners
- Code signing with your certificate
- Creating GitHub Releases
- Uploading artifacts
- Notifying users

### Pipeline Architecture

```
┌─────────────────┐
│  Git Push/Tag   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  GitHub Actions (Windows)   │
│  - Install dependencies     │
│  - Build frontend           │
│  - Build Tauri app          │
│  - Sign binaries            │
│  - Create installers        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  GitHub Release / Artifacts │
│  - NSIS installer           │
│  - MSIX package             │
│  - Checksums                │
└─────────────────────────────┘
```

## Prerequisites

### GitHub Repository

1. Create a GitHub repository for mailx
2. Enable GitHub Actions (Settings > Actions > General)
3. Configure branch protection rules (optional)

### Code Signing Certificate

You have two options:

#### Option 1: Certificate in GitHub Secrets (Recommended for small teams)

**Workflow**:
1. Export your certificate as PFX with password
2. Encode certificate as Base64
3. Store in GitHub Secrets

**Security Considerations**:
- GitHub Secrets are encrypted
- Only accessible in workflows
- Never logged in plain text

**Commands**:
```powershell
# Encode certificate to Base64
$bytes = [System.IO.File]::ReadAllBytes("C:\path\to\certificate.pfx")
$b64 = [System.Convert]::ToBase64String($bytes)
$b64 | Out-File -Encoding ASCII certificate.pfx.b64
```

#### Option 2: Azure Key Vault (Recommended for enterprises)

**Workflow**:
1. Store certificate in Azure Key Vault
2. Use GitHub Actions Azure Login
3. Retrieve certificate during workflow

**Pros**:
- Centralized certificate management
- Audit logging
- Access control

**Cons**:
- More complex setup
- Azure subscription required

## GitHub Actions Setup

### Workflow Directory Structure

```
.github/
└── workflows/
    ├── build-windows.yml      # On push to main
    ├── release-windows.yml    # On tag push
    └── test-windows.yml       # On PR
```

### Windows Runner Requirements

Use `windows-latest` runner:
- Windows Server 2022
- Visual Studio 2022
- Windows SDK
- Node.js, Rust, pnpm pre-installed

## Secrets Configuration

### Required Secrets

Configure these in GitHub (Settings > Secrets and variables > Actions):

| Secret Name | Description | Example |
|------------|-------------|---------|
| `WINDOWS_CERTIFICATE_BASE64` | Base64-encoded PFX certificate | `MIIG... (long string)` |
| `WINDOWS_CERTIFICATE_PASSWORD` | Certificate password | `your_secure_password` |
| `WINDOWS_TIMESTAMP_SERVER` | Timestamp server URL | `http://timestamp.digicert.com` |
| `TAURI_PRIVATE_KEY` | Tauri update key (optional) | `-----BEGIN PRIVATE KEY-----...` |

### Optional Secrets

| Secret Name | Description |
|------------|-------------|
| `AZURE_CREDENTIALS` | Azure service principal for Key Vault |
| `SLACK_WEBHOOK` | For build notifications |
| `DISCORD_WEBHOOK` | For Discord notifications |

### Setting Secrets

Using GitHub CLI:
```bash
gh secret set WINDOWS_CERTIFICATE_BASE64 < certificate.pfx.b64
gh secret set WINDOWS_CERTIFICATE_PASSWORD
gh secret set WINDOWS_TIMESTAMP_SERVER
```

Or via GitHub UI:
1. Go to repository Settings
2. Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret

## Workflow Files

### Build Workflow (`.github/workflows/build-windows.yml`)

Runs on every push to `main`:

```yaml
name: Build Windows

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build frontend
        run: pnpm build

      - name: Decode certificate
        if: github.event_name != 'pull_request'
        run: |
          $certBytes = [System.Convert]::FromBase64String("${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}")
          [System.IO.File]::WriteAllBytes("certificate.pfx", $certBytes)

      - name: Build NSIS installer
        env:
          WINDOWS_SIGNING_CERTIFICATE_PATH: ${{ github.workspace }}/certificate.pfx
          WINDOWS_SIGNING_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
          WINDOWS_TIMESTAMP_SERVER: ${{ secrets.WINDOWS_TIMESTAMP_SERVER }}
        run: |
          pnpm build:nsis

      - name: Build MSIX package
        env:
          WINDOWS_SIGNING_CERTIFICATE_PATH: ${{ github.workspace }}/certificate.pfx
          WINDOWS_SIGNING_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
          WINDOWS_TIMESTAMP_SERVER: ${{ secrets.WINDOWS_TIMESTAMP_SERVER }}
        run: |
          pnpm build:msix

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-build
          path: |
            src-tauri/target/release/bundle/nsis/*.exe
            src-tauri/target/release/bundle/msix/*.msix
          retention-days: 30
```

### Release Workflow (`.github/workflows/release-windows.yml`)

Runs on git tags:

```yaml
name: Release Windows

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write

jobs:
  release:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Get version from tag
        id: get_version
        run: |
          $version = "${{ github.ref_name }}" -replace 'v', ''
          echo "version=$version" >> $env:GITHUB_OUTPUT

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build frontend
        run: pnpm build

      - name: Decode certificate
        run: |
          $certBytes = [System.Convert]::FromBase64String("${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}")
          [System.IO.File]::WriteAllBytes("certificate.pfx", $certBytes)

      - name: Build NSIS installer
        env:
          WINDOWS_SIGNING_CERTIFICATE_PATH: ${{ github.workspace }}/certificate.pfx
          WINDOWS_SIGNING_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
          WINDOWS_TIMESTAMP_SERVER: ${{ secrets.WINDOWS_TIMESTAMP_SERVER }}
        run: pnpm build:nsis

      - name: Build MSIX package
        env:
          WINDOWS_SIGNING_CERTIFICATE_PATH: ${{ github.workspace }}/certificate.pfx
          WINDOWS_SIGNING_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
          WINDOWS_TIMESTAMP_SERVER: ${{ secrets.WINDOWS_TIMESTAMP_SERVER }}
        run: pnpm build:msix

      - name: Generate checksums
        run: |
          Get-ChildItem -Recurse src-tauri/target/release/bundle/*.exe |
            ForEach-Object { certutil -hashfile $_.Path SHA256 | Select-Object -Last 1 } |
            Out-File -Encoding ASCII SHA256SUMS.txt

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/release/bundle/nsis/*.exe
            src-tauri/target/release/bundle/msix/*.msix
            SHA256SUMS.txt
          generate_release_notes: true
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Notify Slack
        if: success()
        run: |
          $payload = @{
            text = "✅ mailx ${{ steps.get_version.outputs.version }} for Windows is released!"
            attachments = @(
              @{
                title = "Download"
                title_link = "${{ github.server_url }}/${{ github.repository }}/releases/tag/${{ github.ref_name }}"
                color = "good"
              }
            )
          } | ConvertTo-Json -Depth 3

          Invoke-RestMethod -Uri ${{ secrets.SLACK_WEBHOOK }} -Method Post -Body $payload -ContentType "application/json"
```

### Test Workflow (`.github/workflows/test-windows.yml`)

Runs on pull requests:

```yaml
name: Test Windows

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm check

      - name: Rust tests
        run: cargo test --manifest-path src-tauri/Cargo.toml

      - name: Frontend tests
        run: npx vitest run

      - name: Build (without signing)
        run: |
          $env:WINDOWS_SKIP_SIGNING = "true"
          pnpm build:nsix
```

## Release Automation

### Semantic Versioning

Use semantic versioning for releases:
- `v1.0.0` - Major release (breaking changes)
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)

### Creating a Release

```bash
# 1. Update version in package.json and src-tauri/Cargo.toml
# 2. Commit changes
git add package.json src-tauri/Cargo.toml
git commit -m "chore: bump version to 1.1.0"

# 3. Create and push tag
git tag v1.1.0
git push origin v1.1.0

# 4. GitHub Actions will automatically:
#    - Build Windows packages
#    - Sign binaries
#    - Create GitHub Release
#    - Upload artifacts
```

### Changelog Generation

The release workflow uses `generate_release_notes: true` to automatically generate changelinks from commits, PRs, and issues.

For custom changelogs, create a `CHANGELOG.md`:

```markdown
## [1.1.0] - 2026-03-22

### Added
- Windows code signing support
- Automated CI/CD pipeline

### Fixed
- IMAP connection timeout issues

### Changed
- Updated Tauri to v2.0
```

## Testing and Validation

### Local Testing

Before pushing to GitHub:

```powershell
# Test build locally
npm run build:windows

# Test scripts
.\scripts\prepare-windows-signing.ps1 -Verbose
.\scripts\sign-windows-build.ps1 -FilePath "path\to\exe" -Verbose
```

### Workflow Testing

1. **Test Build Workflow**:
   ```bash
   git push origin test-workflow
   # Monitor: https://github.com/username/repo/actions
   ```

2. **Test Release Workflow**:
   ```bash
   git tag v0.0.1-test
   git push origin v0.0.1-test
   # Delete test tag after
   git tag -d v0.0.1-test
   git push origin :refs/tags/v0.0.1-test
   ```

### Validation Checklist

Before releasing to production:

- [ ] Certificate is valid (not expired)
- [ ] All secrets are configured
- [ ] Build succeeds on `windows-latest`
- [ ] NSIS installer installs correctly
- [ ] MSIX package installs correctly
- [ ] Code signature is valid
- [ ] Checksums match
- [ ] Release notes are accurate
- [ ] Notifications work

## Best Practices

1. **Always test on a fresh Windows machine** - Verify installation on clean Windows 10/11
2. **Keep workflows simple** - Complex workflows are harder to debug
3. **Use caching** - Speed up builds by caching dependencies
4. **Monitor build times** - Windows builds are slow, optimize where possible
5. **Set up branch protection** - Require status checks before merging
6. **Use draft releases** - Review before publishing to public
7. **Keep secrets rotated** - Update certificate passwords annually
8. **Document failures** - Create issues for failed builds

## Troubleshooting

### Build Fails with "Certificate Error"

**Cause**: Certificate not decoded correctly

**Solution**:
```yaml
# Add verbose output
- name: Decode certificate
  run: |
    $certBytes = [System.Convert]::FromBase64String("${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}")
    [System.IO.File]::WriteAllBytes("certificate.pfx", $certBytes)
    Write-Output "Certificate size: $((Get-Item certificate.pfx).Length) bytes"
```

### NSIS Build Fails

**Cause**: Missing NSIS or configuration error

**Solution**:
```yaml
# Install NSIS explicitly
- name: Install NSIS
  run: choco install nsis -y
```

### Timeout During Build

**Cause**: Build taking too long (default 6 hours)

**Solution**:
```yaml
# Increase timeout
jobs:
  build:
    timeout-minutes: 360
```

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Tauri Publishing Guide](https://v2.tauri.app/distribute/publish/)
- [Windows Code Signing Best Practices](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

## Support

For CI/CD issues:
- Check workflow logs in GitHub Actions
- Review [windows-distribution.md](./windows-distribution.md)
- Open GitHub Issue with workflow run ID
