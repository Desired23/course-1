from unittest.mock import Mock, patch
import json

from django.test import TestCase
from rest_framework.test import APIClient

from config import reseed_engine
from config.curated_seed import SeedError, run_curated_seed
from systems_settings.models import SystemsSetting


class ReseedEngineTests(TestCase):
    def setUp(self):
        reseed_engine._run_in_progress = False
        reseed_engine._set_run_state(
            run_id=None,
            status="idle",
            phase="idle",
            message="No reseed run has started yet.",
            started_at=None,
            finished_at=None,
            profile=None,
            random_seed=None,
            dry_run=False,
            strict_mode=False,
            reset_report=None,
            seed_report=None,
            validation_report=None,
            error=None,
        )

    def test_start_reseed_run_accepts_demo_large_profile(self):
        with patch("config.reseed_engine.threading.Thread") as thread_cls:
            thread_instance = Mock()
            thread_cls.return_value = thread_instance

            started, status = reseed_engine.start_reseed_run(
                profile="demo-large",
                random_seed=20260413,
                dry_run=True,
                strict_mode=True,
            )

        self.assertTrue(started)
        self.assertEqual(status["profile"], "demo-large")
        self.assertTrue(status["strict_mode"])
        thread_instance.start.assert_called_once()

    def test_start_reseed_run_rejects_unknown_profile(self):
        with self.assertRaises(ValueError):
            reseed_engine.start_reseed_run(profile="demo-unknown", random_seed=1)

    def test_curated_seed_rejects_unknown_profile(self):
        with self.assertRaises(SeedError):
            run_curated_seed(profile="demo-unknown", random_seed=20260413)

    def test_curated_seed_restores_default_homepage_settings(self):
        run_curated_seed(profile="demo-small", random_seed=20260413)

        layout_setting = SystemsSetting.objects.filter(setting_key="homepage_layout").first()
        config_setting = SystemsSetting.objects.filter(setting_key="homepage_config").first()

        self.assertIsNotNone(layout_setting)
        self.assertIsNotNone(config_setting)

        layout_value = json.loads(layout_setting.setting_value)
        self.assertIsInstance(layout_value, list)
        self.assertGreater(len(layout_value), 0)
        self.assertEqual(layout_value[0].get("component"), "HeroSection")


class ReseedApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("config.seed_view.start_reseed_run")
    def test_reseed_endpoint_passes_strict_mode(self, start_mock):
        start_mock.return_value = (True, {"status": "running", "profile": "demo-small"})

        response = self.client.post(
            "/api/reseed-demo/",
            {
                "key": "demo-seed-2026",
                "profile": "demo-small",
                "random_seed": 20260413,
                "strict_mode": True,
                "dry_run": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 202, response.content)
        start_mock.assert_called_once_with(
            profile="demo-small",
            random_seed=20260413,
            dry_run=True,
            strict_mode=True,
            preserve_home_settings=True,
        )

    @patch("config.seed_view.get_default_strict_mode")
    @patch("config.seed_view.start_reseed_run")
    def test_reseed_endpoint_uses_default_strict_mode_when_omitted(self, start_mock, strict_default_mock):
        strict_default_mock.return_value = True
        start_mock.return_value = (True, {"status": "running", "profile": "demo-small"})

        response = self.client.post(
            "/api/reseed-demo/",
            {
                "key": "demo-seed-2026",
                "profile": "demo-small",
                "random_seed": 20260413,
                "dry_run": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 202, response.content)
        start_mock.assert_called_once_with(
            profile="demo-small",
            random_seed=20260413,
            dry_run=False,
            strict_mode=True,
            preserve_home_settings=True,
        )

    @patch("config.seed_view.get_default_strict_mode")
    @patch("config.seed_view.start_reseed_run")
    def test_reseed_endpoint_accepts_get_with_query_key_only(self, start_mock, strict_default_mock):
        strict_default_mock.return_value = False
        start_mock.return_value = (True, {"status": "running", "profile": "demo-medium"})

        response = self.client.get("/api/reseed-demo/?key=demo-seed-2026")

        self.assertEqual(response.status_code, 202, response.content)
        self.assertEqual(start_mock.call_count, 1)
        call_kwargs = start_mock.call_args.kwargs
        self.assertEqual(call_kwargs["profile"], "demo-medium")
        self.assertIsInstance(call_kwargs["random_seed"], int)
        self.assertEqual(call_kwargs["dry_run"], False)
        self.assertEqual(call_kwargs["strict_mode"], False)
        self.assertEqual(call_kwargs["preserve_home_settings"], True)
