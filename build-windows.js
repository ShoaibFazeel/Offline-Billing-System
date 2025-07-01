#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Windows build process for OfflineBillingSystem...\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`📦 ${description}...`, 'blue');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed successfully!`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed!`, 'red');
    log(`Error: ${error.message}`, 'red');
    return false;
  }
}

// Check if we're on Windows or have Wine available
function checkBuildEnvironment() {
  const platform = process.platform;
  
  if (platform === 'win32') {
    log('✅ Building on Windows - native support available', 'green');
    return true;
  } else if (platform === 'darwin' || platform === 'linux') {
    try {
      execSync('wine --version', { stdio: 'ignore' });
      log('✅ Wine detected - Windows builds possible', 'green');
      return true;
    } catch (error) {
      log('⚠️  Wine not detected. Windows builds may not work properly.', 'yellow');
      log('💡 To install Wine:', 'cyan');
      if (platform === 'darwin') {
        log('   macOS: brew install --cask wine-stable', 'cyan');
      } else {
        log('   Linux: sudo apt-get install wine (Ubuntu/Debian)', 'cyan');
        log('   Linux: sudo dnf install wine (Fedora)', 'cyan');
      }
      return false;
    }
  }
  
  return false;
}

// Main build process
async function build() {
  // Check build environment
  if (!checkBuildEnvironment()) {
    log('❌ Build environment check failed. Please install Wine if building on non-Windows platform.', 'red');
    process.exit(1);
  }

  // Clean previous builds
  if (fs.existsSync('dist')) {
    log('🧹 Cleaning previous builds...', 'yellow');
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Build React app
  if (!runCommand('npm run build-react', 'Building React application')) {
    process.exit(1);
  }

  // Check if build was successful
  if (!fs.existsSync('build')) {
    log('❌ React build failed - build directory not found', 'red');
    process.exit(1);
  }

  // Build Windows installer and portable
  log('\n🔨 Building Windows executables...', 'magenta');
  
  const buildType = process.argv[2] || 'all';
  
  switch (buildType) {
    case 'installer':
      if (!runCommand('npm run build:win-installer', 'Building Windows installer')) {
        process.exit(1);
      }
      break;
    case 'portable':
      if (!runCommand('npm run build:win-portable', 'Building Windows portable')) {
        process.exit(1);
      }
      break;
    case 'all':
    default:
      if (!runCommand('npm run build:win-all', 'Building Windows installer and portable')) {
        process.exit(1);
      }
      break;
  }

  // Check output
  if (fs.existsSync('dist')) {
    const files = fs.readdirSync('dist');
    log('\n📁 Build output files:', 'green');
    files.forEach(file => {
      const stats = fs.statSync(path.join('dist', file));
      const size = (stats.size / 1024 / 1024).toFixed(2);
      log(`   📄 ${file} (${size} MB)`, 'cyan');
    });
  }

  log('\n🎉 Windows build completed successfully!', 'green');
  log('📂 Check the "dist" folder for your executables.', 'cyan');
}

// Run the build
build().catch(error => {
  log(`❌ Build failed with error: ${error.message}`, 'red');
  process.exit(1);
}); 