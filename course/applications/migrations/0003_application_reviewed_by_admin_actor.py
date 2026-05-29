from django.db import migrations, models
import django.db.models.deletion


def forwards(apps, schema_editor):
    Admin = apps.get_model("admins", "Admin")
    Application = apps.get_model("applications", "Application")

    admin_by_user_id = dict(
        Admin.objects.exclude(user_id__isnull=True).values_list("user_id", "id")
    )
    for application in Application.objects.exclude(reviewed_by_id__isnull=True).iterator():
        application.reviewed_by_admin_id = admin_by_user_id.get(application.reviewed_by_id)
        application.save(update_fields=["reviewed_by_admin"])


def backwards(apps, schema_editor):
    Admin = apps.get_model("admins", "Admin")
    Application = apps.get_model("applications", "Application")

    user_by_admin_id = dict(
        Admin.objects.exclude(user_id__isnull=True).values_list("id", "user_id")
    )
    for application in Application.objects.exclude(reviewed_by_admin_id__isnull=True).iterator():
        application.reviewed_by_id = user_by_admin_id.get(application.reviewed_by_admin_id)
        application.save(update_fields=["reviewed_by"])


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0007_rename_admin_id_admin_id_rename_user_id_admin_user"),
        ("applications", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="application",
            name="reviewed_by_admin",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reviewed_applications",
                to="admins.admin",
            ),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(
            model_name="application",
            name="reviewed_by",
        ),
        migrations.RenameField(
            model_name="application",
            old_name="reviewed_by_admin",
            new_name="reviewed_by",
        ),
    ]
