"""
Sync Social Sessions from Local Chrome to Oracle Cloud Server
==============================================================
1. Opens real Chrome with your automation profile.
2. Lets you log in to X (Twitter) and Reddit (if not already logged in).
3. Automatically exports the session (social_auth.json).
4. Securely uploads it to your Oracle Cloud Server (129.159.201.219).
5. Starts/Restarts the 24/7 autonomous bot on the server!
"""

import os
import sys
import json
import subprocess
import time
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOX_PROFILE = os.path.abspath(os.path.join(BASE_DIR, "..", "01_VOX_Documentary_Engine", "chrome_automation_profile"))
LOCAL_PROFILE = os.path.abspath(os.path.join(BASE_DIR, "chrome_social_profile"))
CHROME_PROFILE_DIR = VOX_PROFILE if os.path.exists(VOX_PROFILE) else LOCAL_PROFILE

AUTH_LOCAL_PATH = os.path.join(BASE_DIR, "social_auth.json")
KEY_PATH = os.path.expanduser("~/.ssh/oracle_ai_server.key")
ORACLE_HOST = "ubuntu@129.159.201.219"
REMOTE_DIR = "/home/ubuntu/social_bot"


def main():
    print("=" * 65)
    print("🚀 PRIME MEDIA - 1-CLICK ORACLE CLOUD SYNC & 24/7 ACTIVATION")
    print("=" * 65)
    print(f"📁 Chrome Profile: {CHROME_PROFILE_DIR}")
    print(f"🔑 SSH Key:        {KEY_PATH}")
    print(f"🌐 Server Target:   {ORACLE_HOST}")
    print("=" * 65)

    if not os.path.exists(KEY_PATH):
        print(f"❌ Error: Oracle SSH Key not found at: {KEY_PATH}")
        sys.exit(1)

    print("\n🌐 Step 1: Opening Chrome with your saved automation profile...")
    print("👉 If you are already logged in to Twitter (X) and Reddit, perfect!")
    print("👉 If not, please log in now in the browser window.\n")

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            CHROME_PROFILE_DIR,
            channel="chrome",
            headless=False,
            viewport={"width": 1280, "height": 800},
            args=["--disable-blink-features=AutomationControlled"]
        )

        p1 = ctx.pages[0] if ctx.pages else ctx.new_page()
        p1.goto("https://x.com", wait_until="domcontentloaded")

        p2 = ctx.new_page()
        p2.goto("https://www.reddit.com", wait_until="domcontentloaded")

        print("---------------------------------------------------------------")
        input("👉 Jab aap X (Twitter) aur Reddit dono me LOGGED IN ho, tab yaha console me ENTER dabayein... ")
        print("---------------------------------------------------------------")

        print("\n💾 Step 2: Exporting authenticated session state...")
        ctx.storage_state(path=AUTH_LOCAL_PATH)
        print(f"✅ Saved session snapshot to: {AUTH_LOCAL_PATH}")
        ctx.close()

    # Step 3: Upload files to Oracle Cloud VM
    print("\n☁️ Step 3: Uploading session and bot scripts to Oracle Cloud Server...")
    cloud_bot_script = os.path.join(BASE_DIR, "cloud_browser_bot.py")

    scp_auth_cmd = [
        "scp", "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no",
        AUTH_LOCAL_PATH,
        f"{ORACLE_HOST}:{REMOTE_DIR}/social_auth.json"
    ]
    scp_bot_cmd = [
        "scp", "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no",
        cloud_bot_script,
        f"{ORACLE_HOST}:{REMOTE_DIR}/cloud_browser_bot.py"
    ]

    print("Uploading cloud_browser_bot.py...")
    subprocess.run(scp_bot_cmd, check=True)

    print("Uploading social_auth.json (session tokens)...")
    subprocess.run(scp_auth_cmd, check=True)
    print("✅ Files uploaded successfully!")

    # Step 4: Restart 24/7 service on server
    print("\n🔄 Step 4: Restarting 24/7 autonomous bot service on Oracle VM...")
    restart_cmd = [
        "ssh", "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no",
        ORACLE_HOST,
        "sudo systemctl restart social_bot && sudo systemctl status social_bot --no-pager"
    ]
    res = subprocess.run(restart_cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print(res.stderr)

    print("=" * 65)
    print("🎉 SUCCESS! Your Autonomous Social Bot is now LIVE 24/7 on Oracle Cloud!")
    print("You can close your PC anytime — Oracle Cloud will post articles automatically!")
    print("=" * 65)


if __name__ == "__main__":
    main()
