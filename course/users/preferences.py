from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any, Dict

from django.utils import timezone

from .models import UserSettings


DEFAULT_ACCOUNT_PREFERENCES: Dict[str, str] = {
    "language": "en",
    "timezone": "UTC+7",
    "currency": "VND",
}

DEFAULT_NOTIFICATION_PREFERENCES: Dict[str, bool] = {
    "emailNotifications": True,
    "courseUpdates": True,
    "promotions": False,
    "announcements": True,
    "weeklyDigest": True,
    "instructorMessages": True,
    "courseRecommendations": False,
    "newFeatures": True,
}

DEFAULT_PRIVACY_PREFERENCES: Dict[str, bool] = {
    "profilePublic": True,
    "showProgress": True,
    "showCertificates": True,
    "showCourses": True,
    "allowMessages": True,
    "showOnlineStatus": True,
}

KNOWN_TIMEZONES = {"UTC+7", "UTC", "UTC-5", "UTC-8", "UTC+1", "UTC+9"}
KNOWN_LANGUAGES = {"en", "vi", "es", "fr", "de", "ja"}
KNOWN_CURRENCIES = {"VND", "USD", "EUR", "GBP", "JPY"}


@dataclass(frozen=True)
class UserPreferences:
    account: Dict[str, str]
    notifications: Dict[str, bool]
    privacy: Dict[str, bool]


def _merge_bool_preferences(defaults: Dict[str, bool], raw: Dict[str, Any]) -> Dict[str, bool]:
    merged = dict(defaults)
    for key in defaults.keys():
        if key in raw:
            merged[key] = bool(raw.get(key))
    return merged


def _merge_str_preferences(defaults: Dict[str, str], raw: Dict[str, Any]) -> Dict[str, str]:
    merged = dict(defaults)
    for key in defaults.keys():
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            merged[key] = value.strip()
    return merged


def load_user_preferences(user_id: int) -> UserPreferences:
    settings_obj, _ = UserSettings.objects.get_or_create(user_id=user_id)
    account = _merge_str_preferences(DEFAULT_ACCOUNT_PREFERENCES, settings_obj.account_preferences or {})
    notifications = _merge_bool_preferences(DEFAULT_NOTIFICATION_PREFERENCES, settings_obj.notification_preferences or {})
    privacy = _merge_bool_preferences(DEFAULT_PRIVACY_PREFERENCES, settings_obj.privacy_preferences or {})
    return UserPreferences(account=account, notifications=notifications, privacy=privacy)


def is_direct_message_allowed(receiver_id: int) -> bool:
    prefs = load_user_preferences(receiver_id)
    return bool(prefs.privacy.get("allowMessages", True))


def _notification_pref_key(notification_type: str, notification_code: str | None = None) -> str:
    n_type = (notification_type or "").lower()
    code = (notification_code or "").lower()
    if n_type == "promotion":
        return "promotions"
    if code.startswith("weekly_digest"):
        return "weeklyDigest"
    if code.startswith("chat_"):
        return "instructorMessages"
    if code.startswith("course_recommendation"):
        return "courseRecommendations"
    if code.startswith("new_feature"):
        return "newFeatures"
    if code.startswith("announcement"):
        return "announcements"
    if n_type == "course":
        return "courseUpdates"
    return "announcements"


def is_notification_allowed(receiver_id: int, notification_type: str, notification_code: str | None = None) -> bool:
    prefs = load_user_preferences(receiver_id)
    key = _notification_pref_key(notification_type, notification_code)
    return bool(prefs.notifications.get(key, True))


def apply_privacy_to_user_payload(payload: Dict[str, Any], owner_id: int, viewer_id: int | None, is_admin: bool) -> Dict[str, Any]:
    if is_admin or (viewer_id is not None and owner_id == viewer_id):
        return payload
    prefs = load_user_preferences(owner_id).privacy
    if not prefs.get("profilePublic", True):
        return {
            "id": payload.get("id"),
            "error": "This profile is private.",
            "is_private": True,
        }
    safe_payload = dict(payload)
    if not prefs.get("showOnlineStatus", True):
        safe_payload["last_login"] = None
    return safe_payload


def format_datetime_for_user(user_id: int, value: datetime) -> str:
    prefs = load_user_preferences(user_id).account
    tz_name = prefs.get("timezone", "UTC+7")
    if not value.tzinfo:
        value = timezone.make_aware(value, timezone.get_current_timezone())
    if tz_name == "UTC":
        dt_local = value.astimezone(dt_timezone.utc)
        return f"{dt_local.strftime('%d/%m/%Y %H:%M')} (UTC)"
    if tz_name.startswith("UTC+") or tz_name.startswith("UTC-"):
        sign = 1 if "+" in tz_name else -1
        offset_str = tz_name.replace("UTC+", "").replace("UTC-", "")
        try:
            offset_hours = int(offset_str)
            tz_obj = dt_timezone(sign * timedelta(hours=offset_hours))
            dt_local = value.astimezone(tz_obj)
            return f"{dt_local.strftime('%d/%m/%Y %H:%M')} ({tz_name})"
        except ValueError:
            pass
    return f"{timezone.localtime(value).strftime('%d/%m/%Y %H:%M')} ({tz_name})"
