from django.db import migrations, models
import django.db.models.deletion


def forwards(apps, schema_editor):
    Admin = apps.get_model("admins", "Admin")
    RegistrationForm = apps.get_model("registration_forms", "RegistrationForm")

    admin_by_user_id = dict(
        Admin.objects.exclude(user_id__isnull=True).values_list("user_id", "id")
    )
    for form in RegistrationForm.objects.exclude(created_by_id__isnull=True).iterator():
        form.created_by_admin_id = admin_by_user_id.get(form.created_by_id)
        form.save(update_fields=["created_by_admin"])


def backwards(apps, schema_editor):
    Admin = apps.get_model("admins", "Admin")
    RegistrationForm = apps.get_model("registration_forms", "RegistrationForm")

    user_by_admin_id = dict(
        Admin.objects.exclude(user_id__isnull=True).values_list("id", "user_id")
    )
    for form in RegistrationForm.objects.exclude(created_by_admin_id__isnull=True).iterator():
        form.created_by_id = user_by_admin_id.get(form.created_by_admin_id)
        form.save(update_fields=["created_by"])


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0007_rename_admin_id_admin_id_rename_user_id_admin_user"),
        ("registration_forms", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="registrationform",
            name="created_by_admin",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_registration_forms",
                to="admins.admin",
            ),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(
            model_name="registrationform",
            name="created_by",
        ),
        migrations.RenameField(
            model_name="registrationform",
            old_name="created_by_admin",
            new_name="created_by",
        ),
    ]
