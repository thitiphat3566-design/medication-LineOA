@echo off
title Medication Monitor System
color 0b

echo ===================================================
echo     Starting Medication Line OA System...
echo ===================================================
echo.

:: 1. Start the Backend Server (Node.js) in a new command prompt window
echo [1/2] Starting Node.js Backend Server...
start "Backend Server" cmd /k "node src\index.js"

:: Give it a 2 second delay to ensure backend starts first
timeout /t 2 /nobreak > nul

:: 2. Start the Frontend Dashboard (React/Vite) in a new command prompt window
echo [2/2] Starting React Web Dashboard...
start "React Dashboard" cmd /k "cd dashboard && npm run dev"

echo.
echo ===================================================
echo   System Started Successfully!
echo   1. Backend is running on port 3000
echo   2. Dashboard is running on your browser
echo.
echo   You can close this black window.
echo ===================================================
timeout /t 5 > nul
