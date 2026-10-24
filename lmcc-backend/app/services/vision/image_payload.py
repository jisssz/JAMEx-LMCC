import base64
import binascii
import re


MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
_DATA_URL = re.compile(r"^data:(image/(?:jpeg|png|webp));base64,(.*)$", re.IGNORECASE | re.DOTALL)
_SIGNATURES = {
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}


def decode_image_payload(value: str) -> tuple[bytes, str]:
    """Decode and verify a supported image data URL or raw base64 image payload."""
    if not value or len(value) > MAX_IMAGE_SIZE_BYTES + 256:
        raise ValueError("Image payload exceeds the 8 MB limit or is empty.")

    match = _DATA_URL.match(value)
    declared_mime = match.group(1).lower() if match else None
    encoded = match.group(2) if match else value
    try:
        image = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Invalid base64 image payload.") from exc

    if not image:
        raise ValueError("Image payload is empty.")
    if len(image) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError("Image payload exceeds the 8 MB limit.")

    mime_type = declared_mime or next((mime for mime, check in _SIGNATURES.items() if check(image)), None)
    if mime_type not in _SIGNATURES or not _SIGNATURES[mime_type](image):
        raise ValueError("Image content must be a valid JPEG, PNG, or WebP file matching its MIME type.")
    return image, mime_type
