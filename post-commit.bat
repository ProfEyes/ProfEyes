@echo off
echo Executando sincronizacao automatica dos repositorios...
powershell -ExecutionPolicy Bypass -File "%~dp0sync-repos.ps1"
echo Sincronizacao automatica concluida.
