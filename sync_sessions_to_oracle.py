"""
Sync Social Sessions from Local Chrome to Oracle Cloud Server
==============================================================
1. Opens real Google Chrome with your profile.
2. Opens tabs for Twitter (X) and Reddit.
3. Shows an on-screen button to click when logged in.
4. Exports storage_state to social_auth.json.
5. Uploads to Oracle Cloud Server (129.159.201.219).
6. Restarts 24/7 bot service on Oracle Cloud!
"""

import os
import sys
import json
import subprocess
import time
import tkinter as tk
from tkinter import messagebox
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOX_PROFILE = os.path.abspath(os.path.join(BASE_DIR, "..", "01_VOX_Documentary_Engine", "chrome_automation_profile"))
LOCAL_PROFILE = os.path.abspath(os.path.join(BASE_DIR, "chrome_social_profile"))
CHROME_PROFILE_DIR = VOX_PROFILE if os.path.exists(VOX_PROFILE) else LOCAL_PROFILE

AUTH_LOCAL_PATH = os.path.join(BASE_DIR, "social_auth.json")
KEY_PATH = os.path.expanduser("~/.ssh/oracle_ai_server.key")
ORACLE_HOST = "ubuntu@129.159.201.219"
REMOTE_DIR = "/home/ubuntu/social_bot"


def show_sync_popup():
    """Shows an always-on-top popup for user to click after logging in"""
    root = tk.Tk()
    root.title("Prime Media - Social Login Sync")
    root.geometry("450x260")
    root.attributes("-topmost", True)
    root.configure(bg="#1e1e2e")

    confirmed = [False]

    def on_confirm():
        confirmed[0] = True
        root.destroy()

    def on_cancel():
        root.destroy()

    lbl_title = tk.Label(
        root,
        text="🔐 Social Login to Oracle Cloud",
        font=("Segoe UI", 14, "bold"),
        fg="#a6e3a1",
        bg="#1e1e2e"
    )
    lbl_title.pack(pady=(15, 8))

    instructions = (
        "1. Chrome window me Twitter (X) aur Reddit par login karein.\n"
        "2. Login hone ke baad neeche diye button par click karein.\n"
        "3. Session automatic Oracle Cloud server par sync ho jayega!"
    )
    lbl_desc = tk.Label(
        root,
        text=instructions,
        font=("Segoe UI", 10),
        fg="#cdd6f4",
        bg="#1e1e2e",
        justify="left"
    )
    lbl_desc.pack(padx=20, pady=5)

    btn_sync = tk.Button(
        root,
        text="🚀 Main Login Ho Gaya - Sync Karein!",
        font=("Segoe UI", 11, "bold"),
        bg="#89b4fa",
        fg="#11111b",
        padx=15,
        pady=8,
        cursor="hand2",
        relief="flat",
        command=on_confirm
    )
    btn_sync.pack(pady=15)

    root.mainloop()
    return confirmed[0]


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

    print("\n🌐 Step 1: Opening Google Chrome with your profile...")
    print("👉 Tabs for X (Twitter) and Reddit are opening right now!")

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

        # Show on-screen popup
        user_confirmed = show_sync_popup()

        if not user_confirmed:
            print("⚠️ Sync was cancelled by user.")
            ctx.close()
            return

        print("\n💾 Step 2: Exporting authenticated session state...")
        ctx.storage_state(path=AUTH_LOCAL_PATH)
        print(f"✅ Saved session snapshot to: {AUTH_LOCAL_PATH}")
        ctx.close()

    # Step 3: Upload files to Oracle Cloud VM
    print("\n☁️ Step 3: Uploading session to Oracle Cloud Server...")
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

    subprocess.run(scp_bot_cmd, check=True)
    subprocess.run(scp_auth_cmd, check=True)
    print("✅ Files uploaded successfully to Oracle Cloud!")

    # Step 4: Restart 24/7 service on server
    print("\n🔄 Step 4: Activating 24/7 autonomous bot service on Oracle VM...")
    restart_cmd = [
        "ssh", "-i", KEY_PATH,
        "-o", "StrictHostKeyChecking=no",
        ORACLE_HOST,
        "sudo systemctl restart social_bot && sudo systemctl status social_bot --no-pager"
    ]
    res = subprocess.run(restart_cmd, capture_output=True, text=True)
    print(res.stdout)

    print("=" * 65)
    print("🎉 SUCCESS! Your Autonomous Social Bot is now LIVE 24/7 on Oracle Cloud!")
    print("Server will automatically post articles to X & Reddit even when PC is off!")
    print("=" * 65)


if __name__ == "__main__":
    main()
