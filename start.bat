@echo off
title Prahari
echo.
echo  Prahari - Citizen Guardian Network
echo  ===================================
echo.

if not exist "node_modules" (
  echo  Installing dependencies...
  call npm install
  if errorlevel 1 ( echo Failed to install. & pause & exit /b 1 )
  echo.
)

if not exist ".env" (
  echo  .env not found. Copy .env.example to .env and set DATABASE_URL and JWT_SECRET.
  pause
  exit /b 1
)

echo  Starting server at http://localhost:3001
echo  Press Ctrl+C to stop.
echo.
node prahari-server.js
pause
