@echo off
REM Script de compilation pour VLogger CLI en Go

echo Building VLogger CLI for Windows...

cd /d "%~dp0"

REM Compiler pour Windows
go build -o vlg.exe -ldflags "-s -w" main.go

if %ERRORLEVEL% EQU 0 (
    echo ✅ Compilation réussie! Exécutable créé: vlg.exe
    echo.
    echo Pour utiliser:
    echo   1. Placez vlg.exe dans un dossier accessible (ex: C:\vlg\)
    echo   2. Ajoutez ce dossier au PATH de Windows
    echo   3. Utilisez: vlg init, vlg install, etc.
) else (
    echo ❌ Compilation échouée!
    exit /b 1
)

pause
