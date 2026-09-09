import cloudinary
import cloudinary.uploader
from config import settings
import io

if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

async def upload_image_to_cloudinary(file_bytes: bytes, filename: str) -> str:
    """
    Uploads an image to Cloudinary and returns the public HTTPS URL.
    If Cloudinary is not configured or fails, returns a fallback data URL or placeholder.
    """
    if not settings.CLOUDINARY_CLOUD_NAME or settings.CLOUDINARY_CLOUD_NAME == "demo":
        # Fallback to local storage or dummy data URI if Cloudinary credentials are not set
        import base64
        b64 = base64.b64encode(file_bytes).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"
    
    try:
        response = cloudinary.uploader.upload(
            file_bytes,
            folder="foundit_items",
            resource_type="image"
        )
        return response.get("secure_url")
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        import base64
        b64 = base64.b64encode(file_bytes).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"
