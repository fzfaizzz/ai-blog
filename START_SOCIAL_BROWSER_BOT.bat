@echo off
chcp 65001 >nul
title Prime Media - Autonomous 24/7 Social Browser Bot (Playwright)
echo =======================================================================
echo   PRIME MEDIA - 24/7 AUTONOMOUS SOCIAL BROWSER BOT (ZERO API KEYS)
echo =======================================================================
echo.
echo - Reuses the exact same Chrome Automation Profile from your other projects!
echo - Monitors https://primemedia.site for fresh published news stories.
echo - Automatically types and clicks to post on Twitter / X and Reddit!
echo - Checks for new articles every 30 minutes in continuous autopilot mode.
echo =======================================================================
echo.

cd /d "%~dp0"
python social_browser_bot.py
pause
