import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend.app.services.minio_service import MinIOService

def main():
    service = MinIOService()

    # Enable Versioning
    print("Enabling bucket versioning...")
    service.enable_versioning()

    v1_path = os.path.join(os.path.dirname(__file__), "profile_v1.txt")
    v2_path = os.path.join(os.path.dirname(__file__), "profile_v2.txt")

    with open(v1_path, "w") as f:
        f.write("Profile Photo Version 1")
        
    with open(v2_path, "w") as f:
        f.write("Profile Photo Version 2")

    object_name = "my_profile_photo.txt"

    print("Uploading Version 1...")
    res_v1 = service.upload_file(object_name, v1_path)
    print(f"Version 1 uploaded with version ID: {res_v1.version_id}")

    print("Uploading Version 2...")
    res_v2 = service.upload_file(object_name, v2_path)
    print(f"Version 2 uploaded with version ID: {res_v2.version_id}")

    print("Retrieving latest version...")
    service.download_file(object_name, os.path.join(os.path.dirname(__file__), "downloaded_latest.txt"))
    print("Latest version retrieved successfully.")

    print("Retrieving Version 1...")
    service.download_file(object_name, os.path.join(os.path.dirname(__file__), "downloaded_v1.txt"), version_id=res_v1.version_id)
    print("Version 1 retrieved successfully.")

if __name__ == "__main__":
    main()
