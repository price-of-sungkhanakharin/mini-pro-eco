"""
Mock Camera Service for Dr. Sum Parking Analytics System
Generates simulated parking camera snapshots and uploads to Ingestion Server
"""

import argparse
import io
import logging
import random
import time
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mock_camera")

def generate_mock_image(location: str, frame_num: int) -> bytes:
    # Resolution standard SVGA 800x600 (similar to ESP32-CAM)
    width, height = 800, 600
    # Background color: subtle parking asphalt shade with variation
    base_gray = random.randint(45, 55)
    img = Image.new("RGB", (width, height), color=(base_gray, base_gray + 5, base_gray + 2))
    draw = ImageDraw.Draw(img)

    # Draw simulated parking bays
    # Side dept is for motorcycles (~20 bays)
    num_slots = 10
    slot_width = width // num_slots
    for i in range(num_slots):
        x = i * slot_width
        # Parking lane lines
        draw.line([(x, 150), (x, 500)], fill=(220, 220, 180), width=3)
        # Random simulated parked motorcycles (boxes)
        if random.random() > 0.35:
            box_x = x + 10
            box_y = random.randint(200, 350)
            color = (random.randint(50, 200), random.randint(50, 200), random.randint(150, 255))
            draw.rectangle([box_x, box_y, box_x + slot_width - 20, box_y + 120], fill=color, outline=(255, 255, 255))

    # Draw top information banner
    draw.rectangle([0, 0, width, 60], fill=(20, 20, 20))
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    banner_text = f"MOCK CAMERA: {location.upper()} (Motorcycle Zone) | {now_str} | Frame #{frame_num}"
    draw.text((20, 20), banner_text, fill=(0, 255, 128))

    # Bottom status bar
    draw.rectangle([0, height - 40, width, height], fill=(15, 15, 15))
    draw.text((20, height - 30), f"Status: ACTIVE SIMULATION | Ingestion Port: 5005 | Target: side_dept", fill=(200, 200, 200))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()

def run_mock(server_url: str, location: str, interval: float):
    logger.info("Starting Mock Camera Service:")
    logger.info("  Target Location: %s", location)
    logger.info("  Target Server URL: %s", server_url)
    logger.info("  Interval: %.1f seconds", interval)

    upload_endpoint = f"{server_url.rstrip('/')}?location={location}"
    frame_count = 0

    while True:
        frame_count += 1
        try:
            image_bytes = generate_mock_image(location, frame_count)
            files = {'image': (f'mock_{location}_{frame_count}.jpg', image_bytes, 'image/jpeg')}
            resp = requests.post(upload_endpoint, files=files, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                logger.info(">>> [%s] Mock frame #%d uploaded (%d bytes) -> %s (Total: %d)",
                            location, frame_count, len(image_bytes), data.get('filename'), data.get('total', 0))
            else:
                logger.warning("Server responded with HTTP %d: %s", resp.status_code, resp.text)
        except Exception as e:
            logger.error("Error sending mock frame: %s", e)

        time.sleep(interval)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mock Camera Generator for Parking Analytics")
    parser.add_argument("--server-url", default="http://localhost:5005/api/upload", help="Ingestion server upload URL")
    parser.add_argument("--location", default="side_dept", choices=["front_dept", "side_dept"], help="Target location")
    parser.add_argument("--interval", type=float, default=5.0, help="Upload interval in seconds")

    args = parser.parse_args()
    run_mock(args.server_url, args.location, args.interval)
