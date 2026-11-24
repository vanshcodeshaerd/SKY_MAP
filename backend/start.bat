@echo off
cd /d "%~dp0"
echo Starting SkyGazer NASA JPL DE421 API on http://127.0.0.1:8000
py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
if errorlevel 1 python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
