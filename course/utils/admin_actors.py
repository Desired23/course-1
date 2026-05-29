from rest_framework.exceptions import ValidationError


def resolve_admin_actor(actor, required=True):
    if actor is None:
        if required:
            raise ValidationError({"error": "Admin actor is required."})
        return None

    if actor.__class__.__name__ == "Admin":
        if getattr(actor, "is_deleted", False):
            if required:
                raise ValidationError({"error": "Admin actor is deleted."})
            return None
        return actor

    admin = getattr(actor, "admin", None)
    if admin and not getattr(admin, "is_deleted", False):
        return admin

    if required:
        raise ValidationError({"error": "Authenticated user is not linked to an active admin profile."})
    return None


def actor_user_id(actor):
    admin = resolve_admin_actor(actor, required=False)
    if admin and getattr(admin, "user_id", None):
        return admin.user_id
    return getattr(actor, "id", None)
