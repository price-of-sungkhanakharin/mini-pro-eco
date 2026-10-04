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

TOKEN = os.getenv(
    "LINE_CHANNEL_ACCESS_TOKEN",
    "J1r95NYuLNBu1Nts36NE8Sozb/EK3OfyTvBwHgJ01U8dSn/Mq5K/FBSyvYkOLtcQVfJsYNAVXixWJO8Y3hkXo0yvY55Bu3xr/hV8y/2C2UAX7t/yNU8yGYZzjtn/bb27eVUfQraqoMxkK7nduiF+iAdB04t89/1O/w1cDnyilFU="
)

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_IMAGE_PATH = BASE_DIR / "frontend" / "public" / "richmenu_5buttons_neon.jpg"
if not DEFAULT_IMAGE_PATH.exists():
    DEFAULT_IMAGE_PATH = BASE_DIR / "frontend" / "public" / "richmenu_parking.jpg"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def list_and_cleanup_old_menus():
    """Delete previous rich menus to keep account clean."""
    try:
        req = urllib.request.Request(
            "https://api.line.me/v2/bot/richmenu/list",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for rm in data.get("richmenus", []):
                old_id = rm.get("richMenuId")
                del_req = urllib.request.Request(
                    f"https://api.line.me/v2/bot/richmenu/{old_id}",
                    headers={"Authorization": f"Bearer {TOKEN}"},
                    method="DELETE"
                )
                try:
                    with urllib.request.urlopen(del_req, context=ctx, timeout=10):
                        print(f"🗑️ Deleted previous Rich Menu: {old_id} ({rm.get('name')})")
                except Exception as de:
                    print(f"⚠️ Warning deleting {old_id}: {de}")
    except Exception as e:
        print(f"⚠️ Could not list old menus: {e}")

def create_rich_menu():
    print("▶ 1. Creating Rich Menu definition on LINE Messaging API (5-Button Cyber Dek-Wann)...")
    
    # 5-Panel Layout on 2500 x 1686
    split_x = 1470
    split_y_left = 1260
    split_y_r1 = 560
    split_y_r2 = 1120
    
    rich_menu_data = {
        "size": {"width": 2500, "height": 1686},
        "selected": True,
        "name": "ชัดเจนในเลนเรา with น้องจ๊อด (5 ปุ่ม)",
        "chatBarText": "เมนูที่จอดรถ",
        "areas": [
            # 1. Main Hero Panel (ชัดเจนในเลนเรา - สรุปภาพรวม)
            {
                "bounds": {"x": 0, "y": 0, "width": split_x, "height": split_y_left},
                "action": {"type": "message", "text": "📊 สรุปภาพรวม"}
            },
            # 2. Top Right (หาที่จอดรถยนต์ - กระบะซิ่ง)
            {
                "bounds": {"x": split_x, "y": 0, "width": 2500 - split_x, "height": split_y_r1},
                "action": {"type": "message", "text": "🚗 หาที่จอดรถยนต์"}
            },
            # 3. Middle Right (หาที่จอดมอไซค์ - แว๊นซิ่ง)
            {
                "bounds": {"x": split_x, "y": split_y_r1, "width": 2500 - split_x, "height": split_y_r2 - split_y_r1},
                "action": {"type": "message", "text": "🛵 หาที่จอดมอไซค์"}
            },
            # 4. Bottom Left (ลานหน้าภาค - ไม้กั้นและป้าย P)
            {
                "bounds": {"x": 0, "y": split_y_left, "width": split_x, "height": 1686 - split_y_left},
                "action": {"type": "message", "text": "🏢 ลานหน้าภาค"}
            },
            # 5. Bottom Right (ลานข้างภาคคอม - ลานเครื่องเสียง)
            {
                "bounds": {"x": split_x, "y": split_y_r2, "width": 2500 - split_x, "height": 1686 - split_y_r2},
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
    img_path = Path(image_path)
    print(f"▶ 2. Uploading background image from {img_path} ({img_path.stat().st_size / 1024:.1f} KB)...")
    with open(img_path, "rb") as f:
        img_bytes = f.read()
    
    content_type = "image/jpeg" if img_path.suffix.lower() in [".jpg", ".jpeg"] else "image/png"
    
    req = urllib.request.Request(
        f"https://api-data.line.me/v2/bot/richmenu/{rich_menu_id}/content",
        data=img_bytes,
        headers={
            "Content-Type": content_type,
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
    target_img = sys.argv[1] if len(sys.argv) > 1 else str(DEFAULT_IMAGE_PATH)
    if not os.path.exists(target_img):
        print("Error: Image path not found:", target_img)
        sys.exit(1)
    
    list_and_cleanup_old_menus()
    rm_id = create_rich_menu()
    upload_rich_menu_image(rm_id, target_img)
    set_default_rich_menu(rm_id)
    print("\n🎉 LINE Rich Menu [ชัดเจนในเลนเรา with น้องจ๊อด] is now LIVE and active on the LINE Official Account!")
