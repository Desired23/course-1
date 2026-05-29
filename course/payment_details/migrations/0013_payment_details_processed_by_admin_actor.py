from django.db import migrations, models
import django.db.models.deletion


def forwards(apps, schema_editor):
    Admin = apps.get_model("admins", "Admin")
    PaymentDetails = apps.get_model("payment_details", "Payment_Details")

    admin_by_user_id = dict(
        Admin.objects.exclude(user_id__isnull=True).values_list("user_id", "id")
    )
    for detail in PaymentDetails.objects.exclude(processed_by_id__isnull=True).iterator():
        detail.processed_by_admin_id = admin_by_user_id.get(detail.processed_by_id)
        detail.save(update_fields=["processed_by_admin"])


def backwards(apps, schema_editor):
    Admin = apps.get_model("admins", "Admin")
    PaymentDetails = apps.get_model("payment_details", "Payment_Details")

    user_by_admin_id = dict(
        Admin.objects.exclude(user_id__isnull=True).values_list("id", "user_id")
    )
    for detail in PaymentDetails.objects.exclude(processed_by_admin_id__isnull=True).iterator():
        detail.processed_by_id = user_by_admin_id.get(detail.processed_by_admin_id)
        detail.save(update_fields=["processed_by"])


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0007_rename_admin_id_admin_id_rename_user_id_admin_user"),
        ("payment_details", "0012_payment_details_processed_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment_details",
            name="processed_by_admin",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="processed_payment_details",
                to="admins.admin",
            ),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(
            model_name="payment_details",
            name="processed_by",
        ),
        migrations.RenameField(
            model_name="payment_details",
            old_name="processed_by_admin",
            new_name="processed_by",
        ),
    ]
