@echo off
REM Wrapper VLogger - préfère vlg.exe si présent, sinon utilise vlg.js

setlocal

set VLGDIR=%~dp0
set EXE=%VLGDIR%vlg.exe
set JS=%VLGDIR%vlg.js

if exist "%EXE%" (
  "%EXE%" %*
  endlocal
  exit /b %ERRORLEVEL%
)

if exist "%JS%" (
  node "%JS%" %*
  endlocal
  exit /b %ERRORLEVEL%
)

echo ❌ vlg.exe et vlg.js introuvables dans %VLGDIR%
endlocal
exit /b 1
