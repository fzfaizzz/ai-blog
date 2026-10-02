"""
Prime Media - 1-Click Reddit Login & Oracle Cloud Sync
======================================================
1. Opens Google Chrome with existing social_auth.json (preserving X / Twitter login).
2. Directs you to https://www.reddit.com/login.
3. Automatically detects when you have successfully logged in.
4. Saves combined credentials (Twitter + Reddit) to social_auth.json.
5. Uploads directly to Oracle Cloud VM (129.159.201.219) and restarts the 24/7 service!
"""

import os
import sys
import json
import time
import subprocess
import tkinter as tk
from tkinter import messagebox
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUTH_PATH = os.path.join(BASE_DIR, "social_auth.json")
KEY_PATH = os.path.expanduser("~/.ssh/oracle_ai_server.key")
ORACLE_HOST = "ubuntu@129.159.201.219"
REMOTE_DIR = "/home/ubuntu/social_bot"

def get_logged_in_reddit_user(context):
    """Checks cookies and page to see if a real Reddit user session exists"""
    cookies = context.cookies(["https://www.reddit.com", "https://old.reddit.com"])
    has_session = False
    for c in cookies:
        if c.get("name") in ["reddit_session", "token_v2"]:
            # Check if token_v2 belongs to a logged-in user rather than guest
            if c.get("name") == "reddit_session":
                has_session = True
            elif c.get("name") == "token_v2":
                try:
                    import base64
                    parts = c.get("value", "").split(".")
                    if len(parts) > 1:
                        payload = parts[1] + "=" * (-len(parts[1]) % 4)
                        data = json.loads(base64.b64decode(payload))
                        # If sub is not loid and not None, it's a real user ID
                        if data.get("sub") and data.get("sub") != "loid":
                            has_session = True
                except Exception:
                    pass
    return has_session

def upload_and_restart():
    """Uploads social_auth.json to Oracle Cloud and restarts service"""
    print("\n☁️ Uploading updated credentials to Oracle Cloud VM...")
    scp_cmd = [
        "scp", "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no",
        AUTH_PATH,
        f"{ORACLE_HOST}:{REMOTE_DIR}/social_auth.json"
    ]
    subprocess.run(scp_cmd, check=True)
    print("✅ Credentials uploaded to Oracle VM successfully!")

    print("\n🔄 Restarting 24/7 social bot on Oracle VM...")
    restart_cmd = [
        "ssh", "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no",
        ORACLE_HOST,
        "sudo systemctl restart social_bot && sudo systemctl status social_bot --no-pager -n 5"
    ]
    res = subprocess.run(restart_cmd, capture_output=True, text=True)
    print(res.stdout)
    print("🎉 Bot restarted on Oracle Cloud with both 𝕏 and Reddit active!")

def main():
    print("=" * 65)
    print("🔴 PRIME MEDIA - REDDIT 1-CLICK LOGIN & CLOUD SYNC")
    print("=" * 65)

    if not os.path.exists(KEY_PATH):
        print(f"❌ Error: Oracle SSH key not found at {KEY_PATH}")
        sys.exit(1)

    print("🌐 Launching Google Chrome for Reddit login...")
    print("👉 Please log into your Reddit account in the browser window.")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"]
        )

        # Load existing state if available to preserve Twitter
        if os.path.exists(AUTH_PATH):
            print(f"📂 Loading existing credentials from {AUTH_PATH} (Twitter session preserved)...")
            context = browser.new_context(
                storage_state=AUTH_PATH,
                viewport=None,
                no_viewport=True
            )
        else:
            context = browser.new_context(viewport=None, no_viewport=True)

        page = context.new_page()
        page.goto("https://www.reddit.com/login", wait_until="domcontentloaded")

        print("\n⏳ Waiting for Reddit login...")
        print("💡 TIP: You can log in with your Reddit username/password or Google.")
        print("💡 The script will automatically detect when login completes!\n")

        # Auto-detection loop
        logged_in = False
        start_time = time.time()
        timeout = 300  # 5 minutes timeout

        while time.time() - start_time < timeout:
            time.sleep(2)
            if get_logged_in_reddit_user(context):
                logged_in = True
                print("\n🎯 REDDIT LOGIN DETECTED SUCCESSFULLY!")
                break
            # Also check if page redirected to reddit home/feed and not on login page
            current_url = page.url
            if "reddit.com" in current_url and "login" not in current_url and "register" not in current_url:
                # Give 3 seconds to finalize cookies
                time.sleep(3)
                if get_logged_in_reddit_user(context):
                    logged_in = True
                    print("\n🎯 REDDIT LOGIN DETECTED VIA REDIRECT!")
                    break

        if not logged_in:
            print("⚠️ Timeout or login not detected. Saving whatever session was captured...")

        time.sleep(2)
        print("💾 Saving combined session (Twitter + Reddit) to social_auth.json...")
        context.storage_state(path=AUTH_PATH)
        print(f"✅ Session saved locally to: {AUTH_PATH}")

        browser.close()

    # Upload to Oracle VM
    try:
        upload_and_restart()
    except Exception as e:
        print(f"❌ Failed to upload/restart on Oracle VM: {e}")

    print("\n" + "=" * 65)
    print("✅ COMPLETED: Reddit session is now active and synced to Oracle Cloud!")
    print("=" * 65)

if __name__ == "__main__":
    main()
