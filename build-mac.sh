#!/bin/bash
# CONTAM-Next macOS Build Script
# 生成 macOS 版本的 CONTAM-Next (.app 或 .dmg)
#
# 前提条件:
#   1. Xcode Command Line Tools: xcode-select --install
#   2. CMake: brew install cmake
#   3. Node.js 20+: brew install node
#   4. Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
#
# 用法: chmod +x build-mac.sh && ./build-mac.sh

set -e

echo "=== CONTAM-Next macOS Builder ==="
echo ""

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    TARGET="aarch64-apple-darwin"
else
    TARGET="x86_64-apple-darwin"
fi
echo "Architecture: $ARCH ($TARGET)"

# Step 1: Build C++ Engine
echo ""
echo "[1/4] Building C++ engine..."
cd engine
mkdir -p build
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j$(sysctl -n hw.ncpu)

# Run tests
echo "[1b/4] Running unit tests..."
./build/contam_tests --gtest_print_time=0
echo "All tests passed!"
cd ..

# Step 2: Copy engine binary with Tauri naming convention
echo ""
echo "[2/4] Preparing engine binary for Tauri..."
cp engine/build/contam_engine "app/src-tauri/contam_engine-${TARGET}"
chmod +x "app/src-tauri/contam_engine-${TARGET}"
echo "  Copied to app/src-tauri/contam_engine-${TARGET}"

# Step 3: Build frontend
echo ""
echo "[3/4] Building frontend..."
cd app
npm ci
npx tsc --noEmit
echo "TypeScript check passed!"
cd ..

# Step 4: Build Tauri app
echo ""
echo "[4/4] Building Tauri app..."
cd app
npx tauri build
cd ..

echo ""
echo "=== Build Complete ==="
echo "App bundle: app/src-tauri/target/release/bundle/macos/CONTAM-Next.app"
echo "DMG:        app/src-tauri/target/release/bundle/dmg/CONTAM-Next_1.0.0_${ARCH}.dmg"
