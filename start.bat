@echo off
title RetroLAN v2.0
cd /d "%~dp0"

echo ============================================
echo        RetroLAN - LAN Party Hub
echo ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js non trovato. Scarica da: https://nodejs.org
    pause
    exit /b
)

if not exist "%~dp0node_modules" (
    echo [1/2] Prima installazione: scarico dipendenze...
    call npm install
    if %errorlevel% neq 0 (
        echo [!] Errore npm install.
        pause
        exit /b
    )
)

echo [2/2] Avvio RetroLAN...
echo.

:: Ensure path.txt exists for electron
if not exist "%~dp0node_modules\electron\path.txt" (
    echo electron.exe > "%~dp0node_modules\electron\path.txt"
)

:: Try to download electron binary if missing
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
    echo [!] Scarico Electron...
    node "%~dp0node_modules\electron\install.js"
)

:: Launch directly
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
exit
