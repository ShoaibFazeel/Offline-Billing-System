# Windows Build Instructions for OfflineBillingSystem

This guide will help you build Windows `.exe` files (installer and portable) for your Electron application.

## Prerequisites

### On Windows (Recommended)
- Node.js 16+ and npm
- No additional software needed

### On macOS/Linux
- Node.js 16+ and npm
- **Wine** (required for Windows builds)

#### Installing Wine:

**macOS:**
```bash
brew install --cask wine-stable
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install wine
```

**Fedora:**
```bash
sudo dnf install wine
```

## Build Scripts

The following npm scripts are available for building:

### Quick Build Commands

```bash
# Build both installer and portable (recommended)
npm run build:win-all

# Build only installer
npm run build:win-installer

# Build only portable
npm run build:win-portable

# Build for all platforms (Windows, macOS, Linux)
npm run build
```

### Using the Custom Build Script

```bash
# Build everything (installer + portable)
node build-windows.js

# Build only installer
node build-windows.js installer

# Build only portable
node build-windows.js portable
```

## Build Output

After a successful build, you'll find the following files in the `dist/` folder:

### Installer
- `OfflineBillingSystem Setup 1.0.0.exe` - Windows installer
- Installs to `C:\Program Files\OfflineBillingSystem\`
- Creates desktop and start menu shortcuts
- Adds to Add/Remove Programs

### Portable
- `OfflineBillingSystem-1.0.0-portable.exe` - Portable executable
- Can be run from any location (USB drive, etc.)
- No installation required
- No registry entries

## Build Configuration

The build configuration is in `package.json` under the `build` section:

### Key Settings:
- **appId**: `com.offlinebilling.system`
- **productName**: `OfflineBillingSystem`
- **version**: `1.0.0`
- **output**: `dist/` folder

### Windows-specific Settings:
- **Targets**: NSIS installer + Portable executable
- **Architecture**: x64 only
- **Icons**: Uses `build-resources/icon.ico`
- **Installation**: Custom directory selection, desktop shortcuts

## Customization

### Icons
Place your application icons in the `build-resources/` folder:
- `icon.ico` - Windows icon (256x256 recommended)
- `icon.icns` - macOS icon
- `icon.png` - Linux icon (512x512 recommended)

### Installer Customization
Edit `build-resources/installer.nsh` to customize:
- Default installation directory
- Registry entries
- Shortcut creation
- Uninstaller behavior

### Build Configuration
Modify the `build` section in `package.json` to:
- Change app name/ID
- Add additional files
- Modify installer options
- Change output formats

## Troubleshooting

### Common Issues

**1. Wine not found (macOS/Linux)**
```bash
# Check if Wine is installed
wine --version

# If not installed, follow the installation instructions above
```

**2. Build fails with "electron-builder not found"**
```bash
# Reinstall dependencies
npm install
```

**3. React build fails**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**4. Large file size**
- The final executable will be ~100-200MB (includes Electron runtime)
- This is normal for Electron applications

### Build Logs
Check the console output for detailed error messages. The build script provides colored output to help identify issues.

## Distribution

### Installer
- Share the `.exe` installer file
- Users can install normally through the installer
- Automatically creates shortcuts and registry entries

### Portable
- Share the portable `.exe` file
- Users can run directly without installation
- Perfect for USB drives or temporary use

## Version Management

To update the version:
1. Update `version` in `package.json`
2. Update version in `build-resources/installer.nsh` if needed
3. Rebuild the application

## Security Notes

- The portable version doesn't require admin privileges
- The installer can be run with or without admin rights
- All builds are code-signed ready (add your certificate in `package.json`)

## Performance Tips

- Use `npm run build-react` for production builds
- Clean the `dist/` folder before rebuilding
- Use the custom build script for better error handling
- Build on Windows for best compatibility 