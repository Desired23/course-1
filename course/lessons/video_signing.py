from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urlparse

from cloudinary.utils import cloudinary_url
from django.conf import settings


_VERSION_RE = re.compile(r"^v(\d+)$")


@dataclass
class CloudinaryAssetRef:
    resource_type: str
    delivery_type: str
    public_id: str
    version: int | None
    file_format: str | None


def _extract_cloudinary_asset(url: str) -> CloudinaryAssetRef | None:
    if not url:
        return None

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return None
    if "res.cloudinary.com" not in parsed.netloc:
        return None

    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) < 4:
        return None


    resource_type = parts[1]
    delivery_type = parts[2]
    tail = parts[3:]

    version: int | None = None
    version_idx = -1
    for idx, item in enumerate(tail):
        m = _VERSION_RE.match(item)
        if m:
            version_idx = idx
            version = int(m.group(1))
            break

    public_parts = tail[version_idx + 1:] if version_idx >= 0 else tail
    if not public_parts:
        return None

    last = public_parts[-1]
    if "." in last:
        stem, ext = last.rsplit(".", 1)
        public_parts[-1] = stem
        file_format = ext
    else:
        file_format = None

    public_id = "/".join(public_parts).strip("/")
    if not public_id:
        return None

    return CloudinaryAssetRef(
        resource_type=resource_type,
        delivery_type=delivery_type,
        public_id=public_id,
        version=version,
        file_format=file_format,
    )


def build_signed_video_url(
    raw_video_url: str | None,
    explicit_public_id: str | None = None,
    ttl_seconds: int | None = None,
) -> tuple[str | None, str | None]:
    """
    Return (signed_url, expires_at_iso_utc).
    Falls back to original URL if signing is not possible.
    """
    if not raw_video_url and not explicit_public_id:
        return None, None

    if explicit_public_id:
        asset = CloudinaryAssetRef(
            resource_type="video",
            delivery_type="authenticated",
            public_id=explicit_public_id,
            version=None,
            file_format=None,
        )
    else:
        asset = _extract_cloudinary_asset(raw_video_url or "")
        if not asset:
            return raw_video_url, None

    ttl = int(ttl_seconds or getattr(settings, "VIDEO_SIGNED_URL_TTL_SECONDS", 1800))
    expires_epoch = int(time.time()) + max(60, ttl)
    expires_iso = datetime.fromtimestamp(expires_epoch, tz=timezone.utc).isoformat()

    base_kwargs = {
        "resource_type": asset.resource_type,
        "type": asset.delivery_type,
        "version": asset.version,
        "format": asset.file_format,
        "secure": True,
    }

    try:
        signed_url, _ = cloudinary_url(
            asset.public_id,
            sign_url=True,
            auth_token={"expiration": expires_epoch},
            **base_kwargs,
        )
        return signed_url, expires_iso
    except Exception:
        try:
            signed_url, _ = cloudinary_url(
                asset.public_id,
                sign_url=True,
                **base_kwargs,
            )
            return signed_url, None
        except Exception:
            return raw_video_url, None
