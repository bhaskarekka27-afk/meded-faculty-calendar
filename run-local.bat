@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js was not found on your PATH.
  echo   Install it from https://nodejs.org/ then run this file again.
  echo.
  pause
  exit /b 1
)

echo Starting PW MedEd local test server...
start "PW MedEd server" cmd /k "node server.cjs"

echo Waiting for the server to come up...
timeout /t 3 /nobreak >nul

start "" http://localhost:5173/admin
exit /b 0
