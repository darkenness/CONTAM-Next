# CONTAM-Next Windows Installer Build Script
# 生成类似 CONTAM-3.4.0.8-Win32-setup.exe 的安装包
#
# 前提条件:
#   1. Visual Studio 2019+ (C++ workload)
#   2. Node.js 20+
#   3. Rust toolchain (rustup)
#   4. Tauri CLI (npm install -g @tauri-apps/cli)
#
# 用法: .\build-installer.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== CONTAM-Next Installer Builder ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build C++ Engine
Write-Host "[1/4] Building C++ engine..." -ForegroundColor Yellow
$cmakePath = "cmake"
Push-Location engine
if (-not (Test-Path "build")) { New-Item -ItemType Directory -Path "build" | Out-Null }
& $cmakePath -S . -B build -DCMAKE_BUILD_TYPE=Release
& $cmakePath --build build --config Release
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: C++ engine build failed" -ForegroundColor Red; exit 1 }

# Run tests to verify
Write-Host "[1b/4] Running 130 unit tests..." -ForegroundColor Yellow
& "build/Release/contam_tests.exe" --gtest_print_time=0
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Tests failed" -ForegroundColor Red; exit 1 }
Pop-Location

# Step 2: Copy engine to Tauri externalBin location with correct naming
Write-Host "[2/4] Preparing engine binary for Tauri..." -ForegroundColor Yellow
$targetArch = "x86_64-pc-windows-msvc"
$binDir = "app/src-tauri"
$srcExe = "engine/build/Release/contam_engine.exe"
$dstExe = "$binDir/contam_engine-$targetArch.exe"
Copy-Item $srcExe $dstExe -Force
Write-Host "  Copied to $dstExe"

# Step 3: Build frontend
Write-Host "[3/4] Building frontend..." -ForegroundColor Yellow
Push-Location app
npm ci
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: TypeScript check failed" -ForegroundColor Red; exit 1 }
Pop-Location

# Step 4: Build Tauri installer
Write-Host "[4/4] Building Tauri installer (NSIS + MSI)..." -ForegroundColor Yellow
Push-Location app
npx tauri build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Tauri build failed" -ForegroundColor Red; exit 1 }
Pop-Location

# Done
Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host "Installers are in: app/src-tauri/target/release/bundle/"
Write-Host "  NSIS: app/src-tauri/target/release/bundle/nsis/CONTAM-Next_1.0.0_x64-setup.exe"
Write-Host "  MSI:  app/src-tauri/target/release/bundle/msi/CONTAM-Next_1.0.0_x64_en-US.msi"
