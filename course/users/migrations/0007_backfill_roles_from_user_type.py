from django.db import migrations


def backfill_role_records(apps, schema_editor):
    """Create missing Admin/Instructor records from the legacy user_type column.

    Runs once, BEFORE user_type is removed. Guarantees no user loses a role if
    their legacy column value drifted from the (now canonical) role records.
    """
    User = apps.get_model('users', 'User')
    Admin = apps.get_model('admins', 'Admin')
    Instructor = apps.get_model('instructors', 'Instructor')

    for user in User.objects.all():
        user_type = getattr(user, 'user_type', None)

        if user_type == 'admin':
            admin = Admin.objects.filter(user=user).first()
            if admin is None:
                Admin.objects.create(user=user, department='', role='none')
            elif admin.is_deleted:
                admin.is_deleted = False
                admin.deleted_at = None
                admin.deleted_by = None
                admin.save()

        elif user_type == 'instructor':
            instructor = Instructor.objects.filter(user=user).first()
            if instructor is None:
                Instructor.objects.create(user=user)
            elif instructor.is_deleted:
                instructor.is_deleted = False
                instructor.deleted_at = None
                instructor.deleted_by = None
                instructor.save()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_usersettings'),
        ('admins', '0008_add_is_super_admin_permissions'),
        ('instructors', '0005_rename_user_id_instructor_user'),
    ]

    operations = [
        migrations.RunPython(backfill_role_records, migrations.RunPython.noop),
    ]
