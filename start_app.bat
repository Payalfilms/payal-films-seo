@echo off
title Image SEO Pro - AI Visual Analyzer & Auto-Renamer
color 0b

echo ======================================================
echo    Image SEO Pro - AI Visual Analyzer & Auto-Renamer
echo ======================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] First time setup: Installing required packages...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo [OK] Starting local server at http://localhost:3000 ...
echo [OK] Opening your browser automatically...
echo.

:: Start browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Start Node.js Server
node server.js

pause
