import re
from typing import Optional

from rest_framework import serializers


# Keep limits explicit and reusable across serializers.
MAX_COMMENT_LENGTH = 2000
MAX_TOPIC_CONTENT_LENGTH = 10000
MAX_CODE_ANSWER_LENGTH = 50000
MAX_ACTUAL_OUTPUT_LENGTH = 50000

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_DANGEROUS_PAYLOAD_RE = re.compile(
    r"(?i)(<\s*script\b|on\w+\s*=|javascript:|data\s*:\s*text/html|<\s*iframe\b|<\s*object\b|<\s*embed\b)"
)
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")


def validate_plain_user_text(
    value: Optional[str],
    *,
    field_label: str = "Nội dung",
    max_length: int = MAX_COMMENT_LENGTH,
) -> str:
    """
    Validate user-generated text to reduce XSS/payload abuse risks.
    We intentionally reject HTML and suspicious JS-like payload fragments.
    """
    if value is None:
        raise serializers.ValidationError(f"{field_label} là bắt buộc.")
    if not isinstance(value, str):
        raise serializers.ValidationError(f"{field_label} phải là chuỗi ký tự.")

    cleaned = value.strip()
    if not cleaned:
        raise serializers.ValidationError(f"{field_label} không được để trống.")

    if len(cleaned) > max_length:
        raise serializers.ValidationError(
            f"{field_label} vượt quá {max_length} ký tự."
        )

    if _CONTROL_CHARS_RE.search(cleaned):
        raise serializers.ValidationError(
            f"{field_label} chứa ký tự điều khiển không hợp lệ."
        )

    if _HTML_TAG_RE.search(cleaned):
        raise serializers.ValidationError(
            f"{field_label} không được chứa thẻ HTML."
        )

    if _DANGEROUS_PAYLOAD_RE.search(cleaned):
        raise serializers.ValidationError(
            f"{field_label} chứa mẫu dữ liệu không an toàn."
        )

    return cleaned

