from decimal import Decimal

from django.test import TestCase

from systems_settings.models import PaymentSetting, PlatformSetting
from systems_settings.services import (
    CORE_SETTINGS,
    create_systems_setting,
    get_bool_setting,
    get_decimal_setting,
    list_systems_settings_payload,
    update_systems_setting,
)


class PlatformSettingServiceTests(TestCase):
    def test_core_bool_setting_uses_typed_field_defaults(self):
        self.assertTrue(get_bool_setting("auto_approve_payout", default=False))

    def test_update_core_setting_by_synthetic_id_updates_typed_field(self):
        setting_id = CORE_SETTINGS["auto_approve_payout"]["id"]

        payload = update_systems_setting(setting_id, {"value": "false"})

        platform_setting = PlatformSetting.objects.get(singleton_key=1)
        self.assertFalse(platform_setting.auto_approve_payout)
        self.assertEqual(payload["key"], "auto_approve_payout")
        self.assertEqual(payload["value"], "false")

    def test_create_core_setting_updates_typed_field_instead_of_key_value_row(self):
        payload = create_systems_setting({"key": "min_payout", "value": "750000"})

        self.assertEqual(get_decimal_setting("min_payout"), Decimal("750000.00"))
        self.assertEqual(payload["key"], "min_payout")

    def test_create_payment_config_setting_updates_typed_payment_field(self):
        payload = create_systems_setting({"key": "payment_methods_config", "value": '[{"id":"momo"}]'})

        payment_setting = PaymentSetting.objects.get(singleton_key=1)
        self.assertEqual(payment_setting.payment_methods_config, [{"id": "momo"}])
        self.assertEqual(payload["key"], "payment_methods_config")

    def test_list_payload_contains_typed_rows_only_once(self):
        payload = list_systems_settings_payload()
        auto_approve_rows = [row for row in payload if row["key"] == "auto_approve_payout"]

        self.assertEqual(len(auto_approve_rows), 1)
        self.assertEqual(auto_approve_rows[0]["value"], "true")
