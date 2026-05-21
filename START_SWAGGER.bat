@echo off
REM Windows Batch Script to Start CTS OCR API with Swagger
REM Run this file in your project folder

echo.
echo ===============================================
echo CTS OCR API - Swagger Documentation Setup
echo ===============================================
echo.
echo Checking if you're in the correct directory...
echo Current path: %CD%
echo.

REM Change to project directory
cd /d "e:\kiran\CTS_OCR\Backup\12032026_bkp\orc"

echo.
echo ✓ Directory: %CD%
echo.
echo Starting Node.js server on port 5002...
echo.
echo Once started, open your browser and visit:
echo.
echo 📖 Swagger UI: http://localhost:5002/docs/swagger-ui.html
echo 📊 Dashboard:  http://localhost:5002/docs/api-dashboard.html
echo 🏠 Home:       http://localhost:5002/
echo.
echo ================================================
echo.

REM Start the server
npm start

pause
