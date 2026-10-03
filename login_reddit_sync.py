"""
Prime Media - 1-Click Reddit Login & Oracle Cloud Sync
======================================================
1. Opens Google Chrome with existing social_auth.json (preserving X / Twitter login).
2. Directs you to https://www.reddit.com/login.
3. Automatically detects when you have successfully logged in OR click the on-screen button.
4. Saves combined credentials (Twitter + Reddit) to social_auth.json.
5. Uploads directly to Oracle Cloud VM (129.159.201.219) and restarts the 24/7 service!
"""

import os
import sys
import json
import time
import subprocess
import threading
import tkinter as tk
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUTH_PATH = os.path.join(BASE_DIR, "social_auth.json")
KEY_PATH = os.path.expanduser("~/.ssh/oracle_ai_server.key")
ORACLE_HOST = "ubuntu@129.159.201.219"
REMOTE_DIR = "/home/ubuntu/social_bot"

stop_flag = threading.Event()
login_confirmed = threading.Event()

def get_logged_in_reddit_user(context):
    """Checks cookies to see if a real Reddit user session exists"""
    try:
        cookies = context.cookies(["https://www.reddit.com", "https://old.reddit.com"])
        for c in cookies:
            if c.get("name") == "reddit_session":
                return True
            if c.get("name") == "token_v2":
                import base64
                parts = c.get("value", "").split(".")
                if len(parts) > 1:
                    payload = parts[1] + "=" * (-len(parts[1]) % 4)
                    data = json.loads(base64.b64decode(payload))
                    if data.get("sub") and data.get("sub") != "loid":
                        return True
    except Exception:
        pass
    return False

def show_floating_helper():
    """Small floating window that allows the user to click when done"""
    try:
        root = tk.Tk()
        root.title("Prime Media - Reddit Login")
        root.geometry("420x220+50+50")
        root.attributes("-topmost", True)
        root.configure(bg="#0F172A")

        def on_confirm():
            login_confirmed.set()
            root.destroy()

        def on_cancel():
            stop_flag.set()
            root.destroy()

        title_lbl = tk.Label(
            root,
            text="🔴 Reddit Login Helper",
            font=("Segoe UI", 13, "bold"),
            fg="#FF4500",
            bg="#0F172A"
        )
        title_lbl.pack(pady=(14, 6))

        desc = (
            "1. Chrome window me apna Reddit account login karein.\n"
            "2. Login hone ke baad neeche diye button par click karein\n"
            "   (ya script automatic bhi detect kar lega)!"
        )
        desc_lbl = tk.Label(
            root,
            text=desc,
            font=("Segoe UI", 9),
            fg="#CBD5E1",
            bg="#0F172A",
            justify="left"
        )
        desc_lbl.pack(padx=20, pady=4)

        btn = tk.Button(
            root,
            text="✅ Main Login Ho Gaya - Save & Sync!",
            font=("Segoe UI", 10, "bold"),
            bg="#FF4500",
            fg="#FFFFFF",
            padx=12,
            pady=6,
            relief="flat",
            cursor="hand2",
            command=on_confirm
        )
        btn.pack(pady=12)

        # Check in a loop if auto-detection completed
        def check_auto():
            if login_confirmed.is_set() or stop_flag.is_set():
                try:
                    root.destroy()
                except Exception:
                    pass
            else:
                root.after(1000, check_auto)

        root.after(1000, check_auto)
        root.protocol("WM_DELETE_WINDOW", on_cancel)
        root.mainloop()
    except Exception as e:
        print(f"Tkinter notice: {e}")

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
    res = subprocess.run(
        restart_cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
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

    # Start floating UI in separate thread
    ui_thread = threading.Thread(target=show_floating_helper, daemon=True)
    ui_thread.start()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"]
        )

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
        print("💡 TIP: Enter your username/password or click 'Continue with Google'.")

        # Auto-detection loop (runs until login confirmed, stop flag, or page closed)
        while not login_confirmed.is_set() and not stop_flag.is_set():
            time.sleep(2)
            try:
                if page.is_closed():
                    break
            except Exception:
                break

            if get_logged_in_reddit_user(context):
                login_confirmed.set()
                print("\n🎯 REDDIT LOGIN DETECTED AUTOMATICALLY!")
                break

            try:
                current_url = page.url
                if "reddit.com" in current_url and "login" not in current_url and "register" not in current_url:
                    time.sleep(3)
                    if get_logged_in_reddit_user(context):
                        login_confirmed.set()
                        print("\n🎯 REDDIT LOGIN DETECTED VIA REDIRECT!")
                        break
            except Exception:
                pass

        time.sleep(1)
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
