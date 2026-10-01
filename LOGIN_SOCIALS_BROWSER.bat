@echo off
chcp 65001 >nul
title Prime Media - Login to X (Twitter) & Reddit (Permanent Session)
echo =======================================================================
echo   PRIME MEDIA - 1-TIME CHROME PROFILE LOGIN FOR SOCIAL BROWSER BOT
echo =======================================================================
echo.
echo [1] Yeh script aapka Chrome Automation Profile kholega.
echo [2] X (Twitter) aur Reddit par bas EK BAAR login kar lijiye.
echo [3] Login karne ke baad browser close kar dein.
echo.
echo Uske baad "START_SOCIAL_BROWSER_BOT.bat" chalayein,
echo bot aapke logged-in account se 100%% BINA KISI API KEY ke post karega!
echo =======================================================================
echo.

set PROFILE_DIR=%~dp0..\01_VOX_Documentary_Engine\chrome_automation_profile
if not exist "%PROFILE_DIR%" set PROFILE_DIR=%~dp0chrome_social_profile

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="%PROFILE_DIR%" --start-maximized "https://x.com" "https://www.reddit.com"

echo Chrome launched! Press any key after you have logged in to close this window.
pause >nul
