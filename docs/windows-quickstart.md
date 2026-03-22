# Windows Package & Distribution Quickstart

Quick reference guide for Windows packaging and distribution.

## 🚀 Quick Start

### 1. Setup Environment

```powershell
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
notepad .env
```

### 2. Verify Setup

```powershell
# Run verification script
.\scripts\prepare-windows-signing.ps1 -Verbose
```

### 3. Build Packages

```bash
# Build NSIS installer
npm run build:nsis

# Build MSIX package
npm run build:msix

# Build both
npm run build:windows
```

## 📦 Build Outputs

| Format | Command | Output Location |
|--------|---------|-----------------|
| NSIS | `npm run build:nsis` | `src-tauri/target/release/bundle/nsis/mailx_*_setup.exe` |
| MSIX | `npm run build:msix` | `src-tauri/target/release/bundle/msix/mailx_*.msix` |

## 🔐 Manual Signing

```powershell
# Sign a specific file
.\scripts\sign-windows-build.ps1 -FilePath "path\to\file.exe" -Verbose
```

## 📋 Release Checklist

- [ ] Certificate is valid (not expired)
- [ ] `.env` file configured with credentials
- [ ] `prepare-windows-signing.ps1` passes all checks
- [ ] NSIS installer builds successfully
- [ ] MSIX package builds successfully
- [ ] Binaries are signed
- [ ] Test installation on clean Windows machine
- [ ] Create git tag for version: `git tag v1.0.0 && git push origin v1.0.0`

## 📚 Documentation

- **Full Distribution Guide**: [windows-distribution.md](./windows-distribution.md)
- **CI/CD Setup**: [windows-ci-cd.md](./windows-ci-cd.md)

## 🔧 Troubleshooting

### Certificate Issues

```powershell
# Check certificate validity
certutil -store MY | Select-String "NotAfter", "NotBefore"
```

### Build Fails

```bash
# Clean build
rm -rf src-tauri/target
npm run build:windows
```

### Signing Fails

```powershell
# Verify signtool is available
where.exe signtool.exe

# If not found, install Windows SDK
winget install Microsoft.WindowsSDK
```

## 🎯 Distribution Channels

| Channel | Format | Best For |
|---------|--------|----------|
| Direct Download | NSIS | Open-source, early adopters |
| Microsoft Store | MSIX | Mainstream users |
| Chocolatey | NUPKG | Power users, developers |

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/mailx/issues
- Documentation: See [windows-distribution.md](./windows-distribution.md)
