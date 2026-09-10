from fastapi import HTTPException
from typing import Optional

MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB max file size limit

# Magic byte signatures for image validation
MAGIC_SIGNATURES = {
    b"\xFF\xD8\xFF": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp"
}

def validate_image_upload(file_bytes: Optional[bytes], filename: Optional[str] = None):
    """
    Validates uploaded file size and magic byte signatures before passing to Cloudinary or AI models.
    Enforces 8MB max size and allows only jpeg, png, webp.
    """
    if not file_bytes:
        return

    # 1. Size Validation
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE // (1024 * 1024)}MB."
        )

    # 2. Magic Byte Signature Validation
    is_valid_type = False
    for signature in MAGIC_SIGNATURES:
        if file_bytes.startswith(signature):
            is_valid_type = True
            break
        # Special check for WebP (RIFF....WEBP)
        if signature == b"RIFF" and file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP":
            is_valid_type = True
            break

    if not is_valid_type:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Only JPEG, PNG, and WebP images are allowed."
        )
