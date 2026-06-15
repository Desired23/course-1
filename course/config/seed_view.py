import json
import os
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import connection, transaction
from django.http import JsonResponse

from admins.models import Admin
from categories.models import Category
from instructors.models import Instructor
from registration_forms.models import FormQuestion, RegistrationForm
from users.models import User


DEFAULT_PASSWORD = "password123"

# App labels Django manages itself — never wiped.
_SYSTEM_APP_LABELS = {"admin", "auth", "contenttypes", "sessions"}

# One blank account per role. Login works; no other personal data.
ACCOUNTS = (
    {
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "Platform Admin",
        "phone": "0900000001",
        "role": "admin",
    },
    {
        "username": "instructor",
        "email": "instructor@example.com",
        "full_name": "Instructor",
        "phone": "0900000002",
        "role": "instructor",
    },
    {
        "username": "student",
        "email": "student@example.com",
        "full_name": "Student",
        "phone": "0900000003",
        "role": "student",
    },
)

# Canonical instructor-application questions.
INSTRUCTOR_FORM_QUESTIONS = (
    {
        "order": 1,
        "label": "Giới thiệu bản thân (Bio)",
        "type": "textarea",
        "placeholder": "Hãy kể về bản thân, kinh nghiệm và lý do bạn muốn giảng dạy...",
        "help_text": "Tối thiểu vài câu để học viên hiểu về bạn.",
        "required": True,
    },
    {
        "order": 2,
        "label": "Chuyên ngành giảng dạy",
        "type": "text",
        "placeholder": "VD: Lập trình Web, Marketing, Thiết kế đồ họa...",
        "required": True,
    },
    {
        "order": 3,
        "label": "Bằng cấp / Chứng chỉ",
        "type": "text",
        "placeholder": "VD: Cử nhân CNTT, AWS Certified...",
        "help_text": "Bằng cấp hoặc chứng chỉ liên quan đến lĩnh vực giảng dạy.",
        "required": False,
    },
    {
        "order": 4,
        "label": "Số năm kinh nghiệm",
        "type": "number",
        "placeholder": "VD: 5",
        "required": True,
    },
    {
        "order": 5,
        "label": "Trình độ chuyên môn",
        "type": "select",
        "options": ["Mới bắt đầu", "Trung cấp", "Nâng cao", "Chuyên gia"],
        "required": True,
    },
    {
        "order": 6,
        "label": "Link hồ sơ / LinkedIn / Portfolio",
        "type": "url",
        "placeholder": "https://...",
        "required": False,
    },
    {
        "order": 7,
        "label": "CV / Hồ sơ năng lực",
        "type": "file",
        "help_text": "Tải lên CV (PDF) hoặc hồ sơ năng lực của bạn.",
        "required": False,
    },
)

# Category taxonomy — focused on the platform's nine core domains.
CATEGORY_TAXONOMY = {
    "Công nghệ thông tin": [
        "Lập trình Web",
        "Lập trình Mobile",
        "Cơ sở dữ liệu",
        "An ninh mạng",
    ],
    "Ngoại ngữ": [
        "Tiếng Anh",
        "Tiếng Nhật",
        "Tiếng Trung",
        "Tiếng Hàn",
    ],
    "Kỹ năng mềm": [
        "Giao tiếp",
        "Làm việc nhóm",
        "Thuyết trình",
        "Quản lý thời gian",
    ],
    "Kinh doanh và marketing": [
        "Khởi nghiệp",
        "Bán hàng",
        "Digital Marketing",
        "Quản trị doanh nghiệp",
    ],
    "Thiết kế và sáng tạo": [
        "Thiết kế đồ họa",
        "Thiết kế UX/UI",
        "Dựng video",
        "Nhiếp ảnh",
    ],
    "Tài chính – kế toán": [
        "Kế toán",
        "Tài chính cá nhân",
        "Đầu tư & Chứng khoán",
        "Thuế",
    ],
    "Giáo dục và luyện thi": [
        "Luyện thi đại học",
        "Luyện thi chứng chỉ",
        "Toán học",
        "Khoa học",
    ],
    "Sức khỏe và thể chất": [
        "Thể hình",
        "Yoga",
        "Dinh dưỡng",
        "Sức khỏe tinh thần",
    ],
    "Phát triển bản thân": [
        "Tư duy & Năng suất",
        "Lãnh đạo",
        "Quản lý cảm xúc",
        "Phát triển sự nghiệp",
    ],
}


def get_seed_secret():
    return os.getenv("SEED_SECRET_KEY", "demo-seed-2026")


def _project_models():
    """Every managed model defined under this project (excludes Django/3rd-party)."""
    base_dir = Path(settings.BASE_DIR).resolve()
    models = []
    for model in apps.get_models():
        opts = model._meta
        if opts.proxy or not opts.managed or opts.app_label in _SYSTEM_APP_LABELS:
            continue
        app_path = Path(apps.get_app_config(opts.app_label).path).resolve()
        try:
            app_path.relative_to(base_dir)
        except ValueError:
            continue
        models.append(model)
    return models


def _clear_database():
    """Empty every project table. Order-independent: TRUNCATE CASCADE on
    Postgres, deferred FK checks on SQLite."""
    tables = [m._meta.db_table for m in _project_models()]
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            quoted = ", ".join(f'"{t}"' for t in tables)
            cursor.execute(f"TRUNCATE {quoted} RESTART IDENTITY CASCADE")
        else:
            cursor.execute("PRAGMA defer_foreign_keys = ON")
            for table in tables:
                cursor.execute(f'DELETE FROM "{table}"')
    return len(tables)


def _seed_accounts():
    password_hash = make_password(DEFAULT_PASSWORD)
    users = {}
    for item in ACCOUNTS:
        users[item["role"]] = User.objects.create(
            username=item["username"],
            email=item["email"],
            password_hash=password_hash,
            full_name=item["full_name"],
            phone=item["phone"],
            status=User.StatusChoices.ACTIVE,
        )

    admin = Admin.objects.create(
        user=users["admin"],
        department="Operations",
        role="super_admin",
        is_super_admin=True,
        permissions=[],
    )
    Instructor.objects.create(user=users["instructor"])
    return admin


def _seed_instructor_form(admin):
    form = RegistrationForm.objects.create(
        type=RegistrationForm.FormType.INSTRUCTOR_APPLICATION,
        title="Đơn đăng ký trở thành Giảng viên",
        description=(
            "Điền thông tin bên dưới để gửi đơn đăng ký trở thành giảng viên. "
            "Đội ngũ quản trị sẽ xem xét và phản hồi đơn của bạn."
        ),
        is_active=True,
        version=1,
        created_by=admin,
    )
    for question in INSTRUCTOR_FORM_QUESTIONS:
        FormQuestion.objects.create(form=form, **question)
    return len(INSTRUCTOR_FORM_QUESTIONS)


def _seed_categories():
    count = 0
    for parent_name, children in CATEGORY_TAXONOMY.items():
        parent = Category.objects.create(name=parent_name)  # status defaults to active
        count += 1
        for child_name in children:
            Category.objects.create(name=child_name, parent_category=parent)
            count += 1
    return count


def _request_key(request, payload):
    return (
        payload.get("key")
        or request.GET.get("key", "")
        or request.headers.get("X-Seed-Key", "")
    )


def reset_db_view(request):
    if request.method not in ("GET", "POST"):
        return JsonResponse({"error": "Method not allowed. Use GET or POST."}, status=405)

    if request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8")) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON payload."}, status=400)
    else:
        payload = request.GET.dict()

    if _request_key(request, payload) != get_seed_secret():
        return JsonResponse({"error": "Invalid key"}, status=403)

    with transaction.atomic():
        cleared_tables = _clear_database()
        admin = _seed_accounts()
        question_count = _seed_instructor_form(admin)
        category_count = _seed_categories()

    return JsonResponse(
        {
            "message": "Database reset and seeded with baseline scaffold.",
            "cleared_tables": cleared_tables,
            "seeded": {
                "users": len(ACCOUNTS),
                "instructor_form_questions": question_count,
                "categories": category_count,
            },
            "login": {
                item["role"]: {"email": item["email"], "password": DEFAULT_PASSWORD}
                for item in ACCOUNTS
            },
        }
    )
