import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend.app.services.minio_service import MinIOService

def main():
    service = MinIOService()

    # Create a sample file to upload
    sample_path = os.path.join(os.path.dirname(__file__), "sample_upload.txt")
    with open(sample_path, "w") as f:
        f.write("Sample profile data for MinIO upload/download test.")

    # Upload
    print("Uploading file...")
    service.upload_file("test_profile_data.txt", sample_path)
    print("Upload successful.")

    # Download
    download_path = os.path.join(os.path.dirname(__file__), "downloaded_sample.txt")
    print("Downloading file...")
    service.download_file("test_profile_data.txt", download_path)
    print("Download successful.")

if __name__ == "__main__":
    main()
