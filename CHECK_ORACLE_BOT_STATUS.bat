@echo off
title Check Oracle Cloud Social Bot Status
color 0A
echo =====================================================================
echo  ORACLE CLOUD - 24/7 SOCIAL BROWSER BOT LIVE STATUS
echo =====================================================================
echo Server: 129.159.201.219 (Oracle Cloud Always Free VM)
echo.

ssh -i "%USERPROFILE%\.ssh\oracle_ai_server.key" -o StrictHostKeyChecking=no ubuntu@129.159.201.219 "sudo systemctl status social_bot --no-pager; echo '--- LAST 25 BOT LOGS ---'; tail -n 25 /home/ubuntu/social_bot/bot.log 2>/dev/null || echo 'No logs yet'"

echo.
echo =====================================================================
pause
