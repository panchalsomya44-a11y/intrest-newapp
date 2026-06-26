import os
import uuid
from google.cloud import storage
from ..config import settings


def upload_file_to_gcs(file_bytes: bytes, ext: str = "jpg") -> str:
    """
    Upload file bytes to Google Cloud Storage and return the public URL.
    
    Args:
        file_bytes: The file content in bytes
        ext: File extension (default: jpg)
    
    Returns:
        URL of the uploaded file or None if upload fails
    """
    if not settings.USE_CLOUD_STORAGE or not settings.GCS_BUCKET_NAME:
        return None
    
    try:
        # Initialize GCS client (uses Application Default Credentials)
        client = storage.Client(project=settings.GCP_PROJECT_ID)
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.{ext}"
        blob = bucket.blob(filename)
        
        # Upload file
        blob.upload_from_string(file_bytes, content_type=f"image/{ext}")
        
        # Return public URL (or gs:// URL)
        return filename
    except Exception as e:
        print(f"Error uploading to GCS: {e}")
        return None


def get_gcs_url(filename: str) -> str:
    """
    Get the full public URL for a file in GCS.
    
    Args:
        filename: The filename stored in GCS
    
    Returns:
        Full URL to the file
    """
    if not filename or not settings.USE_CLOUD_STORAGE:
        return None
    
    return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{filename}"
