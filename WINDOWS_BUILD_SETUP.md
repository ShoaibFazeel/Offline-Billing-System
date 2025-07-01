# Windows Build Setup Complete! 🎉

Your Electron application is now configured to build Windows `.exe` files (installer and portable versions).

## What Was Set Up

### ✅ Package.json Configuration
- Updated app name to "OfflineBillingSystem"
- Added comprehensive build scripts
- Configured NSIS installer and portable builds
- Set up proper file inclusion and resources

### ✅ Build Scripts Available
```bash
# Build both installer and portable (recommended)
npm run build:win-all

# Build only installer
npm run build:win-installer

# Build only portable
npm run build:win-portable

# Build for all platforms
npm run build
```

### ✅ Custom Build Script
- `build-windows.js` - Enhanced build script with error handling
- Environment detection (Windows vs Wine)
- Colored console output
- Automatic cleanup

### ✅ NSIS Installer Configuration
- Custom installation directory selection
- Desktop and start menu shortcuts
- Proper uninstaller
- Registry entries for Add/Remove Programs

### ✅ Build Resources
- `build-resources/` directory created
- `installer.nsh` - Custom NSIS script
- Placeholder for icons (ready for your custom icons)

## Quick Start

### 1. Test the Build (Development)
```bash
# Build React app in production mode
npm run build-react

# This should create a 'build' folder with your app
```

### 2. Build Windows Executables

**On Windows:**
```bash
npm run build:win-all
```

**On macOS/Linux (with Wine):**
```bash
# First install Wine if not already installed
brew install --cask wine-stable  # macOS
sudo apt-get install wine        # Ubuntu/Debian

# Then build
npm run build:win-all
```

### 3. Check Output
After successful build, check the `dist/` folder for:
- `OfflineBillingSystem Setup 1.0.0.exe` (installer)
- `OfflineBillingSystem-1.0.0-portable.exe` (portable)

## File Structure
```
your-project/
├── package.json              # Updated with build config
├── build-windows.js          # Custom build script
├── build-resources/
│   ├── installer.nsh         # NSIS installer script
│   └── icon.ico              # Placeholder (add your icon)
├── BUILD_INSTRUCTIONS.md     # Detailed instructions
└── dist/                     # Build output (created after build)
```

## Next Steps

### 1. Add Your Icons
Replace the placeholder in `build-resources/`:
- `icon.ico` - Windows icon (256x256 recommended)
- `icon.icns` - macOS icon
- `icon.png` - Linux icon (512x512 recommended)

### 2. Customize Installer
Edit `build-resources/installer.nsh` to:
- Change default installation path
- Modify company name
- Add custom registry entries

### 3. Test Your Build
```bash
# Build and test
npm run build:win-all

# Check the dist folder
ls -la dist/
```

### 4. Distribute
- **Installer**: Share the `.exe` installer for normal installation
- **Portable**: Share the portable `.exe` for USB drives or temporary use

## Troubleshooting

### Common Issues:

**1. "electron-builder not found"**
```bash
npm install
```

**2. "Wine not found" (macOS/Linux)**
```bash
brew install --cask wine-stable
```

**3. Build fails**
```bash
# Clean and rebuild
rm -rf dist build node_modules
npm install
npm run build:win-all
```

**4. Large file size**
- Normal for Electron apps (~100-200MB)
- Includes complete Electron runtime

## Build Configuration Details

### Key Settings in package.json:
- **appId**: `com.offlinebilling.system`
- **productName**: `OfflineBillingSystem`
- **version**: `1.0.0`
- **targets**: NSIS installer + Portable executable
- **architecture**: x64 only

### Installer Features:
- Custom installation directory
- Desktop and start menu shortcuts
- Add/Remove Programs integration
- Proper uninstaller
- No admin privileges required for portable

## Ready to Build! 🚀

Your setup is complete and ready to generate Windows executables. The build process will:

1. Compile your React app in production mode
2. Package it with Electron
3. Create both installer and portable versions
4. Output everything to the `dist/` folder

Run `npm run build:win-all` to get started! 