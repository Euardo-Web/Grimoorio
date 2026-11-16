@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" (
  echo Ambiente local ausente. Siga as instrucoes do README.md.
  pause
  exit /b 1
)
"backend\.venv\Scripts\python.exe" "tools\local_demo.py"
pause
