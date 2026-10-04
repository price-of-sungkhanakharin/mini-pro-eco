#!/usr/bin/env python3
"""
Setup and Deploy LINE Official Account Rich Menu
Smart Campus Parking Assistant (CPE Parking Bot)
"""

import os
import sys
import json
import urllib.request
import ssl
from pathlib import Path

TOKEN = "J1r95NYuLNBu1Nts36NE8Sozb/EK3OfyTvBwHgJ01U8dSn/Mq5K/FBSyvYkOLtcQVfJsYNAVXixWJO8Y3hkXo0yvY55Bu3xr/hV8y/2C2UAX7t/yNU8yGYZzjtn/bb27eVUfQraqoMxkK7nduiF+iAdB04t89/1O/w1cDnyilFU="
IMAGE_PATH = "/home/r211admin/project-eco/ai-ecosystem-workspace/frontend/public/richmenu_parking.png"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def create_rich_menu():
    print("▶ 1. Creating Rich Menu definition on LINE Messaging API...")
    
    # Grid 3x2 on 2500 x 1686
    w_col = 2500 // 3  # 833
    h_row = 1686 // 2  # 843
    
    rich_menu_data = {
        "size": {"width": 2500, "height": 1686},
        "selected": True,
        "name": "CPE Parking Quick Menu",
        "chatBarText": "🅿️ แตะเพื่อดูที่จอดรถว่าง",
        "areas": [
            # Row 1, Col 1: Summary All
            {
                "bounds": {"x": 0, "y": 0, "width": w_col, "height": h_row},
                "action": {"type": "message", "text": "📊 สรุปภาพรวม"}
            },
            # Row 1, Col 2: Car Only
            {
                "bounds": {"x": w_col, "y": 0, "width": w_col, "height": h_row},
                "action": {"type": "message", "text": "🚗 หาที่จอดรถยนต์"}
            },
            # Row 1, Col 3: Motorcycle Only
            {
                "bounds": {"x": w_col * 2, "y": 0, "width": 2500 - (w_col * 2), "height": h_row},
                "action": {"type": "message", "text": "🛵 หาที่จอดมอไซค์"}
            },
            # Row 2, Col 1: Cam1 (Zone A)
            {
                "bounds": {"x": 0, "y": h_row, "width": w_col, "height": h_row},
                "action": {"type": "message", "text": "🏢 ลานหน้าภาค 1"}
            },
            # Row 2, Col 2: Cam2 (Zone B)
            {
                "bounds": {"x": w_col, "y": h_row, "width": w_col, "height": h_row},
                "action": {"type": "message", "text": "🅿️ ลานในร่มหน้าภาค 2"}
            },
            # Row 2, Col 3: Cam3 (Zone C)
            {
                "bounds": {"x": w_col * 2, "y": h_row, "width": 2500 - (w_col * 2), "height": h_row},
                "action": {"type": "message", "text": "🖥️ ลานข้างภาคคอม"}
            }
        ]
    }
    
    req = urllib.request.Request(
        "https://api.line.me/v2/bot/richmenu",
        data=json.dumps(rich_menu_data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TOKEN}"
        }
    )
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        rich_menu_id = res.get("richMenuId")
        print(f"✓ Rich Menu Created successfully! ID: {rich_menu_id}")
        return rich_menu_id

def upload_rich_menu_image(rich_menu_id, image_path):
    print(f"▶ 2. Uploading background image from {image_path}...")
    with open(image_path, "rb") as f:
        img_bytes = f.read()
    
    req = urllib.request.Request(
        f"https://api-data.line.me/v2/bot/richmenu/{rich_menu_id}/content",
        data=img_bytes,
        headers={
            "Content-Type": "image/png",
            "Authorization": f"Bearer {TOKEN}"
        }
    )
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        print(f"✓ Image uploaded successfully! HTTP Status: {resp.status}")

def set_default_rich_menu(rich_menu_id):
    print(f"▶ 3. Setting Rich Menu {rich_menu_id} as default for all users...")
    req = urllib.request.Request(
        f"https://api.line.me/v2/bot/user/all/richmenu/{rich_menu_id}",
        data=b"",
        headers={
            "Authorization": f"Bearer {TOKEN}"
        }
    )
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        print(f"✓ Default Rich Menu set successfully! HTTP Status: {resp.status}")

if __name__ == "__main__":
    if not os.path.exists(IMAGE_PATH):
        print("Error: Image path not found:", IMAGE_PATH)
        sys.exit(1)
    
    rm_id = create_rich_menu()
    upload_rich_menu_image(rm_id, IMAGE_PATH)
    set_default_rich_menu(rm_id)
    print("\n🎉 LINE Rich Menu is now LIVE and active on the LINE Official Account!")
