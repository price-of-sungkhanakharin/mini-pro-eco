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
DEFAULT_IMAGE_PATH = BASE_DIR / "frontend" / "public" / "richmenu_parking.jpg"
if not DEFAULT_IMAGE_PATH.exists():
    DEFAULT_IMAGE_PATH = BASE_DIR / "frontend" / "public" / "richmenu_parking.png"

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
    print("▶ 1. Creating Rich Menu definition on LINE Messaging API (Theme: น้องจ๊อดเด็กแว๊น)...")
    
    # Grid 3x2 on 2500 x 1686
    w_col = 2500 // 3  # 833
    h_row = 1686 // 2  # 843
    
    rich_menu_data = {
        "size": {"width": 2500, "height": 1686},
        "selected": True,
        "name": "ชัดเจนในเลนเรา with น้องจ๊อด",
        "chatBarText": "เมนูที่จอดรถ",
        "areas": [
            # Row 1, Col 1: Summary All (ถัง NOS - สรุปภาพรวม)
            {
                "bounds": {"x": 0, "y": 0, "width": w_col, "height": h_row},
                "action": {"type": "message", "text": "📊 สรุปภาพรวม"}
            },
            # Row 1, Col 2: Motorcycle (มอไซค์เวฟแว๊น - หาที่จอดมอไซค์)
            {
                "bounds": {"x": w_col, "y": 0, "width": w_col, "height": h_row},
                "action": {"type": "message", "text": "🛵 หาที่จอดมอไซค์"}
            },
            # Row 1, Col 3: Car (กระบะซิ่งนีออน - หาที่จอดรถยนต์)
            {
                "bounds": {"x": w_col * 2, "y": 0, "width": 2500 - (w_col * 2), "height": h_row},
                "action": {"type": "message", "text": "🚗 หาที่จอดรถยนต์"}
            },
            # Row 2, Col 1: ลานหน้าภาค 2 (น้องจ๊อดถือแผนที่)
            {
                "bounds": {"x": 0, "y": h_row, "width": w_col, "height": h_row},
                "action": {"type": "message", "text": "🏢 ลานหน้าภาค 2"}
            },
            # Row 2, Col 2: ลานในร่มหน้าภาค
            {
                "bounds": {"x": w_col, "y": h_row, "width": w_col, "height": h_row},
                "action": {"type": "message", "text": "🅿️ ลานในร่มหน้าภาค"}
            },
            # Row 2, Col 3: ลานข้างภาคคอม (ลานเครื่องเสียง & รถซิ่ง)
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
