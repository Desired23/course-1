def get_payload_token_version(payload):
    try:
        return int(payload.get("token_version", 0) or 0)
    except (TypeError, ValueError):
        return None


def is_token_version_current(user, payload):
    return get_payload_token_version(payload) == getattr(user, "auth_token_version", 0)
