@echo off
chcp 65001 >nul
title Prime Media - Reddit 1-Click Login & Oracle Cloud Sync
echo =======================================================================
echo   PRIME MEDIA - 1-CLICK REDDIT LOGIN & ORACLE CLOUD SYNC
echo =======================================================================
echo.
echo [1] Yeh script aapke computer par Chrome kholega Reddit login ke sath.
echo [2] Bas apna Reddit account login kar lijiye (Username/Password ya Google se).
echo [3] Login hote hi script automatically detect karke session ko 
echo     Oracle Cloud server par bhej dega aur 24/7 bot me active kar dega!
echo.
echo =======================================================================
echo.

python "%~dp0login_reddit_sync.py"

echo.
pause
