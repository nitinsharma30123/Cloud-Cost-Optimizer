@echo off
echo ==========================================
echo  Cloud Cost Optimizer - Compiling C++ Core
echo ==========================================

:: Create bin directory if it doesn't exist
if not exist "bin" mkdir bin

:: Check if g++ is in the path
where g++ >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] g++ compiler not found in system PATH.
    echo Please install MinGW-w64 or GCC and add it to your PATH.
    echo.
    echo Node.js backend will run the JavaScript-equivalent fallback algorithms.
    exit /b 1
)

echo Compiling main.cpp...
g++ -O3 -std=c++17 src/main.cpp -o bin/optimizer.exe -Iinclude

if %errorlevel% equ 0 (
    echo [SUCCESS] Binary successfully compiled to bin/optimizer.exe
    exit /b 0
) else (
    echo [ERROR] Compilation failed. Please check build errors.
    exit /b %errorlevel%
)
