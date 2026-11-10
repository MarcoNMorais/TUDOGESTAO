@echo off
cd /d "%~dp0"
node iniciar.cjs
if errorlevel 1 pause
