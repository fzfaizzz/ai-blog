@echo off
title Sync Social Bot to Oracle Cloud (24/7 Autopilot)
color 0B
echo =====================================================================
echo  PRIME MEDIA - SYNC SOCIAL BOT TO ORACLE CLOUD SERVER (24/7)
echo =====================================================================
echo.
echo Server: 129.159.201.219 (Oracle Cloud 24GB RAM Ubuntu)
echo.

cd /d "%~dp0"
python sync_sessions_to_oracle.py

echo.
pause
