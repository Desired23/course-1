def is_active_admin(user):
    admin = getattr(user, 'admin', None)
    return bool(admin and not admin.is_deleted)


def is_active_instructor(user):
    instructor = getattr(user, 'instructor', None)
    return bool(instructor and not instructor.is_deleted)


def get_roles(user):
    roles = ['student']
    if is_active_admin(user):
        roles.append('admin')
    if is_active_instructor(user):
        roles.append('instructor')
    return roles
