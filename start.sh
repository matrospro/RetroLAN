#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "============================================"
echo "       RetroLAN - LAN Party Hub"
echo "============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Node.js not found."
    echo "    Install from: https://nodejs.org"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "[1/2] First install: downloading dependencies..."
    npm install --no-optional
    if [ $? -ne 0 ]; then
        echo "[!] npm install failed."
        exit 1
    fi
    echo "Done."
    echo ""
fi

echo "[2/2] Starting RetroLAN..."
echo ""

# Check electron binary exists
if [ ! -f "node_modules/electron/dist/electron" ] && [ ! -f "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
    echo "[!] Electron binary missing. Downloading..."
    node -e "require('fs').writeFileSync('node_modules/electron/path.txt','electron');process.exit(0)"
    node node_modules/electron/install.js
fi

# Launch
if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a "$DIR/node_modules/electron/dist/Electron.app" "$DIR"
else
    "$DIR/node_modules/electron/dist/electron" "$DIR" &
fi

echo "RetroLAN avviato! Chiudi la finestra per uscire."
