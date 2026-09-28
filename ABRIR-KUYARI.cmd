@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 LTS para abrir KUYARI.
  pause
  exit /b 1
)
if not exist node_modules call npm ci
if not exist dist\server\main.js call npm run build
node scripts/local-setup.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-local.ps1"
if errorlevel 1 pause
