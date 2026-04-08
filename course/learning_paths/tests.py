import json
import unicodedata
from unittest.mock import Mock, patch

import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from categories.models import Category
from admins.models import Admin
from courses.models import Course
from learning_paths.models import LearningPath
from learning_paths.services import get_advisor_provider, merge_advisor_messages, reset_advisor_runtime_state_for_tests
from systems_settings.models import SystemsSetting
from users.models import User


def build_access_token(user):
    payload = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "user_type": [user.user_type],
        "token_type": "access",
        "exp": 9999999999,
        "iat": 1,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def fold_text(value):
    normalized = unicodedata.normalize("NFKD", value or "")
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower()


class LearningPathApiTests(TestCase):
    def setUp(self):
        reset_advisor_runtime_state_for_tests()
        self.client = APIClient()
        self.user = User.objects.create(
            username="student_lp",
            email="student.lp@example.com",
            password_hash=make_password("Password123"),
            full_name="Student LP",
            user_type="student",
            status="active",
        )
        self.admin = User.objects.create(
            username="admin_lp",
            email="admin.lp@example.com",
            password_hash=make_password("Password123"),
            full_name="Admin LP",
            user_type="admin",
            status="active",
        )
        Admin.objects.create(user=self.admin, department="Operations", role="super_admin")
        token = build_access_token(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        category = Category.objects.create(name="Data", description="Data", status="active")
        self.sql_course = Course.objects.create(
            title="SQL basics for Data Analyst",
            shortdescription="SQL",
            description="Learn SQL for data analyst work",
            category=category,
            level="beginner",
            duration=1200,
            target_audience=["Accountants moving into data analysis"],
            skills_taught=["SQL", "JOIN", "GROUP BY"],
            prerequisites=[],
            status="published",
            is_public=True,
        )
        self.python_course = Course.objects.create(
            title="Python for Data Analysis",
            shortdescription="Python",
            description="Learn Python, pandas, and numpy",
            category=category,
            level="intermediate",
            duration=1800,
            target_audience=["Data Analyst"],
            skills_taught=["Python", "Pandas", "NumPy"],
            prerequisites=["SQL basics"],
            status="published",
            is_public=True,
        )
        self.viz_course = Course.objects.create(
            title="Data Visualization and Dashboard",
            shortdescription="Viz",
            description="Dashboard building and storytelling",
            category=category,
            level="intermediate",
            duration=900,
            target_audience=["Business analyst"],
            skills_taught=["Dashboard", "Storytelling"],
            prerequisites=["SQL basics"],
            status="published",
            is_public=True,
        )

    def _extract_first_sse_error_payload(self, body):
        normalized = (body or "").replace("\\n", "\n").replace("\r\n", "\n")
        in_error_event = False
        for raw_line in normalized.split("\n"):
            line = raw_line.strip()
            if line.startswith("event:"):
                in_error_event = line == "event: error"
                continue
            if in_error_event and line.startswith("data:"):
                try:
                    return json.loads(line[len("data:"):].strip())
                except Exception:
                    return None
        return None

    def test_course_serializer_returns_new_metadata_fields(self):
        response = self.client.get("/api/courses/")
        self.assertEqual(response.status_code, 200, response.content)
        first = response.json()["results"][0]
        self.assertIn("skills_taught", first)
        self.assertIn("prerequisites", first)
        self.assertIn("duration_hours", first)

    def test_merge_advisor_messages_deduplicates_overlapping_history(self):
        existing = [
            {"role": "user", "content": "toi muon hoc data"},
            {"role": "assistant", "content": "ban da biet gi roi"},
        ]
        incoming = [
            {"role": "assistant", "content": "ban da biet gi roi"},
            {"role": "user", "content": "toi biet excel"},
        ]

        merged = merge_advisor_messages(existing, incoming)
        self.assertEqual(
            merged,
            [
                {"role": "user", "content": "toi muon hoc data"},
                {"role": "assistant", "content": "ban da biet gi roi"},
                {"role": "user", "content": "toi biet excel"},
            ],
        )

    def test_merge_advisor_messages_filters_invalid_items(self):
        merged = merge_advisor_messages(
            [{"role": "user", "content": "  hello  "}],
            [
                {"role": "assistant", "content": "  "},
                {"role": "unknown", "content": "x"},
                {"role": "assistant", "content": "hi"},
            ],
        )
        self.assertEqual(
            merged,
            [
                {"role": "user", "content": "hello"},
                {"role": "assistant", "content": "hi"},
            ],
        )

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_advisor_chat_returns_question_then_path(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {"goal_text": "Toi muon chuyen sang Data Analyst"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["type"], "question")

        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "path")
        self.assertGreaterEqual(len(data["path"]), 1)
        self.assertTrue(any(item["course_level"] == "beginner" for item in data["path"]))
        self.assertEqual(data["advisor_meta"]["provider_used"], "rule_based")
        self.assertIn("lộ trình", (data.get("summary") or "").lower())

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_advisor_chat_supports_course_search_intent(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon tim khoa hoc phu hop",
                "messages": [{"role": "user", "content": "Goi y khoa hoc de hoc Data Analyst voi SQL va dashboard"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "question")
        self.assertIn("goi y", fold_text(data["message"]))
        self.assertIn("provider_used", data["advisor_meta"])

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_advisor_chat_greeting_is_not_hardcoded_three_fields_prompt(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "chao",
                "messages": [{"role": "user", "content": "chao"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "question")
        folded = fold_text(data["message"])
        self.assertNotIn("3 thong tin", folded)
        self.assertIn("tim", folded)
        self.assertIn("lo trinh", folded)

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_advisor_chat_greeting_variant_does_not_repeat_path_summary(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [
                    {"role": "assistant", "content": "Ban dang huong toi muc tieu nao?"},
                    {"role": "user", "content": "Toi muon Data Analyst"},
                    {"role": "assistant", "content": "Ban da biet ky nang gi?"},
                    {"role": "user", "content": "chao ban"},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "question")
        self.assertIn("tim", fold_text(data["message"]))

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_advisor_chat_mixed_search_and_roadmap_prefers_course_suggestions_first(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon lo trinh Data Analyst",
                "messages": [{"role": "user", "content": "Goi y 3 khoa hoc cho Data Analyst roi tao lo trinh"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "question")
        self.assertIn("goi y", fold_text(data["message"]))
        self.assertEqual(data["advisor_meta"]["conversation_state"]["mode"], "course_search")

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_advisor_chat_persists_conversation_when_enabled(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "persist_conversation": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        data = response.json()
        self.assertIn("path_id", data)
        self.assertIsInstance(data["path_id"], int)

        path = LearningPath.objects.get(id=data["path_id"], user=self.user)
        self.assertTrue(hasattr(path, "conversation"))
        self.assertGreaterEqual(len(path.conversation.messages or []), 1)
        self.assertEqual(path.conversation.messages[-1]["role"], "assistant")

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_advisor_chat_stream_persists_conversation_when_enabled(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat/stream",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "persist_conversation": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        body = "".join(
            chunk.decode("utf-8") if isinstance(chunk, (bytes, bytearray)) else str(chunk)
            for chunk in response.streaming_content
        )
        final_payload = None
        for block in body.split("\n\n"):
            if "event: final" not in block:
                continue
            data_line = next((line for line in block.splitlines() if line.startswith("data: ")), None)
            if data_line:
                final_payload = json.loads(data_line[len("data: "):])
                break

        self.assertIsNotNone(final_payload)
        result = final_payload.get("result") or {}
        self.assertIn("path_id", result)

        path = LearningPath.objects.get(id=result["path_id"], user=self.user)
        self.assertTrue(hasattr(path, "conversation"))
        self.assertGreaterEqual(len(path.conversation.messages or []), 1)
        self.assertEqual(path.conversation.messages[-1]["role"], "assistant")

    def test_save_and_list_multiple_learning_paths(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()

        for idx in range(2):
            response = self.client.post(
                "/api/learning-paths/",
                {
                    "goal_text": f"Muc tieu {idx}",
                    "summary": chat["summary"],
                    "estimated_weeks": chat["estimated_weeks"],
                    "path": chat["path"],
                    "messages": [{"role": "user", "content": "context"}],
                    "advisor_meta": chat.get("advisor_meta") or {},
                },
                format="json",
            )
            self.assertEqual(response.status_code, 201, response.content)

        response = self.client.get("/api/learning-paths/")
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["count"], 2)
        self.assertEqual(data["results"][0]["items"][0]["order"], 1)

    def test_admin_can_view_learning_path_advisor_stats(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()
        self.client.post(
            "/api/learning-paths/",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "summary": chat["summary"],
                "estimated_weeks": chat["estimated_weeks"],
                "path": chat["path"],
                "messages": [{"role": "user", "content": "context"}],
                "advisor_meta": chat.get("advisor_meta") or {},
            },
            format="json",
        )

        admin_client = APIClient()
        admin_token = build_access_token(self.admin)
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        response = admin_client.get("/api/learning-paths/advisor/stats")

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertGreaterEqual(data["total_paths"], 1)
        self.assertIn("recent_paths", data)

    def test_student_cannot_view_learning_path_advisor_stats(self):
        response = self.client.get("/api/learning-paths/advisor/stats")
        self.assertEqual(response.status_code, 403, response.content)

    def test_admin_stats_support_provider_and_fallback_filters(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()
        chat["advisor_meta"]["fallback_triggered"] = True
        chat["advisor_meta"]["fallback_provider"] = "rule_based"
        self.client.post(
            "/api/learning-paths/",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "summary": chat["summary"],
                "estimated_weeks": chat["estimated_weeks"],
                "path": chat["path"],
                "messages": [{"role": "user", "content": "context"}],
                "advisor_meta": chat["advisor_meta"],
            },
            format="json",
        )

        admin_client = APIClient()
        admin_token = build_access_token(self.admin)
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

        response = admin_client.get("/api/learning-paths/advisor/stats?provider=rule_based&fallback_only=true&limit=5")
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["rule_based_paths"], data["total_paths"])
        self.assertEqual(data["fallback_paths"], data["total_paths"])
        self.assertLessEqual(len(data["recent_paths"]), 5)

    def test_admin_can_view_learning_path_detail_for_any_user(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()
        create_response = self.client.post(
            "/api/learning-paths/",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "summary": chat["summary"],
                "estimated_weeks": chat["estimated_weeks"],
                "path": chat["path"],
                "messages": [{"role": "user", "content": "context"}],
                "advisor_meta": chat.get("advisor_meta") or {},
            },
            format="json",
        )
        path_id = create_response.json()["id"]

        admin_client = APIClient()
        admin_token = build_access_token(self.admin)
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        response = admin_client.get(f"/api/learning-paths/admin/{path_id}")

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["id"], path_id)
        self.assertGreaterEqual(len(data["items"]), 1)
        self.assertIn("advisor_meta", data)
    
    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_admin_can_delete_learning_path_via_action_endpoint(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()

        create_response = self.client.post(
            "/api/learning-paths/",
            {
                "goal_text": "Muc tieu admin action",
                "summary": chat["summary"],
                "estimated_weeks": chat["estimated_weeks"],
                "path": chat["path"],
                "messages": [{"role": "user", "content": "context"}],
                "advisor_meta": chat.get("advisor_meta") or {},
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201, create_response.content)
        path_id = create_response.json()["id"]

        admin_client = APIClient()
        admin_token = build_access_token(self.admin)
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

        action_response = admin_client.post(
            f"/api/learning-paths/admin/{path_id}/action",
            {"action": "delete"},
            format="json",
        )
        self.assertEqual(action_response.status_code, 200, action_response.content)

        detail_response = admin_client.get(f"/api/learning-paths/admin/{path_id}")
        self.assertEqual(detail_response.status_code, 404, detail_response.content)

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_admin_can_bulk_delete_learning_paths(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()

        path_ids = []
        for idx in range(2):
            create_response = self.client.post(
                "/api/learning-paths/",
                {
                    "goal_text": f"Muc tieu bulk {idx}",
                    "summary": chat["summary"],
                    "estimated_weeks": chat["estimated_weeks"],
                    "path": chat["path"],
                    "messages": [{"role": "user", "content": "context"}],
                    "advisor_meta": chat.get("advisor_meta") or {},
                },
                format="json",
            )
            self.assertEqual(create_response.status_code, 201, create_response.content)
            path_ids.append(create_response.json()["id"])

        admin_client = APIClient()
        admin_token = build_access_token(self.admin)
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

        bulk_response = admin_client.post(
            "/api/learning-paths/admin/bulk-action",
            {"action": "delete", "path_ids": path_ids},
            format="json",
        )
        self.assertEqual(bulk_response.status_code, 200, bulk_response.content)
        self.assertEqual(bulk_response.json().get("deleted_count"), 2)

        for path_id in path_ids:
            detail_response = admin_client.get(f"/api/learning-paths/admin/{path_id}")
            self.assertEqual(detail_response.status_code, 404, detail_response.content)

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_admin_can_archive_and_restore_learning_path_via_action_endpoint(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()

        create_response = self.client.post(
            "/api/learning-paths/",
            {
                "goal_text": "Muc tieu action archive",
                "summary": chat["summary"],
                "estimated_weeks": chat["estimated_weeks"],
                "path": chat["path"],
                "messages": [{"role": "user", "content": "context"}],
                "advisor_meta": chat.get("advisor_meta") or {},
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201, create_response.content)
        path_id = create_response.json()["id"]

        admin_client = APIClient()
        admin_token = build_access_token(self.admin)
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

        archive_response = admin_client.post(
            f"/api/learning-paths/admin/{path_id}/action",
            {"action": "archive"},
            format="json",
        )
        self.assertEqual(archive_response.status_code, 200, archive_response.content)
        self.assertTrue(LearningPath.objects.get(id=path_id).is_archived)

        restore_response = admin_client.post(
            f"/api/learning-paths/admin/{path_id}/action",
            {"action": "restore"},
            format="json",
        )
        self.assertEqual(restore_response.status_code, 200, restore_response.content)
        self.assertFalse(LearningPath.objects.get(id=path_id).is_archived)

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_admin_can_bulk_archive_and_restore_learning_paths(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()

        path_ids = []
        for idx in range(2):
            create_response = self.client.post(
                "/api/learning-paths/",
                {
                    "goal_text": f"Muc tieu bulk archive {idx}",
                    "summary": chat["summary"],
                    "estimated_weeks": chat["estimated_weeks"],
                    "path": chat["path"],
                    "messages": [{"role": "user", "content": "context"}],
                    "advisor_meta": chat.get("advisor_meta") or {},
                },
                format="json",
            )
            self.assertEqual(create_response.status_code, 201, create_response.content)
            path_ids.append(create_response.json()["id"])

        admin_client = APIClient()
        admin_token = build_access_token(self.admin)
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

        archive_response = admin_client.post(
            "/api/learning-paths/admin/bulk-action",
            {"action": "archive", "path_ids": path_ids},
            format="json",
        )
        self.assertEqual(archive_response.status_code, 200, archive_response.content)
        self.assertEqual(archive_response.json().get("affected_count"), 2)
        self.assertEqual(LearningPath.objects.filter(id__in=path_ids, is_archived=True).count(), 2)

        restore_response = admin_client.post(
            "/api/learning-paths/admin/bulk-action",
            {"action": "restore", "path_ids": path_ids},
            format="json",
        )
        self.assertEqual(restore_response.status_code, 200, restore_response.content)
        self.assertEqual(restore_response.json().get("affected_count"), 2)
        self.assertEqual(LearningPath.objects.filter(id__in=path_ids, is_archived=False).count(), 2)

    def test_student_cannot_view_admin_learning_path_detail(self):
        response = self.client.get("/api/learning-paths/admin/999")
        self.assertEqual(response.status_code, 403, response.content)

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_recalculate_updates_saved_path(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()
        create_response = self.client.post(
            "/api/learning-paths/",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "summary": chat["summary"],
                "estimated_weeks": chat["estimated_weeks"],
                "path": chat["path"],
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
                "advisor_meta": chat.get("advisor_meta") or {},
            },
            format="json",
        )
        path_id = create_response.json()["id"]

        recalc = self.client.post(
            f"/api/learning-paths/{path_id}/recalculate",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi biet SQL roi, hoc 8 gio moi tuan"}],
                "known_skills": ["sql"],
            },
            format="json",
        )
        self.assertEqual(recalc.status_code, 200, recalc.content)
        recalc_data = recalc.json()
        items = recalc_data["items"]
        self.assertTrue(all(item["course_title"] != self.sql_course.title for item in items))
        self.assertEqual(recalc_data["advisor_meta"]["provider_used"], "rule_based")

        updated_path = LearningPath.objects.get(id=path_id, user=self.user)
        self.assertTrue(hasattr(updated_path, "conversation"))
        conversation_messages = updated_path.conversation.messages or []
        self.assertGreaterEqual(len(conversation_messages), 1)
        self.assertEqual(conversation_messages[-1]["role"], "assistant")
        self.assertTrue((conversation_messages[-1].get("content") or "").strip())

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_recalculate_v2_contract_wraps_success_payload(self):
        chat = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        ).json()

        create_response = self.client.post(
            "/api/learning-paths/",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "summary": chat["summary"],
                "estimated_weeks": chat["estimated_weeks"],
                "path": chat["path"],
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
                "advisor_meta": chat.get("advisor_meta") or {},
            },
            format="json",
        )
        path_id = create_response.json()["id"]

        response = self.client.post(
            f"/api/learning-paths/{path_id}/recalculate?contract=v2",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi biet SQL roi, hoc 8 gio moi tuan"}],
                "known_skills": ["sql"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.headers.get("X-Advisor-Contract"), "v2")
        payload = response.json()
        self.assertEqual(payload.get("version"), "v2")
        self.assertIsInstance(payload.get("data"), dict)
        self.assertIn("items", payload.get("data") or {})

    @override_settings(
        LEARNING_PATH_PROVIDER="gemini",
        GEMINI_API_KEY="test-key",
        LEARNING_PATH_FORCE_GEMINI=True,
    )
    @patch("learning_paths.provider.genai.Client")
    def test_recalculate_v2_contract_wraps_upstream_error_payload(self, mock_client_cls):
        create_response = self.client.post(
            "/api/learning-paths/",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "summary": "Draft path for recalculate",
                "estimated_weeks": 6,
                "path": [
                    {
                        "course_id": self.sql_course.id,
                        "order": 1,
                        "reason": "Build SQL foundation",
                        "is_skippable": False,
                        "skippable_reason": None,
                    }
                ],
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
                "advisor_meta": {"provider_used": "rule_based"},
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201, create_response.content)
        path_id = create_response.json()["id"]

        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.side_effect = Exception("503 UNAVAILABLE")

        response = self.client.post(
            f"/api/learning-paths/{path_id}/recalculate?contract=v2",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi biet SQL roi, hoc 8 gio moi tuan"}],
                "known_skills": ["sql"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 503, response.content)
        self.assertEqual(response.headers.get("X-Advisor-Contract"), "v2")
        payload = response.json()
        self.assertEqual(payload.get("version"), "v2")
        self.assertEqual((payload.get("error") or {}).get("code"), "upstream_unavailable")
        self.assertIn("gemini_request_failed", (payload.get("error") or {}).get("message", ""))

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key")
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_chat_uses_gemini_provider_when_configured(self, mock_client_cls):
        stream_chunk = Mock()
        stream_chunk.text = (
            "{"
            '"type":"path",'
            '"path":['
            f'{{"course_id":{self.sql_course.id},"order":1,"reason":"Build SQL foundation","is_skippable":false,"skippable_reason":null}},'
            f'{{"course_id":{self.python_course.id},"order":2,"reason":"Use Python for analysis","is_skippable":false,"skippable_reason":null}}'
            "],"
            '"estimated_weeks":8,'
            '"summary":"Gemini generated path."'
            "}"
        )
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.return_value = [stream_chunk]

        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "path")
        self.assertEqual(data["summary"], "Gemini generated path.")
        self.assertEqual([item["course_id"] for item in data["path"]], [self.sql_course.id, self.python_course.id])
        self.assertEqual(data["advisor_meta"]["provider_used"], "gemini")
        self.assertEqual(mock_client.models.generate_content_stream.call_count, 1)
        self.assertEqual(mock_client.models.generate_content_stream.call_args.kwargs["model"], "gemini-2.5-flash")

    @override_settings(
        LEARNING_PATH_PROVIDER="gemini",
        GEMINI_API_KEY="test-key",
        GEMINI_TIMEOUT_SECONDS=11,
    )
    def test_get_advisor_provider_uses_timeout_from_settings(self):
        provider = get_advisor_provider()
        self.assertEqual(provider.timeout, 11)

    @override_settings(LEARNING_PATH_PROVIDER="auto", GEMINI_API_KEY="test-key")
    def test_get_advisor_provider_auto_prefers_gemini_when_key_exists(self):
        provider = get_advisor_provider()
        self.assertEqual(provider.__class__.__name__, "GeminiAdvisorProvider")

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-2.5-flash")
    def test_get_advisor_provider_prefers_env_model_over_admin_setting(self):
        admin_profile = Admin.objects.get(user=self.admin)
        SystemsSetting.objects.create(
            setting_group="ai",
            setting_key="learning_path_gemini_model",
            setting_value="gemini-2.5-flash-lite",
            description="Runtime Gemini model for learning path advisor",
            admin=admin_profile,
        )

        provider = get_advisor_provider()
        self.assertEqual(provider.model, "gemini-2.5-flash")

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-2.0-flash")
    def test_get_advisor_provider_maps_deprecated_env_model(self):
        provider = get_advisor_provider()
        self.assertEqual(provider.model, "gemini-2.5-flash")

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-2.5-flash")
    def test_get_advisor_provider_maps_deprecated_admin_model_setting(self):
        admin_profile = Admin.objects.get(user=self.admin)
        SystemsSetting.objects.create(
            setting_group="ai",
            setting_key="learning_path_gemini_model",
            setting_value="models/gemini-2.0-flash",
            description="Runtime Gemini model for learning path advisor",
            admin=admin_profile,
        )

        provider = get_advisor_provider()
        self.assertEqual(provider.model, "gemini-2.5-flash")

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key", GEMINI_MODEL="gemini-2.5-flash")
    def test_get_advisor_provider_uses_env_model_when_admin_setting_empty(self):
        admin_profile = Admin.objects.get(user=self.admin)
        SystemsSetting.objects.create(
            setting_group="ai",
            setting_key="learning_path_gemini_model",
            setting_value="  ",
            description="Runtime Gemini model for learning path advisor",
            admin=admin_profile,
        )

        provider = get_advisor_provider()
        self.assertEqual(provider.model, "gemini-2.5-flash")

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key", GEMINI_MODEL="")
    def test_get_advisor_provider_uses_admin_setting_when_env_model_empty(self):
        admin_profile = Admin.objects.get(user=self.admin)
        SystemsSetting.objects.create(
            setting_group="ai",
            setting_key="learning_path_gemini_model",
            setting_value="gemini-2.5-flash-lite",
            description="Runtime Gemini model for learning path advisor",
            admin=admin_profile,
        )

        provider = get_advisor_provider()
        self.assertEqual(provider.model, "gemini-2.5-flash-lite")

    @override_settings(LEARNING_PATH_PROVIDER="auto", GEMINI_API_KEY="")
    def test_get_advisor_provider_auto_falls_back_without_key(self):
        provider = get_advisor_provider()
        self.assertEqual(provider.__class__.__name__, "RuleBasedAdvisorProvider")

    @override_settings(LEARNING_PATH_PROVIDER="auto", GEMINI_API_KEY="", LEARNING_PATH_FORCE_GEMINI=True)
    def test_advisor_chat_returns_error_when_gemini_required_but_missing_key(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi biet Excel"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("Gemini is required", response.json().get("errors", ""))

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key", LEARNING_PATH_GEMINI_MAX_ATTEMPTS=2)
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_chat_retries_gemini_before_accepting_valid_payload(self, mock_client_cls):
        invalid_chunk = Mock()
        invalid_chunk.text = (
            "{"
            '"type":"path",'
            '"path":[{"course_id":999999,"order":1,"reason":"Invalid course","is_skippable":false,"skippable_reason":null}],'
            '"estimated_weeks":4,'
            '"summary":"This payload should be rejected."'
            "}"
        )
        valid_chunk = Mock()
        valid_chunk.text = (
            "{"
            '"type":"path",'
            '"path":['
            f'{{"course_id":{self.sql_course.id},"order":1,"reason":"Build SQL foundation","is_skippable":false,"skippable_reason":null}},'
            f'{{"course_id":{self.viz_course.id},"order":2,"reason":"Learn dashboard communication","is_skippable":false,"skippable_reason":null}}'
            "],"
            '"estimated_weeks":7,'
            '"summary":"Gemini retry succeeded."'
            "}"
        )
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.side_effect = [[invalid_chunk], [valid_chunk]]

        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "path")
        self.assertEqual(data["summary"], "Gemini retry succeeded.")
        self.assertEqual([item["course_id"] for item in data["path"]], [self.sql_course.id, self.viz_course.id])
        self.assertEqual(data["advisor_meta"]["attempt_count"], 2)
        self.assertEqual(mock_client.models.generate_content_stream.call_count, 2)

    @override_settings(
        LEARNING_PATH_PROVIDER="gemini",
        GEMINI_API_KEY="test-key",
        LEARNING_PATH_FORCE_GEMINI=True,
    )
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_chat_returns_503_when_strict_gemini_upstream_unavailable(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.side_effect = Exception("503 UNAVAILABLE")

        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 503, response.content)
        self.assertIn("gemini_request_failed", response.json().get("errors", ""))

    @override_settings(LEARNING_PATH_PROVIDER="rule_based", LEARNING_PATH_FORCE_GEMINI=False)
    def test_advisor_chat_v2_contract_wraps_success_payload(self):
        response = self.client.post(
            "/api/learning-paths/advisor/chat?contract=v2",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.headers.get("X-Advisor-Contract"), "v2")
        payload = response.json()
        self.assertEqual(payload.get("version"), "v2")
        self.assertIsInstance(payload.get("data"), dict)
        self.assertIn("type", payload.get("data") or {})

    @override_settings(
        LEARNING_PATH_PROVIDER="gemini",
        GEMINI_API_KEY="test-key",
        LEARNING_PATH_FORCE_GEMINI=True,
    )
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_chat_v2_contract_wraps_upstream_error_payload(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.side_effect = Exception("503 UNAVAILABLE")

        response = self.client.post(
            "/api/learning-paths/advisor/chat?contract=v2",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 503, response.content)
        self.assertEqual(response.headers.get("X-Advisor-Contract"), "v2")
        payload = response.json()
        self.assertEqual(payload.get("version"), "v2")
        self.assertEqual((payload.get("error") or {}).get("code"), "upstream_unavailable")
        self.assertIn("gemini_request_failed", (payload.get("error") or {}).get("message", ""))

    @override_settings(
        LEARNING_PATH_PROVIDER="gemini",
        GEMINI_API_KEY="test-key",
        LEARNING_PATH_FORCE_GEMINI=True,
    )
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_stream_emits_upstream_unavailable_error_event_when_strict_gemini_fails(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.side_effect = Exception("503 UNAVAILABLE")

        response = self.client.post(
            "/api/learning-paths/advisor/chat/stream",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = "".join(
            chunk.decode("utf-8") if isinstance(chunk, (bytes, bytearray)) else str(chunk)
            for chunk in response.streaming_content
        )
        self.assertIn("event: error", body)

        error_payload = self._extract_first_sse_error_payload(body)

        self.assertIsNotNone(error_payload, body)
        self.assertEqual(error_payload.get("code"), "upstream_unavailable")
        self.assertIn("Gemini stream failed", error_payload.get("message", ""))

    @override_settings(
        LEARNING_PATH_PROVIDER="gemini",
        GEMINI_API_KEY="test-key",
        LEARNING_PATH_FORCE_GEMINI=True,
    )
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_stream_v2_contract_wraps_error_payload(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.side_effect = Exception("503 UNAVAILABLE")

        response = self.client.post(
            "/api/learning-paths/advisor/chat/stream?contract=v2",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = "".join(
            chunk.decode("utf-8") if isinstance(chunk, (bytes, bytearray)) else str(chunk)
            for chunk in response.streaming_content
        )

        wrapped_payload = self._extract_first_sse_error_payload(body)

        self.assertIsNotNone(wrapped_payload, body)
        self.assertEqual(wrapped_payload.get("version"), "v2")
        self.assertEqual(wrapped_payload.get("event"), "error")
        self.assertEqual((wrapped_payload.get("data") or {}).get("code"), "upstream_unavailable")

    @override_settings(
        LEARNING_PATH_PROVIDER="gemini",
        GEMINI_API_KEY="test-key",
        LEARNING_PATH_GEMINI_MAX_ATTEMPTS=1,
    )
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_chat_respects_max_attempt_setting(self, mock_client_cls):
        invalid_chunk = Mock()
        invalid_chunk.text = (
            "{"
            '"type":"path",'
            '"path":[{"course_id":999999,"order":1,"reason":"Invalid course","is_skippable":false,"skippable_reason":null}],'
            '"estimated_weeks":4,'
            '"summary":"This payload should be rejected."'
            "}"
        )
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.return_value = [invalid_chunk]

        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "path")
        self.assertEqual(mock_client.models.generate_content_stream.call_count, 1)
        self.assertNotEqual(data["summary"], "This payload should be rejected.")
        self.assertTrue(data["advisor_meta"]["fallback_triggered"])

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key")
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_chat_marks_fallback_when_gemini_request_fails(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.side_effect = Exception("network timeout")

        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "path")
        self.assertEqual(data["advisor_meta"]["provider_used"], "rule_based")
        self.assertTrue(data["advisor_meta"]["fallback_triggered"])
        self.assertEqual(data["advisor_meta"]["fallback_provider"], "rule_based")
        self.assertIn("gemini_request_failed", data["advisor_meta"]["fallback_reason"])

    @override_settings(LEARNING_PATH_PROVIDER="gemini", GEMINI_API_KEY="test-key")
    @patch("learning_paths.provider.genai.Client")
    def test_advisor_chat_falls_back_after_two_invalid_gemini_attempts(self, mock_client_cls):
        invalid_chunk = Mock()
        invalid_chunk.text = (
            "{"
            '"type":"path",'
            '"path":[{"course_id":999999,"order":1,"reason":"Invalid course","is_skippable":false,"skippable_reason":null}],'
            '"estimated_weeks":4,'
            '"summary":"This payload should be rejected."'
            "}"
        )
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.side_effect = [[invalid_chunk], [invalid_chunk]]

        response = self.client.post(
            "/api/learning-paths/advisor/chat",
            {
                "goal_text": "Toi muon chuyen sang Data Analyst",
                "messages": [{"role": "user", "content": "Toi gioi Excel, chua biet SQL, hoc 8 gio moi tuan"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["type"], "path")
        self.assertGreaterEqual(len(data["path"]), 1)
        self.assertNotEqual(data["summary"], "This payload should be rejected.")
        self.assertTrue(all(item["course_id"] != 999999 for item in data["path"]))
        self.assertTrue(data["advisor_meta"]["fallback_triggered"])
        self.assertEqual(data["advisor_meta"]["fallback_provider"], "rule_based")
        self.assertEqual(mock_client.models.generate_content_stream.call_count, 2)
