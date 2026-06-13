import json
from decimal import Decimal, InvalidOperation

import django.db.models.deletion
import systems_settings.models
from django.db import migrations, models


CORE_SETTING_KEYS = [
    "site_name",
    "site_description",
    "site_logo",
    "favicon",
    "primary_color",
    "secondary_color",
    "contact_email",
    "contact_phone",
    "contact_address",
    "social_links",
    "banners",
    "min_payout",
    "auto_approve",
    "auto_approve_instructor_application",
    "auto_approve_payout",
    "auto_approve_refund",
    "homepage_layout",
    "homepage_config",
    "homepage_schema_v2",
    "homepage_schema_v2_initial_backup",
    "platform_settings",
    "website_management",
    "learning_path_gemini_model",
    "payment_policies",
    "instructor_rates",
    "discount_rules",
    "refund_settings",
    "payment_methods_config",
    "payment_settings_config",
    "payment_gateways",
    "subscription_revenue_pool",
]


def _truthy(value):
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _decimal_or_default(value, default):
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, TypeError, ValueError):
        return default


def _json_or_default(value, default):
    try:
        parsed = json.loads(value or "")
    except (TypeError, ValueError):
        return default
    return parsed if parsed is not None else default


def copy_core_settings(apps, schema_editor):
    PlatformSetting = apps.get_model("systems_settings", "PlatformSetting")
    PaymentSetting = apps.get_model("systems_settings", "PaymentSetting")
    SystemsSetting = apps.get_model("systems_settings", "SystemsSetting")

    platform, _ = PlatformSetting.objects.get_or_create(singleton_key=1)
    payment, _ = PaymentSetting.objects.get_or_create(singleton_key=1)
    rows = {
        row.setting_key: row.setting_value
        for row in SystemsSetting.objects.filter(
            setting_key__in=CORE_SETTING_KEYS,
            is_deleted=False,
        )
    }

    if rows.get("site_name"):
        platform.site_name = str(rows["site_name"]).strip()
    if rows.get("site_description"):
        platform.site_description = str(rows["site_description"]).strip()
    if rows.get("site_logo"):
        platform.site_logo = str(rows["site_logo"]).strip()
    if rows.get("favicon"):
        platform.favicon = str(rows["favicon"]).strip()
    if rows.get("primary_color"):
        platform.primary_color = str(rows["primary_color"]).strip()
    if rows.get("secondary_color"):
        platform.secondary_color = str(rows["secondary_color"]).strip()
    if rows.get("contact_email"):
        platform.contact_email = str(rows["contact_email"]).strip()
    if rows.get("contact_phone"):
        platform.contact_phone = str(rows["contact_phone"]).strip()
    if rows.get("contact_address"):
        platform.contact_address = str(rows["contact_address"]).strip()
    if "social_links" in rows:
        platform.social_links = _json_or_default(rows["social_links"], platform.social_links)
    if "banners" in rows:
        platform.banners = _json_or_default(rows["banners"], platform.banners)
    if "min_payout" in rows:
        platform.min_payout = _decimal_or_default(rows["min_payout"], Decimal("500000"))
    if "auto_approve" in rows:
        platform.auto_approve_course = _truthy(rows["auto_approve"])
    if "auto_approve_instructor_application" in rows:
        platform.auto_approve_instructor_application = _truthy(rows["auto_approve_instructor_application"])
    if "auto_approve_payout" in rows:
        platform.auto_approve_payout = _truthy(rows["auto_approve_payout"])
    if "auto_approve_refund" in rows:
        platform.auto_approve_refund = _truthy(rows["auto_approve_refund"])
    if "homepage_layout" in rows:
        platform.homepage_layout = _json_or_default(rows["homepage_layout"], platform.homepage_layout)
    if "homepage_config" in rows:
        platform.homepage_config = _json_or_default(rows["homepage_config"], platform.homepage_config)
    if "homepage_schema_v2" in rows:
        platform.homepage_schema_v2 = _json_or_default(rows["homepage_schema_v2"], None)
    if "homepage_schema_v2_initial_backup" in rows:
        platform.homepage_schema_v2_initial_backup = _json_or_default(rows["homepage_schema_v2_initial_backup"], None)
    if "platform_settings" in rows:
        platform.platform_config = _json_or_default(rows["platform_settings"], platform.platform_config)
    if "website_management" in rows:
        platform.website_management = _json_or_default(rows["website_management"], platform.website_management)
    if rows.get("learning_path_gemini_model"):
        platform.learning_path_gemini_model = str(rows["learning_path_gemini_model"]).strip()

    platform.save()

    if "payment_policies" in rows:
        payment.payment_policies = _json_or_default(rows["payment_policies"], payment.payment_policies)
    if "instructor_rates" in rows:
        payment.instructor_rates = _json_or_default(rows["instructor_rates"], payment.instructor_rates)
    if "discount_rules" in rows:
        payment.discount_rules = _json_or_default(rows["discount_rules"], payment.discount_rules)
    if "refund_settings" in rows:
        payment.refund_settings = _json_or_default(rows["refund_settings"], payment.refund_settings)
    if "payment_methods_config" in rows:
        payment.payment_methods_config = _json_or_default(rows["payment_methods_config"], payment.payment_methods_config)
    if "payment_settings_config" in rows:
        payment.payment_settings_config = _json_or_default(rows["payment_settings_config"], payment.payment_settings_config)
    if "payment_gateways" in rows:
        payment.payment_gateways = _json_or_default(rows["payment_gateways"], payment.payment_gateways)
    if "subscription_revenue_pool" in rows:
        payment.subscription_revenue_pool = _json_or_default(rows["subscription_revenue_pool"], payment.subscription_revenue_pool)
    payment.save()

    SystemsSetting.objects.filter(setting_key__in=CORE_SETTING_KEYS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0003_alter_admin_user_id"),
        ("systems_settings", "0004_alter_systemssetting_options"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSetting",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("singleton_key", models.PositiveSmallIntegerField(default=1, editable=False, unique=True)),
                ("site_name", models.CharField(default="EduPlatform", max_length=120)),
                ("site_description", models.TextField(blank=True, default="Learn new skills with expert-led courses")),
                ("site_logo", models.URLField(blank=True, default="", max_length=500)),
                ("favicon", models.URLField(blank=True, default="", max_length=500)),
                ("primary_color", models.CharField(blank=True, default="#A435F0", max_length=32)),
                ("secondary_color", models.CharField(blank=True, default="#5624D0", max_length=32)),
                ("contact_email", models.EmailField(blank=True, default="support@eduplatform.com", max_length=255)),
                ("contact_phone", models.CharField(blank=True, default="", max_length=50)),
                ("contact_address", models.CharField(blank=True, default="", max_length=255)),
                ("social_links", models.JSONField(default=systems_settings.models.default_social_links)),
                ("banners", models.JSONField(default=systems_settings.models.default_banners)),
                ("min_payout", models.DecimalField(decimal_places=2, default=Decimal("500000"), max_digits=14)),
                ("auto_approve_course", models.BooleanField(default=True)),
                ("auto_approve_instructor_application", models.BooleanField(default=True)),
                ("auto_approve_payout", models.BooleanField(default=True)),
                ("auto_approve_refund", models.BooleanField(default=True)),
                ("homepage_layout", models.JSONField(default=systems_settings.models.default_homepage_layout)),
                ("homepage_config", models.JSONField(default=systems_settings.models.default_homepage_config)),
                ("homepage_schema_v2", models.JSONField(blank=True, null=True)),
                ("homepage_schema_v2_initial_backup", models.JSONField(blank=True, null=True)),
                ("platform_config", models.JSONField(default=systems_settings.models.default_platform_config)),
                ("website_management", models.JSONField(default=systems_settings.models.default_website_management_config)),
                ("learning_path_gemini_model", models.CharField(blank=True, default="", max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="platform_settings_updates",
                        to="admins.admin",
                    ),
                ),
            ],
            options={
                "db_table": "PlatformSettings",
            },
        ),
        migrations.CreateModel(
            name="PaymentSetting",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("singleton_key", models.PositiveSmallIntegerField(default=1, editable=False, unique=True)),
                ("payment_policies", models.JSONField(default=list)),
                ("instructor_rates", models.JSONField(default=list)),
                ("discount_rules", models.JSONField(default=list)),
                ("refund_settings", models.JSONField(default=systems_settings.models.default_refund_settings)),
                ("payment_methods_config", models.JSONField(default=systems_settings.models.default_payment_methods_config)),
                ("payment_settings_config", models.JSONField(default=systems_settings.models.default_payment_settings_config)),
                ("payment_gateways", models.JSONField(default=systems_settings.models.default_payment_gateways)),
                ("subscription_revenue_pool", models.JSONField(default=systems_settings.models.default_subscription_revenue_pool)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payment_settings_updates",
                        to="admins.admin",
                    ),
                ),
            ],
            options={
                "db_table": "PaymentSettings",
            },
        ),
        migrations.RunPython(copy_core_settings, migrations.RunPython.noop),
        migrations.DeleteModel(
            name="SystemsSetting",
        ),
    ]
