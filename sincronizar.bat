@echo off
echo Sincronizando repositorios...
powershell -ExecutionPolicy Bypass -File "%~dp0sync-repos.ps1"
echo.
echo Sincronizacao concluida!
pause 