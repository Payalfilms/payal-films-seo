@echo off
title Payal Films ImageSEO - Instant Live Public Link
color 0a

echo ========================================================
echo    Payal Films ImageSEO - Instant Internet Share
echo ========================================================
echo.
echo [1/2] Checking if local server is running on port 3000...

:: Start local server in background if not already running
netstat -ano | findstr :3000 >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Starting local server first...
    start "" cmd /c "node server.js"
    timeout /t 3 /nobreak >nul
)

echo [2/2] Generating your secure public internet URL...
echo.
echo --------------------------------------------------------
echo  Aapka App Internet Par Live Ho Raha Hai!
echo  Neeche aane wale URL ko aap phone ya kisi bhi browser
echo  se open kar sakte hain:
echo --------------------------------------------------------
echo.

call npx localtunnel --port 3000

pause
