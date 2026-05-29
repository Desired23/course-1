from django.db import migrations, models
import django.db.models.deletion


def forwards(apps, schema_editor):
    Admin = apps.get_model("admins", "Admin")
    SubscriptionPlan = apps.get_model("subscription_plans", "SubscriptionPlan")
    PlanCourse = apps.get_model("subscription_plans", "PlanCourse")

    admin_by_user_id = dict(
        Admin.objects.exclude(user_id__isnull=True).values_list("user_id", "id")
    )

    for plan in SubscriptionPlan.objects.exclude(created_by_id__isnull=True).iterator():
        plan.created_by_admin_id = admin_by_user_id.get(plan.created_by_id)
        plan.save(update_fields=["created_by_admin"])

    for plan_course in PlanCourse.objects.all().iterator():
        if plan_course.added_by_id is not None:
            plan_course.added_by_admin_id = admin_by_user_id.get(plan_course.added_by_id)
        if plan_course.removed_by_id is not None:
            plan_course.removed_by_admin_id = admin_by_user_id.get(plan_course.removed_by_id)
        plan_course.save(update_fields=["added_by_admin", "removed_by_admin"])


def backwards(apps, schema_editor):
    Admin = apps.get_model("admins", "Admin")
    SubscriptionPlan = apps.get_model("subscription_plans", "SubscriptionPlan")
    PlanCourse = apps.get_model("subscription_plans", "PlanCourse")

    user_by_admin_id = dict(
        Admin.objects.exclude(user_id__isnull=True).values_list("id", "user_id")
    )

    for plan in SubscriptionPlan.objects.exclude(created_by_admin_id__isnull=True).iterator():
        plan.created_by_id = user_by_admin_id.get(plan.created_by_admin_id)
        plan.save(update_fields=["created_by"])

    for plan_course in PlanCourse.objects.all().iterator():
        if plan_course.added_by_admin_id is not None:
            plan_course.added_by_id = user_by_admin_id.get(plan_course.added_by_admin_id)
        if plan_course.removed_by_admin_id is not None:
            plan_course.removed_by_id = user_by_admin_id.get(plan_course.removed_by_admin_id)
        plan_course.save(update_fields=["added_by", "removed_by"])


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0007_rename_admin_id_admin_id_rename_user_id_admin_user"),
        ("subscription_plans", "0007_subscriptionplan_yearly_discount_percent"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionplan",
            name="created_by_admin",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_subscription_plans",
                to="admins.admin",
            ),
        ),
        migrations.AddField(
            model_name="plancourse",
            name="added_by_admin",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="added_plan_courses",
                to="admins.admin",
            ),
        ),
        migrations.AddField(
            model_name="plancourse",
            name="removed_by_admin",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="removed_plan_courses",
                to="admins.admin",
            ),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(
            model_name="subscriptionplan",
            name="created_by",
        ),
        migrations.RemoveField(
            model_name="plancourse",
            name="added_by",
        ),
        migrations.RemoveField(
            model_name="plancourse",
            name="removed_by",
        ),
        migrations.RenameField(
            model_name="subscriptionplan",
            old_name="created_by_admin",
            new_name="created_by",
        ),
        migrations.RenameField(
            model_name="plancourse",
            old_name="added_by_admin",
            new_name="added_by",
        ),
        migrations.RenameField(
            model_name="plancourse",
            old_name="removed_by_admin",
            new_name="removed_by",
        ),
    ]
