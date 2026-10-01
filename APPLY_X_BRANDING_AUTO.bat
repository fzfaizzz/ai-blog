@echo off
title Auto-Brand X Profile (Prime Media)
color 0B
echo =====================================================================
echo   PRIME MEDIA - 1-CLICK AUTONOMOUS X (TWITTER) BRANDING
echo =====================================================================
echo.
echo Uploading:
echo  - 3D Neon Logo / Avatar
echo  - 16:9 Cinematic News Banner
echo  - Display Name, Bio, Location, Website
echo  - Introductory Welcome Tweet
echo.

cd /d "%~dp0"
python apply_x_branding.py

echo.
pause
