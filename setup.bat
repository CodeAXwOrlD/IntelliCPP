@echo off
REM CodeFlow Autocomplete - Quick Build & Run Script (Windows)
REM Usage: setup.bat

REM Change to script directory so commands run relative to the project
pushd %~dp0

echo 🚀 CodeFlow AI Autocomplete - Setup Script
echo ==========================================

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Node.js not found. Install from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo ✓ Node.js %NODE_VER% found

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  npm not found
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo ✓ npm %NPM_VER% found

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Build backend (optional - skipped by default). To enable set BUILD_BACKEND=1
if "%BUILD_BACKEND%"=="1" (
    echo 🔨 Building C++ backend...
    call npm run build:backend || echo ⚠️  Backend build failed (optional for demo)
) else (
    echo ⚠️  Skipping C++ backend build. To enable, run with: set BUILD_BACKEND=1 && setup.bat
)

echo.
echo ✅ Setup complete!
echo.
echo 🎯 Next steps:
echo    npm start          - Start dev server
echo    npm run build      - Production build
echo    npm test           - Run all tests
echo.
echo 💡 Type 'vector v;' then 'v.' to test autocomplete!

REM Return to original directory
popd
