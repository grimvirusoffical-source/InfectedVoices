@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\eas-windows-bootstrap.ps1"
if errorlevel 1 (
  echo.
  echo EAS release setup stopped with an error.
  pause
  exit /b 1
)
echo.
echo EAS release setup completed.
pause
