# -*- coding: utf-8 -*-
"""
Seed dữ liệu review end-to-end, bắt đầu từ user và đi theo đúng luồng nghiệp vụ.

Chạy từ thư mục course/:
    python seed_review_data.py

Hoặc:
    python manage.py shell < seed_review_data.py

Mặc định script sẽ:
    1. Cache thumbnail/video đã có trong database hiện tại.
    2. Upload video lên Cloudinary nếu thiếu video_url thật.
    3. Reset toàn bộ bảng project.
    4. Seed dữ liệu từ 01/2026 đến 18/06/2026.
    5. Validate các ràng buộc business chính.

Biến môi trường hữu ích:
    SEED_UPLOAD_VIDEOS=0                 Không upload video thiếu.
    SEED_ALLOW_LOCAL_VIDEO_FALLBACK=1    Cho phép dùng đường dẫn local nếu không upload.
    SEED_UPLOAD_THUMBNAILS=0             Không upload thumbnail local mới.
    SEED_ALLOW_LOCAL_THUMBNAIL_FALLBACK=1 Cho phép dùng thumbnail local nếu không upload.
    SEED_REQUIRE_THUMBNAILS=1            Fail nếu course không có thumbnail phù hợp.
"""

from __future__ import annotations

import os
import re
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.apps import apps
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management.color import no_style
from django.db import connection, transaction
from django.db.models import Avg, Count, Sum
from django.utils import timezone

from activity_logs.models import ActivityLog
from admins.models import Admin
from applications.models import Application, ApplicationResponse
from carts.models import Cart
from categories.models import Category
from certificates.models import Certificate
from coursemodules.models import CourseModule
from courses.models import Course
from enrollments.models import Enrollment
from instructor_earnings.models import InstructorEarning
from instructor_levels.models import InstructorLevel
from instructor_payouts.models import InstructorPayout
from instructors.models import Instructor
from lesson_comments.models import LessonComment
from lessons.models import Lesson
from learning_progress.models import LearningProgress
from notifications.models import Notification
from payment_details.models import Payment_Details
from payment_methods.models import InstructorPayoutMethod, UserPaymentMethod
from payments.models import Payment
from promotions.models import Promotion
from questions.models import Question
from quiz_questions.models import QuizQuestion, QuizTestCase
from quiz_results.models import QuizResult
from registration_forms.models import FormQuestion, RegistrationForm
from reports.models import (
    CopyrightCase,
    CopyrightCaseMessage,
    InstructorEarningHold,
    InstructorStrike,
    Report,
)
from reviews.models import Review
from systems_settings.models import PaymentSetting, PlatformSetting
from transcripts.models import LessonTranscript, TranscriptSegment, TranscriptWord
from transcripts.services import get_lesson_source_snapshot
from users.models import User, UserSettings
from wishlists.models import Wishlist


DEFAULT_PASSWORD = "password123"
LOCAL_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
REPO_ROOT = Path(settings.BASE_DIR).resolve().parent
SYSTEM_APP_LABELS = {"admin", "auth", "contenttypes", "sessions"}
OWNED_ENROLLMENT_STATUSES = {
    Enrollment.Status.Active,
    Enrollment.Status.Complete,
    Enrollment.Status.SUSPENDED,
}


class SeedError(RuntimeError):
    pass


@dataclass(frozen=True)
class VideoSpec:
    key: str
    filename: str
    topic: str
    fallback_minutes: int


@dataclass(frozen=True)
class CourseSpec:
    key: str
    title: str
    short: str
    description: str
    category: str
    subcategory: str
    instructor_key: str
    level: str
    price: Decimal
    objectives: list[str]
    requirements: str
    audience: list[str]
    tags: list[str]
    module_titles: list[str]
    videos: list[str]
    published_at: datetime
    fallback_thumbnail: str
    thumbnail_filename: str | None = None
    featured: bool = False


def dt(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d %H:%M").replace(tzinfo=LOCAL_TZ)


def money(value: str | int) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.00"))


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def normalize(value: str | None) -> str:
    value = value or ""
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def tokens(value: str | None) -> set[str]:
    return {item for item in normalize(value).split() if len(item) >= 3}


def has_field(obj, field_name: str) -> bool:
    return any(field.name == field_name for field in obj._meta.fields)


def stamp(obj, **fields):
    valid = {name: value for name, value in fields.items() if has_field(obj, name)}
    if valid:
        type(obj).objects.filter(pk=obj.pk).update(**valid)
        for name, value in valid.items():
            setattr(obj, name, value)
    return obj


def created(obj, at: datetime):
    fields = {"created_at": at, "updated_at": at}
    if has_field(obj, "payment_date"):
        fields["payment_date"] = at
    if has_field(obj, "submitted_at"):
        fields["submitted_at"] = at
    if has_field(obj, "request_date"):
        fields["request_date"] = at
    if has_field(obj, "earning_date"):
        fields["earning_date"] = at
    if has_field(obj, "issued_at"):
        fields["issued_at"] = at
    return stamp(obj, **fields)


def update_obj(obj, at: datetime | None = None, **fields):
    if at and has_field(obj, "updated_at"):
        fields.setdefault("updated_at", at)
    return stamp(obj, **fields)


VIDEO_LIBRARY = {
    item.key: item
    for item in [
        VideoSpec("market_research", "Nghiên_cứu_thị_trường.mp4", "Nghiên cứu thị trường", 12),
        VideoSpec("mkt_message", "Thông_Điệp_Marketing.mp4", "Thông điệp Marketing", 10),
        VideoSpec("promo_content", "Nội_Dung_Quảng_Bá_Thuyết_Phục.mp4", "Nội dung quảng bá thuyết phục", 11),
        VideoSpec("mkt_eval", "Đánh_giá_hiệu_quả_Marketing.mp4", "Đánh giá hiệu quả Marketing", 18),
        VideoSpec("py_var", "Biến_và_Kiểu_dữ_liệu.mp4", "Biến và kiểu dữ liệu", 14),
        VideoSpec("accounting", "Nguyên_tắc_kế_toán.mp4", "Nguyên tắc kế toán", 13),
        VideoSpec("invest", "Đầu_tư_và_quản_lý_rủi_ro.mp4", "Đầu tư và quản lý rủi ro", 15),
        VideoSpec("english", "Học_Tiếng_Anh_Giao_Tiếp.mp4", "Tiếng Anh giao tiếp", 12),
        VideoSpec("cert_prep", "Luyện_thi_chứng_chỉ.mp4", "Luyện thi chứng chỉ", 14),
        VideoSpec("time_block", "Sức_mạnh_Time_Blocking.mp4", "Sức mạnh Time Blocking", 10),
        VideoSpec("energy", "Quản_Lý_Năng_Lượng.mp4", "Quản lý năng lượng", 9),
        VideoSpec("execution", "Nền_tảng_thực_thi.mp4", "Nền tảng thực thi", 13),
        VideoSpec("active_read", "Khung_Đọc_Chủ_Động_3_Bước.mp4", "Khung đọc chủ động 3 bước", 12),
        VideoSpec("habit", "Xây_dựng_thói_quen_vận_động.mp4", "Xây dựng thói quen vận động", 11),
        VideoSpec("video_basic", "Dựng_video_cơ_bản.mp4", "Dựng video cơ bản", 12),
        VideoSpec("countdown", "10 Seconds Countdown Timer - YouTube.mp4", "Thực hành dựng đếm ngược", 4),
        VideoSpec("py_core", "Bí_Mật_Cốt_Lõi_Của_Python.mp4", "Bí mật cốt lõi của Python", 16),
        VideoSpec("py_errors", "Giải_Mã_Lỗi_Ma_Python.mp4", "Giải mã lỗi Python", 9),
        VideoSpec("py_listcomp", "List_Comprehension_X3_Tốc_Độ.mp4", "List comprehension tăng tốc", 10),
        VideoSpec("py_resources", "Quản_lý_tài_nguyên_Python.mp4", "Quản lý tài nguyên Python", 12),
        VideoSpec("py_generator", "Tối_ưu_RAM__Generator_vs_List.mp4", "Tối ưu RAM với Generator", 11),
        VideoSpec("math_examples", "Học_Toán_Qua_Bài_Mẫu.mp4", "Học toán qua bài mẫu", 12),
        VideoSpec("math_score", "Điểm_tuyệt_đối_môn_Toán.mp4", "Điểm tuyệt đối môn Toán", 10),
    ]
}


KNOWN_THUMBNAILS = {
    "Digital Marketing Toàn Diện Từ A đến Z": "https://res.cloudinary.com/dqzopvk2t/image/upload/v1781456726/course-thumbnails/v5hfjlt98yj8redu3q2b.jpg",
    "Nhập Môn Lập Trình Python Cho Người Mới": "https://res.cloudinary.com/dqzopvk2t/image/upload/v1781456728/course-thumbnails/cofy5uz6ydyvtfklqqoi.jpg",
    "Tài Chính Cá Nhân & Đầu Tư Thông Minh": "https://res.cloudinary.com/dqzopvk2t/image/upload/v1781456729/course-thumbnails/ae1ntgkuojbwgzpc3lck.jpg",
    "Tiếng Anh Giao Tiếp & Luyện Thi Chứng Chỉ": "https://res.cloudinary.com/dqzopvk2t/image/upload/v1781456731/course-thumbnails/kbzmzyvu77cpkihxznfy.jpg",
    "Tư Duy & Năng Suất Đỉnh Cao": "https://res.cloudinary.com/dqzopvk2t/image/upload/v1781456733/course-thumbnails/civyirn1ffdo1hv2ppzr.jpg",
    "Dựng Video Cơ Bản Cho Người Mới Bắt Đầu": "https://res.cloudinary.com/dqzopvk2t/image/upload/v1781456734/course-thumbnails/c1jze3tm1ipslkzkf7we.jpg",
}


COURSE_SPECS = [
    CourseSpec(
        key="marketing",
        title="Digital Marketing Toàn Diện Từ A đến Z",
        short="Làm chủ nghiên cứu thị trường, thông điệp, nội dung và đo lường chiến dịch.",
        description="Khóa học đi từ nghiên cứu khách hàng đến triển khai và tối ưu chiến dịch marketing số.",
        category="Marketing",
        subcategory="Digital Marketing",
        instructor_key="instructor_linh",
        level=Course.Level.BEGINNER,
        price=money(499000),
        objectives=[
            "Nghiên cứu thị trường và chân dung khách hàng",
            "Xây dựng thông điệp marketing rõ ràng",
            "Sản xuất nội dung quảng bá thuyết phục",
            "Đo lường và tối ưu chiến dịch",
        ],
        requirements="Có máy tính và tài khoản mạng xã hội để thực hành.",
        audience=["Chủ shop online", "Nhân sự marketing mới vào nghề", "Sinh viên kinh doanh"],
        tags=["marketing", "digital", "content", "analytics"],
        module_titles=["Nền tảng thị trường", "Nội dung và đo lường"],
        videos=["market_research", "mkt_message", "promo_content", "mkt_eval"],
        published_at=dt("2026-01-20 10:00"),
        fallback_thumbnail=KNOWN_THUMBNAILS["Digital Marketing Toàn Diện Từ A đến Z"],
        thumbnail_filename="Nghiên_cứu_thị_trường.png",
        featured=True,
    ),
    CourseSpec(
        key="python",
        title="Nhập Môn Lập Trình Python Cho Người Mới",
        short="Học biến, kiểu dữ liệu, điều kiện, vòng lặp và bài tập code đầu tiên.",
        description="Lộ trình Python cho người mới, tập trung vào tư duy lập trình và thực hành qua quiz/code.",
        category="Phát triển",
        subcategory="Ngôn ngữ lập trình",
        instructor_key="instructor_linh",
        level=Course.Level.BEGINNER,
        price=money(599000),
        objectives=[
            "Hiểu biến và kiểu dữ liệu",
            "Viết chương trình nhập xuất cơ bản",
            "Giải bài toán nhỏ bằng Python",
        ],
        requirements="Không cần kinh nghiệm lập trình trước đó.",
        audience=["Người mới học code", "Sinh viên năm nhất", "Người chuyển ngành IT"],
        tags=["python", "coding", "beginner"],
        module_titles=["Nhập môn Python", "Thực hành kiểm tra"],
        videos=["py_var", "py_var", "py_var", "py_var"],
        published_at=dt("2026-01-26 15:00"),
        fallback_thumbnail=KNOWN_THUMBNAILS["Nhập Môn Lập Trình Python Cho Người Mới"],
        thumbnail_filename="Biến_và_Kiểu_dữ_liệu.png",
        featured=True,
    ),
    CourseSpec(
        key="finance",
        title="Tài Chính Cá Nhân & Đầu Tư Thông Minh",
        short="Quản lý dòng tiền, nguyên tắc kế toán cá nhân và đầu tư kiểm soát rủi ro.",
        description="Khóa học giúp học viên xây nền tảng tài chính cá nhân trước khi lựa chọn kênh đầu tư.",
        category="Tài chính & Kế toán",
        subcategory="Kế toán",
        instructor_key="instructor_an",
        level=Course.Level.INTERMEDIATE,
        price=money(459000),
        objectives=[
            "Lập ngân sách cá nhân",
            "Hiểu nguyên tắc kế toán cơ bản",
            "Đánh giá rủi ro đầu tư",
        ],
        requirements="Có bảng thu chi cá nhân trong 1 tháng gần nhất.",
        audience=["Người mới đi làm", "Nhà đầu tư mới", "Chủ hộ kinh doanh nhỏ"],
        tags=["finance", "investment", "accounting"],
        module_titles=["Nền tảng tài chính", "Đầu tư và rủi ro"],
        videos=["accounting", "invest", "accounting", "invest"],
        published_at=dt("2026-02-10 09:30"),
        fallback_thumbnail=KNOWN_THUMBNAILS["Tài Chính Cá Nhân & Đầu Tư Thông Minh"],
        thumbnail_filename="Nguyên_tắc_kế_toán.png",
    ),
    CourseSpec(
        key="english",
        title="Tiếng Anh Giao Tiếp & Luyện Thi Chứng Chỉ",
        short="Tăng phản xạ giao tiếp và luyện chiến lược làm bài thi chứng chỉ.",
        description="Kết hợp luyện nói theo tình huống với kỹ thuật ôn thi chứng chỉ tiếng Anh.",
        category="Giảng dạy & Học thuật",
        subcategory="Ngôn ngữ",
        instructor_key="instructor_an",
        level=Course.Level.ALL_LEVELS,
        price=money(399000),
        objectives=[
            "Luyện phản xạ hội thoại",
            "Xây vốn từ cho tình huống thường gặp",
            "Nắm chiến thuật luyện thi chứng chỉ",
        ],
        requirements="Có tai nghe và dành tối thiểu 20 phút luyện nói mỗi ngày.",
        audience=["Người đi làm", "Sinh viên chuẩn bị thi chứng chỉ", "Người mất gốc muốn quay lại"],
        tags=["english", "communication", "certificate"],
        module_titles=["Giao tiếp nền tảng", "Luyện thi chứng chỉ"],
        videos=["english", "english", "cert_prep", "cert_prep"],
        published_at=dt("2026-02-18 14:00"),
        fallback_thumbnail=KNOWN_THUMBNAILS["Tiếng Anh Giao Tiếp & Luyện Thi Chứng Chỉ"],
        thumbnail_filename="Học_Tiếng_Anh_Giao_Tiếp.png",
    ),
    CourseSpec(
        key="productivity",
        title="Tư Duy & Năng Suất Đỉnh Cao",
        short="Time blocking, quản lý năng lượng, thực thi và xây dựng thói quen bền vững.",
        description="Khóa học miễn phí giúp học viên sắp xếp thời gian, năng lượng và thói quen học tập.",
        category="Phát triển cá nhân",
        subcategory="Năng suất cá nhân",
        instructor_key="instructor_linh",
        level=Course.Level.ALL_LEVELS,
        price=money(0),
        objectives=[
            "Lập kế hoạch time blocking",
            "Quản lý năng lượng cá nhân",
            "Xây thói quen học tập bền vững",
        ],
        requirements="Sẵn sàng ghi lại lịch sinh hoạt trong 7 ngày.",
        audience=["Học viên bận rộn", "Người đi làm", "Sinh viên"],
        tags=["productivity", "habit", "time-management"],
        module_titles=["Thời gian và năng lượng", "Thực thi và thói quen"],
        videos=["time_block", "energy", "execution", "habit"],
        published_at=dt("2026-03-01 08:30"),
        fallback_thumbnail=KNOWN_THUMBNAILS["Tư Duy & Năng Suất Đỉnh Cao"],
        thumbnail_filename="Sức_mạnh_Time_Blocking.png",
        featured=True,
    ),
    CourseSpec(
        key="video",
        title="Dựng Video Cơ Bản Cho Người Mới Bắt Đầu",
        short="Quy trình dựng video từ cắt ghép, chuyển cảnh đến xuất bản.",
        description="Khóa nhập môn dựng video với bài thực hành đếm ngược và quy trình xuất file.",
        category="Nhiếp ảnh & Video",
        subcategory="Quay & Dựng video",
        instructor_key="instructor_an",
        level=Course.Level.BEGINNER,
        price=money(429000),
        objectives=[
            "Hiểu quy trình dựng video",
            "Cắt ghép clip cơ bản",
            "Xuất video đúng định dạng",
        ],
        requirements="Có phần mềm dựng video như CapCut, Premiere hoặc DaVinci Resolve.",
        audience=["Người sáng tạo nội dung", "Chủ kênh TikTok/YouTube", "Người mới học dựng video"],
        tags=["video", "editing", "content-creator"],
        module_titles=["Tổng quan dựng video", "Thực hành xuất bản"],
        videos=["video_basic", "countdown", "video_basic", "countdown"],
        published_at=dt("2026-03-20 16:00"),
        fallback_thumbnail=KNOWN_THUMBNAILS["Dựng Video Cơ Bản Cho Người Mới Bắt Đầu"],
        thumbnail_filename="Dựng_video_cơ_bản.png",
    ),
    CourseSpec(
        key="python_advanced",
        title="Python Thực Chiến: Debug, List Comprehension và Generator",
        short="Luyện tư duy Python thực tế qua debug, list comprehension, generator và quản lý tài nguyên.",
        description="Khóa học nối tiếp Python nhập môn, tập trung vào các kỹ thuật nhỏ nhưng thường gặp trong dự án thật.",
        category="Phát triển",
        subcategory="Ngôn ngữ lập trình",
        instructor_key="instructor_linh",
        level=Course.Level.INTERMEDIATE,
        price=money(699000),
        objectives=[
            "Đọc và xử lý lỗi Python phổ biến",
            "Viết list comprehension rõ ràng",
            "Dùng generator để tiết kiệm bộ nhớ",
            "Quản lý tài nguyên bằng context manager",
        ],
        requirements="Đã biết biến, kiểu dữ liệu và hàm cơ bản trong Python.",
        audience=["Học viên đã học Python cơ bản", "Sinh viên làm bài tập lớn", "Người muốn viết code gọn hơn"],
        tags=["python", "debugging", "generator", "list-comprehension"],
        module_titles=["Python sâu hơn", "Tối ưu và quản lý tài nguyên"],
        videos=["py_core", "py_errors", "py_listcomp", "py_resources", "py_generator"],
        published_at=dt("2026-03-28 09:00"),
        fallback_thumbnail="",
        thumbnail_filename="Bí_Mật_Cốt_Lõi_Của_Python.png",
        featured=True,
    ),
    CourseSpec(
        key="math",
        title="Toán Nền Tảng Qua Bài Mẫu",
        short="Ôn lại tư duy giải toán bằng bài mẫu và chiến lược tránh sai sót khi làm bài.",
        description="Khóa học dành cho học viên muốn củng cố nền tảng toán thông qua ví dụ rõ ràng, ngắn và dễ luyện.",
        category="Giáo dục & Luyện thi",
        subcategory="Toán học",
        instructor_key="instructor_an",
        level=Course.Level.BEGINNER,
        price=money(299000),
        objectives=[
            "Đọc đề và tách dữ kiện",
            "Giải bài mẫu theo từng bước",
            "Kiểm tra kết quả để tránh mất điểm",
        ],
        requirements="Nắm phép tính cơ bản và có vở ghi để luyện bài.",
        audience=["Học sinh cần ôn nền tảng", "Phụ huynh muốn kèm con học", "Người học lại toán cơ bản"],
        tags=["math", "exam-prep", "problem-solving"],
        module_titles=["Học qua bài mẫu", "Chiến lược đạt điểm cao"],
        videos=["math_examples", "math_score", "math_examples", "math_score"],
        published_at=dt("2026-04-08 09:30"),
        fallback_thumbnail="",
        thumbnail_filename="Học_Toán_Qua_Bài_Mẫu.png",
    ),
]


def project_models():
    base_dir = Path(settings.BASE_DIR).resolve()
    models = []
    seen_tables = set()
    for model in apps.get_models(include_auto_created=True):
        opts = model._meta
        if opts.proxy or not opts.managed or opts.app_label in SYSTEM_APP_LABELS:
            continue
        try:
            app_path = Path(apps.get_app_config(opts.app_label).path).resolve()
            app_path.relative_to(base_dir)
        except ValueError:
            continue
        if opts.db_table in seen_tables:
            continue
        seen_tables.add(opts.db_table)
        models.append(model)
    return models


def clear_database():
    tables = [model._meta.db_table for model in project_models()]
    if not tables:
        return 0

    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            quoted = ", ".join(f'"{table}"' for table in tables)
            cursor.execute(f"TRUNCATE {quoted} RESTART IDENTITY CASCADE")
        elif connection.vendor == "sqlite":
            cursor.execute("PRAGMA foreign_keys = OFF")
            for table in tables:
                cursor.execute(f'DELETE FROM "{table}"')
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
            if cursor.fetchone():
                quoted_names = ", ".join(["%s"] * len(tables))
                cursor.execute(f"DELETE FROM sqlite_sequence WHERE name IN ({quoted_names})", tables)
            cursor.execute("PRAGMA foreign_keys = ON")
        else:
            statements = connection.ops.sql_flush(no_style(), tables, reset_sequences=True, allow_cascade=True)
            for statement in statements:
                cursor.execute(statement)
    return len(tables)


def load_thumbnail_cache():
    rows = []
    try:
        rows = list(
            Course.objects.exclude(thumbnail__isnull=True)
            .exclude(thumbnail="")
            .values("title", "thumbnail", "category__name", "subcategory__name")
        )
    except Exception as exc:
        print(f"[asset] Không đọc được thumbnail cũ: {exc}")
    return rows


def pick_thumbnail(spec: CourseSpec, cache_rows, allow_known_fallback=False):
    exact_title = normalize(spec.title)
    for row in cache_rows:
        if normalize(row.get("title")) == exact_title and row.get("thumbnail"):
            return row["thumbnail"]

    course_tokens = tokens(spec.title) | tokens(spec.category) | tokens(spec.subcategory)
    best = None
    best_score = 0
    for row in cache_rows:
        row_tokens = tokens(row.get("title")) | tokens(row.get("category__name")) | tokens(row.get("subcategory__name"))
        score = len(course_tokens & row_tokens)
        if score > best_score and row.get("thumbnail"):
            best = row["thumbnail"]
            best_score = score

    if best:
        return best
    return spec.fallback_thumbnail if allow_known_fallback else ""


def upload_thumbnail(filename: str):
    from utils.upload.cloudinary_upload import upload_file_to_cloudinary

    source_path = REPO_ROOT / filename
    if not source_path.exists():
        raise SeedError(f"Không tìm thấy thumbnail nguồn: {source_path}")

    print(f"[upload] thumbnail {filename}")
    result = upload_file_to_cloudinary(
        [str(source_path)],
        folder="course-thumbnails",
        resource_type="image",
        delivery_type="upload",
    )[0]
    return result["url"]


def resolve_local_thumbnail(spec: CourseSpec, thumbnail_cache):
    if not spec.thumbnail_filename:
        return ""

    if spec.thumbnail_filename in thumbnail_cache:
        return thumbnail_cache[spec.thumbnail_filename]

    upload_mode = os.getenv("SEED_UPLOAD_THUMBNAILS", "auto").strip().lower()
    allow_local = env_bool("SEED_ALLOW_LOCAL_THUMBNAIL_FALLBACK", False)
    source_path = REPO_ROOT / spec.thumbnail_filename
    if not source_path.exists():
        return ""

    if upload_mode not in {"0", "false", "no", "off"}:
        thumbnail_cache[spec.thumbnail_filename] = upload_thumbnail(spec.thumbnail_filename)
    elif allow_local:
        thumbnail_cache[spec.thumbnail_filename] = source_path.as_uri()
    else:
        return ""
    return thumbnail_cache[spec.thumbnail_filename]


def cache_settings():
    def values_for(instance):
        if not instance:
            return None
        excluded = {"id", "singleton_key", "updated_by", "created_at", "updated_at"}
        return {
            field.name: getattr(instance, field.name)
            for field in instance._meta.fields
            if field.name not in excluded and not field.many_to_one
        }

    return {
        "platform": values_for(PlatformSetting.objects.filter(singleton_key=1).first()),
        "payment": values_for(PaymentSetting.objects.filter(singleton_key=1).first()),
    }


def restore_settings(settings_cache, admin):
    platform_values = dict(settings_cache.get("platform") or {})
    payment_values = dict(settings_cache.get("payment") or {})

    platform = PlatformSetting.objects.create(**platform_values, updated_by=admin)
    payment = PaymentSetting.objects.create(**payment_values, updated_by=admin)
    created(platform, dt("2026-01-02 08:20"))
    created(payment, dt("2026-01-02 08:25"))
    return platform, payment


def load_video_cache():
    cache = {}
    try:
        lessons = Lesson.objects.filter(content_type=Lesson.ContentType.VIDEO).exclude(video_url__isnull=True).exclude(video_url="")
        for lesson in lessons:
            haystack = normalize(" ".join([lesson.title or "", lesson.description or "", lesson.video_public_id or ""]))
            for key, spec in VIDEO_LIBRARY.items():
                if key in cache:
                    continue
                topic_tokens = tokens(spec.topic)
                if len(topic_tokens & set(haystack.split())) >= min(2, len(topic_tokens)):
                    cache[key] = {
                        "url": lesson.video_url,
                        "public_id": lesson.video_public_id or "",
                        "duration": lesson.duration or spec.fallback_minutes,
                        "source": "cached-db",
                    }
    except Exception as exc:
        print(f"[asset] Không đọc được video cũ: {exc}")
    return cache


def upload_video(spec: VideoSpec):
    from utils.upload.cloudinary_upload import upload_file_to_cloudinary

    source_path = REPO_ROOT / spec.filename
    if not source_path.exists():
        raise SeedError(f"Không tìm thấy video nguồn: {source_path}")

    print(f"[upload] {spec.filename}")
    result = upload_file_to_cloudinary(
        [str(source_path)],
        folder="lesson-videos",
        resource_type="video",
        delivery_type="authenticated",
    )[0]
    duration_seconds = int(result.get("duration") or 0)
    duration_minutes = max(1, round(duration_seconds / 60)) if duration_seconds else spec.fallback_minutes
    return {
        "url": result["url"],
        "public_id": result["public_id"],
        "duration": duration_minutes,
        "source": "cloudinary-upload",
    }


def prepare_assets():
    print("[asset] Đọc asset hiện có trước khi reset database...")
    thumbnail_cache = load_thumbnail_cache()
    video_cache = load_video_cache()
    settings_cache = cache_settings()
    upload_mode = os.getenv("SEED_UPLOAD_VIDEOS", "auto").strip().lower()
    allow_local = env_bool("SEED_ALLOW_LOCAL_VIDEO_FALLBACK", False)
    require_thumbnails = env_bool("SEED_REQUIRE_THUMBNAILS", True)
    allow_known_thumbnail_fallback = env_bool("SEED_ALLOW_KNOWN_THUMBNAIL_FALLBACK", False)

    course_thumbnails = {}
    missing_thumbnails = []
    uploaded_thumbnail_cache = {}
    for spec in COURSE_SPECS:
        thumbnail = pick_thumbnail(spec, thumbnail_cache, allow_known_thumbnail_fallback)
        if not thumbnail:
            thumbnail = resolve_local_thumbnail(spec, uploaded_thumbnail_cache)
        if not thumbnail:
            missing_thumbnails.append(spec.title)
        course_thumbnails[spec.key] = thumbnail

    if require_thumbnails and missing_thumbnails:
        raise SeedError("Thiếu thumbnail có ý nghĩa cho: " + ", ".join(missing_thumbnails))

    video_assets = {}
    for key, spec in VIDEO_LIBRARY.items():
        if key in video_cache:
            video_assets[key] = video_cache[key]
            continue
        if upload_mode not in {"0", "false", "no", "off"}:
            video_assets[key] = upload_video(spec)
            continue
        if allow_local:
            local_path = REPO_ROOT / spec.filename
            video_assets[key] = {
                "url": local_path.as_uri(),
                "public_id": f"local-demo/{local_path.stem}",
                "duration": spec.fallback_minutes,
                "source": "local-fallback",
            }
            continue
        raise SeedError(
            f"Thiếu video_url thật cho {spec.filename}. "
            "Bật SEED_UPLOAD_VIDEOS=1 hoặc SEED_ALLOW_LOCAL_VIDEO_FALLBACK=1."
        )

    return {
        "course_thumbnails": course_thumbnails,
        "video_assets": video_assets,
        "missing_thumbnails": missing_thumbnails,
        "settings_cache": settings_cache,
    }


def seed_users():
    password_hash = make_password(DEFAULT_PASSWORD)
    specs = {
        "admin": ("admin", "admin@example.com", "Nguyễn Quản Trị", "0900000001", dt("2026-01-02 08:00")),
        "instructor_linh": ("linh_instructor", "linh.instructor@example.com", "Trần Minh Linh", "0900000002", dt("2026-01-03 09:00")),
        "instructor_an": ("an_instructor", "huydang2312003@gmail.com", "Phạm Hoài An", "0900000003", dt("2026-01-04 09:30")),
        "student_lan": ("lan.student", "danghuy2312003@gmail.com", "Lê Thanh Lan", "0900000101", dt("2026-01-05 10:00")),
        "student_minh": ("minh.student", "minh.student@example.com", "Đỗ Minh", "0900000102", dt("2026-01-06 10:00")),
        "student_hoa": ("hoa.student", "hoa.student@example.com", "Nguyễn Mai Hoa", "0900000103", dt("2026-01-08 10:00")),
        "student_quang": ("quang.student", "quang.student@example.com", "Vũ Đức Quang", "0900000104", dt("2026-01-09 10:00")),
        "student_nam": ("nam.student", "nam.student@example.com", "Trần Hải Nam", "0900000105", dt("2026-01-10 10:00")),
        "student_thao": ("thao.student", "thao.student@example.com", "Phạm Minh Thảo", "0900000106", dt("2026-01-11 10:00")),
    }

    users = {}
    for key, (username, email, full_name, phone, created_at) in specs.items():
        user = User.objects.create(
            username=username,
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            phone=phone,
            status=User.StatusChoices.ACTIVE,
        )
        created(user, created_at)
        UserSettings.objects.create(
            user=user,
            account_preferences={"language": "vi", "timezone": "Asia/Ho_Chi_Minh"},
            notification_preferences={"course": True, "payment": True, "promotion": key.startswith("student")},
            privacy_preferences={"profile_visibility": "platform"},
        )
        created(user.settings, created_at)
        users[key] = user
    return users


def seed_roles(users):
    admin = Admin.objects.create(
        user=users["admin"],
        department="Academic Operations",
        role="super_admin",
        is_super_admin=True,
        permissions=["courses.approve", "payments.refund", "reports.moderate", "payouts.process"],
    )
    created(admin, dt("2026-01-02 08:30"))

    levels = {
        "starter": InstructorLevel.objects.create(
            name="Starter",
            description="Giảng viên mới, cần tích lũy học viên và doanh thu.",
            min_students=0,
            min_revenue=money(0),
            commission_rate=money("35.00"),
            plan_commission_rate=money("40.00"),
        ),
        "professional": InstructorLevel.objects.create(
            name="Professional",
            description="Giảng viên đã có doanh thu ổn định.",
            min_students=50,
            min_revenue=money(20000000),
            commission_rate=money("25.00"),
            plan_commission_rate=money("30.00"),
        ),
    }
    created(levels["starter"], dt("2026-01-02 09:00"))
    created(levels["professional"], dt("2026-01-02 09:05"))

    form = RegistrationForm.objects.create(
        type=RegistrationForm.FormType.INSTRUCTOR_APPLICATION,
        title="Đơn đăng ký trở thành giảng viên",
        description="Thu thập hồ sơ chuyên môn trước khi cấp quyền giảng viên.",
        is_active=True,
        version=1,
        created_by=admin,
    )
    created(form, dt("2026-01-02 09:30"))
    questions = [
        FormQuestion.objects.create(form=form, order=1, label="Giới thiệu bản thân", type="textarea", required=True),
        FormQuestion.objects.create(form=form, order=2, label="Chuyên môn giảng dạy", type="text", required=True),
        FormQuestion.objects.create(form=form, order=3, label="Số năm kinh nghiệm", type="number", required=True),
        FormQuestion.objects.create(form=form, order=4, label="Portfolio/LinkedIn", type="url", required=False),
    ]
    for idx, question in enumerate(questions):
        created(question, dt(f"2026-01-02 09:{35 + idx:02d}"))

    instructor_payloads = {
        "instructor_linh": {
            "reviewed_at": dt("2026-01-06 14:00"),
            "created_at": dt("2026-01-06 14:30"),
            "level": levels["professional"],
            "specialization": "Lập trình Python, Marketing số, Năng suất cá nhân",
            "bio": "Giảng viên thực chiến với kinh nghiệm xây khóa học số và đào tạo nội bộ.",
            "qualification": "MSc Computer Science, Google Digital Garage",
            "experience": 8,
        },
        "instructor_an": {
            "reviewed_at": dt("2026-01-07 15:00"),
            "created_at": dt("2026-01-07 15:30"),
            "level": levels["starter"],
            "specialization": "Tài chính cá nhân, tiếng Anh, sản xuất video",
            "bio": "Chuyên gia đào tạo kỹ năng ứng dụng cho người đi làm.",
            "qualification": "CFA Level I, IELTS 8.0",
            "experience": 5,
        },
    }

    instructors = {}
    for key, payload in instructor_payloads.items():
        submitted_at = payload["reviewed_at"].replace(day=payload["reviewed_at"].day - 1, hour=9, minute=0)
        app = Application.objects.create(
            user=users[key],
            form=form,
            status=Application.Status.APPROVED,
            reviewed_by=admin,
            reviewed_at=payload["reviewed_at"],
            admin_notes="Hồ sơ đạt yêu cầu chuyên môn và có kế hoạch khóa học rõ ràng.",
        )
        created(app, submitted_at)
        update_obj(app, payload["reviewed_at"], reviewed_at=payload["reviewed_at"])
        response_values = [
            payload["bio"],
            payload["specialization"],
            payload["experience"],
            f"https://portfolio.example.com/{users[key].username}",
        ]
        for question, value in zip(questions, response_values):
            ApplicationResponse.objects.create(application=app, question=question, value=value)

        instructor = Instructor.objects.create(
            user=users[key],
            bio=payload["bio"],
            specialization=payload["specialization"],
            qualification=payload["qualification"],
            experience=payload["experience"],
            social_links={"linkedin": f"https://linkedin.example.com/in/{users[key].username}"},
            payment_info={"bank": "VCB", "account_name": users[key].full_name},
            profile_settings={"public_profile": True},
            level=payload["level"],
        )
        created(instructor, payload["created_at"])
        InstructorPayoutMethod.objects.create(
            instructor=instructor,
            method_type=InstructorPayoutMethod.MethodType.BANK_TRANSFER,
            is_default=True,
            nickname="Tài khoản nhận doanh thu",
            bank_name="Vietcombank",
            account_number=f"9704{instructor.id:08d}",
            account_name=users[key].full_name,
            masked_account="****" + f"{instructor.id:04d}",
        )
        created(instructor.payout_methods.first(), payload["created_at"])
        instructors[key] = instructor

    return admin, instructors, levels


def seed_categories():
    taxonomy = {
        "Marketing": ["Digital Marketing"],
        "Phát triển": ["Ngôn ngữ lập trình"],
        "Tài chính & Kế toán": ["Kế toán"],
        "Giảng dạy & Học thuật": ["Ngôn ngữ"],
        "Phát triển cá nhân": ["Năng suất cá nhân"],
        "Nhiếp ảnh & Video": ["Quay & Dựng video"],
        "Giáo dục & Luyện thi": ["Toán học"],
    }
    categories = {}
    order = 1
    for parent_name, children in taxonomy.items():
        parent = Category.objects.create(name=parent_name, description=f"Nhóm khóa học {parent_name}", order=order)
        created(parent, dt("2026-01-03 08:00"))
        categories[parent_name] = parent
        order += 1
        for child_name in children:
            child = Category.objects.create(
                name=child_name,
                description=f"Chuyên mục {child_name}",
                parent_category=parent,
                order=order,
            )
            created(child, dt("2026-01-03 08:10"))
            categories[child_name] = child
            order += 1
    return categories


def make_mc(text, options, correct_idx, explanation):
    return {
        "question_text": text,
        "question_type": QuizQuestion.QuestionType.MULTIPLE_CHOICE,
        "options": [{"text": item} for item in options],
        "correct_answer": str(correct_idx),
        "points": 10,
        "explanation": explanation,
    }


def make_tf(text, correct_true, explanation):
    return {
        "question_text": text,
        "question_type": QuizQuestion.QuestionType.TRUE_FALSE,
        "options": [{"text": "Đúng"}, {"text": "Sai"}],
        "correct_answer": "0" if correct_true else "1",
        "points": 5,
        "explanation": explanation,
    }


QUIZ_BANK = {
    "marketing": [
        make_mc("Bước đầu tiên của một chiến dịch marketing bài bản là gì?", ["Chạy quảng cáo", "Nghiên cứu thị trường", "Thiết kế logo", "Tăng ngân sách"], 1, "Cần hiểu thị trường trước khi triển khai."),
        make_tf("Thông điệp nên được điều chỉnh theo từng nhóm khách hàng.", True, "Cá nhân hóa giúp tăng hiệu quả."),
    ],
    "python": [
        make_mc("Hàm nào dùng để in ra màn hình trong Python?", ["echo()", "printf()", "print()", "console.log()"], 2, "print() là hàm in chuẩn của Python."),
        make_tf("Trong Python, input() luôn trả về chuỗi trước khi ép kiểu.", True, "Cần ép kiểu nếu muốn tính toán số học."),
        {
            "question_text": "Viết chương trình đọc 2 số nguyên và in tổng.",
            "question_type": QuizQuestion.QuestionType.CODE,
            "difficulty": QuizQuestion.DifficultyLevel.EASY,
            "points": 20,
            "correct_answer": "Chấm bằng test cases",
            "description": "Input gồm hai số nguyên cách nhau bởi dấu cách. Output là tổng.",
            "starter_code": "a, b = map(int, input().split())\n# TODO: in tong\n",
            "time_limit": 5,
            "memory_limit": 128000,
            "allowed_languages": [71, 63],
            "explanation": "Dùng print(a + b).",
            "test_cases": [
                {"input_data": "2 3", "expected_output": "5", "is_hidden": False, "order_number": 1},
                {"input_data": "10 20", "expected_output": "30", "is_hidden": False, "order_number": 2},
            ],
        },
    ],
    "finance": [
        make_mc("Quỹ khẩn cấp thường nên đủ chi phí trong bao lâu?", ["1 ngày", "1 tuần", "3-6 tháng", "10 năm"], 2, "3-6 tháng giúp giảm rủi ro tài chính."),
        make_tf("Đa dạng hóa có thể giúp giảm rủi ro danh mục.", True, "Không phụ thuộc vào một tài sản duy nhất."),
    ],
    "english": [
        make_mc("Khi luyện nói, yếu tố nào quan trọng nhất?", ["Dịch từng từ", "Phản xạ theo ngữ cảnh", "Học thuộc ngữ pháp", "Chỉ đọc sách"], 1, "Giao tiếp cần phản xạ ngữ cảnh."),
        make_tf("Luyện thi chứng chỉ nên có lịch làm đề định kỳ.", True, "Đo tiến độ bằng đề thi mẫu."),
    ],
    "productivity": [
        make_mc("Time blocking giúp gì?", ["Lấp kín mọi phút", "Đặt khung giờ cho việc quan trọng", "Bỏ nghỉ ngơi", "Chỉ dùng cho quản lý"], 1, "Khung giờ rõ giúp bảo vệ sự tập trung."),
        make_tf("Nghỉ ngơi hợp lý giúp phục hồi năng lượng.", True, "Năng lượng tốt làm việc hiệu quả hơn."),
    ],
    "video": [
        make_mc("Timeline trong phần mềm dựng video dùng để làm gì?", ["Tô màu", "Sắp xếp clip theo thời gian", "Tính tiền", "Gửi email"], 1, "Timeline là nơi xếp clip theo trình tự."),
        make_tf("Nên kiểm tra lại video sau khi xuất trước khi đăng tải.", True, "Xem lại giúp phát hiện lỗi."),
    ],
    "python_advanced": [
        make_mc("Generator hữu ích nhất khi nào?", ["Khi cần tiết kiệm bộ nhớ", "Khi muốn xóa file", "Khi đổi tên biến", "Khi thiết kế ảnh"], 0, "Generator tạo dữ liệu dần nên tiết kiệm RAM."),
        make_tf("List comprehension phù hợp khi muốn tạo danh sách mới từ dữ liệu có sẵn.", True, "Cú pháp này giúp biến đổi và lọc dữ liệu ngắn gọn."),
        {
            "question_text": "Viết chương trình đọc 2 số nguyên và in tổng.",
            "question_type": QuizQuestion.QuestionType.CODE,
            "difficulty": QuizQuestion.DifficultyLevel.EASY,
            "points": 20,
            "correct_answer": "Chấm bằng test cases",
            "description": "Input gồm hai số nguyên cách nhau bởi dấu cách. Output là tổng.",
            "starter_code": "a, b = map(int, input().split())\nprint(a + b)\n",
            "time_limit": 5,
            "memory_limit": 128000,
            "allowed_languages": [71, 63],
            "explanation": "Đọc hai số và in tổng bằng print(a + b).",
            "test_cases": [
                {"input_data": "1 2", "expected_output": "3", "is_hidden": False, "order_number": 1},
                {"input_data": "7 8", "expected_output": "15", "is_hidden": False, "order_number": 2},
            ],
        },
    ],
    "math": [
        make_mc("Khi giải bài toán mẫu, bước đầu tiên nên là gì?", ["Đoán đáp án", "Tách dữ kiện", "Bỏ qua đề", "Viết kết quả ngay"], 1, "Tách dữ kiện giúp chọn đúng hướng giải."),
        make_tf("Sau khi tính xong nên kiểm tra lại đơn vị và điều kiện đề bài.", True, "Kiểm tra giúp tránh mất điểm vì lỗi nhỏ."),
    ],
}


def seed_courses(categories, instructors, assets):
    courses = {}
    lessons_by_course = {}
    for spec in COURSE_SPECS:
        question_bank = QUIZ_BANK[spec.key]
        quiz_questions = [
            question
            for question in question_bank
            if question["question_type"] != QuizQuestion.QuestionType.CODE
        ]
        code_questions = [
            question
            for question in question_bank
            if question["question_type"] == QuizQuestion.QuestionType.CODE
        ]
        course_created_at = spec.published_at - timedelta(days=6)
        course_created_at = course_created_at.replace(hour=9, minute=0)
        course = Course.objects.create(
            title=spec.title,
            shortdescription=spec.short,
            description=spec.description,
            instructor=instructors[spec.instructor_key],
            category=categories[spec.category],
            subcategory=categories[spec.subcategory],
            thumbnail=assets["course_thumbnails"].get(spec.key),
            price=spec.price,
            level=spec.level,
            language="Tiếng Việt",
            requirements=spec.requirements,
            learning_objectives=spec.objectives,
            target_audience=spec.audience,
            tags=spec.tags,
            status=Course.Status.PUBLISHED,
            is_featured=spec.featured,
            is_public=True,
            published_date=spec.published_at,
        )
        created(course, course_created_at)
        update_obj(course, spec.published_at, status=Course.Status.PUBLISHED, published_date=spec.published_at)

        lessons = []
        video_chunks = [spec.videos[:2], spec.videos[2:]]
        for module_idx, module_title in enumerate(spec.module_titles, start=1):
            module_created_at = course_created_at.replace(day=course_created_at.day + module_idx, hour=10)
            module = CourseModule.objects.create(
                course=course,
                title=f"Chương {module_idx}: {module_title}",
                description=f"Nội dung chính: {module_title.lower()}.",
                order_number=module_idx,
                status="Published",
            )
            created(module, module_created_at)

            lesson_order = 1
            for video_key in video_chunks[module_idx - 1]:
                video_spec = VIDEO_LIBRARY[video_key]
                video_asset = assets["video_assets"][video_key]
                lesson = Lesson.objects.create(
                    coursemodule=module,
                    title=f"Bài {module_idx}.{lesson_order}: {video_spec.topic}",
                    description=f"Video nguồn: {video_spec.filename}. Chủ đề: {video_spec.topic}.",
                    content_type=Lesson.ContentType.VIDEO,
                    video_url=video_asset["url"],
                    video_public_id=video_asset["public_id"],
                    file_path=str(REPO_ROOT / video_spec.filename),
                    duration=video_asset["duration"],
                    is_free=(module_idx == 1 and lesson_order == 1),
                    order=lesson_order,
                    status=Lesson.Status.PUBLISHED,
                )
                created(lesson, module_created_at.replace(hour=10 + lesson_order))
                create_transcript_sample(lesson, video_spec.topic, module_created_at.replace(hour=11 + lesson_order))
                lessons.append(lesson)
                lesson_order += 1

            if quiz_questions:
                quiz = Lesson.objects.create(
                    coursemodule=module,
                    title=f"Bài {module_idx}.Q: Quiz {module_title}",
                    description="Bài kiểm tra cuối chương.",
                    content_type=Lesson.ContentType.QUIZ,
                    content='{"passingScore": 70, "attempts": 0}',
                    duration=8,
                    is_free=False,
                    order=lesson_order,
                    status=Lesson.Status.PUBLISHED,
                )
                created(quiz, module_created_at.replace(hour=14))
                for idx, question_data in enumerate(quiz_questions, start=1):
                    question = QuizQuestion.objects.create(lesson=quiz, order_number=idx, **question_data)
                    created(question, module_created_at.replace(hour=14, minute=idx))
                lessons.append(quiz)
                lesson_order += 1

            if module_idx == len(spec.module_titles):
                for code_idx, question_data in enumerate(code_questions, start=1):
                    code_lesson = Lesson.objects.create(
                        coursemodule=module,
                        title=f"Bài {module_idx}.C{code_idx}: Bài code tính tổng 2 số",
                        description=question_data.get("description") or "Bài code thực hành cuối khóa.",
                        content_type=Lesson.ContentType.CODE,
                        duration=10,
                        is_free=False,
                        order=lesson_order,
                        status=Lesson.Status.PUBLISHED,
                    )
                    created(code_lesson, module_created_at.replace(hour=15, minute=code_idx))
                    test_cases = question_data.get("test_cases", [])
                    payload = {key: value for key, value in question_data.items() if key != "test_cases"}
                    question = QuizQuestion.objects.create(lesson=code_lesson, order_number=1, **payload)
                    created(question, module_created_at.replace(hour=15, minute=code_idx))
                    for test_case in test_cases:
                        quiz_test_case = QuizTestCase.objects.create(question=question, **test_case)
                        created(quiz_test_case, module_created_at.replace(hour=15, minute=code_idx))
                    lessons.append(code_lesson)
                    lesson_order += 1

        courses[spec.key] = course
        lessons_by_course[spec.key] = lessons
    recalc_all_courses()
    return courses, lessons_by_course


def create_transcript_sample(lesson, topic, at):
    transcript = LessonTranscript.objects.create(
        lesson=lesson,
        language_code="vi",
        status=LessonTranscript.Status.PUBLISHED,
        origin=LessonTranscript.Origin.MANUAL,
        provider="local_whisper",
        source_video_url_snapshot=get_lesson_source_snapshot(lesson),
        detected_language_code="vi",
        published_at=at,
    )
    created(transcript, at)
    segment = TranscriptSegment.objects.create(
        transcript=transcript,
        segment_index=1,
        start_ms=0,
        end_ms=12000,
        text=f"Trong bài học này, chúng ta bắt đầu với chủ đề {topic}.",
        confidence=0.96,
        speaker_label="instructor",
    )
    words = ["Trong", "bài", "học", "này"]
    for idx, word in enumerate(words, start=1):
        TranscriptWord.objects.create(segment=segment, word_index=idx, start_ms=(idx - 1) * 500, end_ms=idx * 500, text=word, confidence=0.95)


def seed_payment_methods(users):
    for key in ["student_lan", "student_minh", "student_hoa", "student_quang", "student_nam", "student_thao"]:
        user = users[key]
        method = UserPaymentMethod.objects.create(
            user=user,
            method_type=UserPaymentMethod.MethodType.VNPAY if key != "student_minh" else UserPaymentMethod.MethodType.MOMO,
            is_default=True,
            nickname="Phương thức thanh toán chính",
            gateway_token=f"tok_demo_{user.username}",
            masked_account="09*****" + user.phone[-2:],
        )
        created(method, dt("2026-01-12 09:00"))


def seed_promotions(admin, instructors, courses, categories):
    py_promo = Promotion.objects.create(
        code="PYTHON20",
        description="Giảm tối đa 100.000đ cho khóa Python.",
        discount_type=Promotion.DiscountTypeChoices.PERCENTAGE,
        discount_value=money("20.00"),
        start_date=dt("2026-01-25 00:00"),
        end_date=dt("2026-06-30 23:59"),
        usage_limit=200,
        min_purchase=money(300000),
        max_discount=money(100000),
        instructor=instructors["instructor_linh"],
        status=Promotion.StatusChoices.ACTIVE,
    )
    py_promo.applicable_courses.add(courses["python"])
    created(py_promo, dt("2026-01-25 08:00"))

    english_promo = Promotion.objects.create(
        code="ENGLISH60",
        description="Giảm 60.000đ cho khóa tiếng Anh.",
        discount_type=Promotion.DiscountTypeChoices.FIXED_AMOUNT,
        discount_value=money(60000),
        start_date=dt("2026-03-20 00:00"),
        end_date=dt("2026-06-30 23:59"),
        usage_limit=100,
        min_purchase=money(250000),
        instructor=instructors["instructor_an"],
        status=Promotion.StatusChoices.ACTIVE,
    )
    english_promo.applicable_courses.add(courses["english"])
    created(english_promo, dt("2026-03-20 08:00"))

    advanced_python_promo = Promotion.objects.create(
        code="PYADV75",
        description="Giảm 75.000đ cho khóa Python thực chiến.",
        discount_type=Promotion.DiscountTypeChoices.FIXED_AMOUNT,
        discount_value=money(75000),
        start_date=dt("2026-03-28 00:00"),
        end_date=dt("2026-06-30 23:59"),
        usage_limit=120,
        min_purchase=money(500000),
        instructor=instructors["instructor_linh"],
        status=Promotion.StatusChoices.ACTIVE,
    )
    advanced_python_promo.applicable_courses.add(courses["python_advanced"])
    created(advanced_python_promo, dt("2026-03-28 10:00"))

    math_promo = Promotion.objects.create(
        code="MATH50",
        description="Giảm 50.000đ cho khóa Toán nền tảng.",
        discount_type=Promotion.DiscountTypeChoices.FIXED_AMOUNT,
        discount_value=money(50000),
        start_date=dt("2026-04-08 00:00"),
        end_date=dt("2026-06-30 23:59"),
        usage_limit=100,
        min_purchase=money(200000),
        instructor=instructors["instructor_an"],
        status=Promotion.StatusChoices.ACTIVE,
    )
    math_promo.applicable_courses.add(courses["math"])
    created(math_promo, dt("2026-04-08 10:00"))

    homepage_promo = Promotion.objects.create(
        code="SUMMER2026",
        description="Mã admin hiển thị trang chủ cho nhóm Marketing.",
        discount_type=Promotion.DiscountTypeChoices.PERCENTAGE,
        discount_value=money("10.00"),
        start_date=dt("2026-06-01 00:00"),
        end_date=dt("2026-06-30 23:59"),
        usage_limit=500,
        min_purchase=money(300000),
        max_discount=money(80000),
        admin=admin,
        show_on_homepage=True,
        status=Promotion.StatusChoices.ACTIVE,
    )
    homepage_promo.applicable_categories.add(categories["Marketing"])
    created(homepage_promo, dt("2026-06-01 08:00"))
    return {
        "python": py_promo,
        "english": english_promo,
        "python_advanced": advanced_python_promo,
        "math": math_promo,
        "summer": homepage_promo,
    }


def create_payment(user, items, paid_at, method=Payment.PaymentMethod.VNPAY, status=Payment.PaymentStatus.COMPLETED):
    if not items:
        raise SeedError("Payment phải có ít nhất một sản phẩm.")

    amount = sum((item["price"] for item in items), money(0))
    discount = sum((item.get("discount") or money(0) for item in items), money(0))
    total = amount - discount
    if total <= 0:
        raise SeedError("Payment course_purchase chỉ dùng cho khóa trả phí.")

    gateway_responses = {
        Payment.PaymentStatus.COMPLETED: "00|seeded_success",
        Payment.PaymentStatus.PENDING: "01|seeded_pending",
        Payment.PaymentStatus.FAILED: "24|seeded_failed",
        Payment.PaymentStatus.CANCELLED: "24|seeded_cancelled",
        Payment.PaymentStatus.REFUNDED: "00|seeded_refunded",
    }
    payment = Payment.objects.create(
        user=user,
        payment_type=Payment.PaymentType.COURSE_PURCHASE,
        amount=amount,
        discount_amount=discount,
        total_amount=total,
        transaction_id=f"SEED-{paid_at.strftime('%Y%m%d')}-{uuid.uuid4().hex[:10].upper()}",
        payment_status=status,
        payment_method=method,
        payment_gateway=method,
        gateway_response=gateway_responses[status],
    )
    created(payment, paid_at)

    details = []
    for item in items:
        course = item["course"]
        if course.price <= 0:
            raise SeedError(f"Khóa miễn phí không được tạo payment: {course.title}")
        if course.status != Course.Status.PUBLISHED:
            raise SeedError(f"Không thể bán khóa chưa published: {course.title}")
        detail = Payment_Details.objects.create(
            payment=payment,
            course=course,
            price=item["price"],
            discount=item.get("discount") or money(0),
            final_price=item["price"] - (item.get("discount") or money(0)),
            promotion=item.get("promotion"),
        )
        created(detail, paid_at)
        details.append(detail)
    return payment, details


def create_purchase_enrollments(payment, details, enrolled_at, progress=Decimal("0.00"), status=Enrollment.Status.Active):
    enrollments = []
    for detail in details:
        if payment.payment_status != Payment.PaymentStatus.COMPLETED:
            raise SeedError("Chỉ payment completed mới tạo enrollment mua khóa.")
        enrollment = Enrollment.objects.create(
            user=payment.user,
            course=detail.course,
            payment=payment,
            source=Enrollment.Source.PURCHASE,
            enrollment_date=enrolled_at,
            progress=progress,
            progress_denominator=100,
            status=status,
            last_access_date=enrolled_at,
        )
        created(enrollment, enrolled_at)
        enrollments.append(enrollment)
    return enrollments


def create_free_enrollment(user, course, enrolled_at):
    if course.price > 0:
        raise SeedError("Free enrollment chỉ dùng cho khóa miễn phí.")
    enrollment = Enrollment.objects.create(
        user=user,
        course=course,
        payment=None,
        source=Enrollment.Source.GRANTED,
        enrollment_date=enrolled_at,
        progress=money(0),
        progress_denominator=100,
        status=Enrollment.Status.Active,
        last_access_date=enrolled_at,
    )
    created(enrollment, enrolled_at)
    return enrollment


def generate_earnings(payment, details, at, status=InstructorEarning.StatusChoices.PENDING):
    earnings = []
    for detail in details:
        instructor = detail.course.instructor
        if not instructor:
            raise SeedError(f"Course không có instructor nên không thể tạo earning: {detail.course.title}")
        platform_rate = instructor.level.commission_rate if instructor.level else money("30.00")
        share_rate = money("100.00") - platform_rate
        net = (detail.final_price * share_rate / money("100.00")).quantize(Decimal("0.01"))
        earning = InstructorEarning.objects.create(
            instructor=instructor,
            course=detail.course,
            payment=payment,
            amount=detail.final_price,
            net_amount=net,
            platform_commission_rate=platform_rate,
            instructor_share_rate=share_rate,
            instructor_level_id_snapshot=instructor.level_id,
            instructor_level_name_snapshot=instructor.level.name if instructor.level else None,
            status=status,
        )
        created(earning, at)
        earnings.append(earning)
    return earnings


def seed_orders_and_learning(users, courses, lessons_by_course, promotions):
    seed_payment_methods(users)
    payments = {}
    enrollments = {}
    earnings = {}

    payment, details = create_payment(
        users["student_lan"],
        [
            {"course": courses["marketing"], "price": money(499000)},
            {"course": courses["python"], "price": money(599000), "discount": money(100000), "promotion": promotions["python"]},
        ],
        dt("2026-01-30 09:15"),
        Payment.PaymentMethod.VNPAY,
    )
    payments["lan_bundle"] = payment
    enrollments["lan_marketing"], enrollments["lan_python"] = create_purchase_enrollments(payment, details, dt("2026-01-30 09:20"))
    earnings["lan_bundle"] = generate_earnings(payment, details, dt("2026-01-30 09:25"), InstructorEarning.StatusChoices.AVAILABLE)

    payment, details = create_payment(
        users["student_minh"],
        [{"course": courses["finance"], "price": money(459000)}],
        dt("2026-02-20 20:00"),
        Payment.PaymentMethod.MOMO,
    )
    payments["minh_finance"] = payment
    [enrollments["minh_finance"]] = create_purchase_enrollments(payment, details, dt("2026-02-20 20:05"))
    earnings["minh_finance"] = generate_earnings(payment, details, dt("2026-02-20 20:10"), InstructorEarning.StatusChoices.AVAILABLE)

    enrollments["hoa_productivity"] = create_free_enrollment(users["student_hoa"], courses["productivity"], dt("2026-03-10 08:30"))

    payment, details = create_payment(
        users["student_quang"],
        [{"course": courses["english"], "price": money(399000), "discount": money(60000), "promotion": promotions["english"]}],
        dt("2026-04-02 19:00"),
        Payment.PaymentMethod.VNPAY,
    )
    payments["quang_english"] = payment
    [enrollments["quang_english"]] = create_purchase_enrollments(payment, details, dt("2026-04-02 19:04"))
    earnings["quang_english"] = generate_earnings(payment, details, dt("2026-04-02 19:10"), InstructorEarning.StatusChoices.AVAILABLE)

    payment, details = create_payment(
        users["student_nam"],
        [{"course": courses["python_advanced"], "price": money(699000), "discount": money(75000), "promotion": promotions["python_advanced"]}],
        dt("2026-03-30 20:30"),
        Payment.PaymentMethod.VNPAY,
    )
    payments["nam_python_advanced"] = payment
    [enrollments["nam_python_advanced"]] = create_purchase_enrollments(payment, details, dt("2026-03-30 20:35"))
    earnings["nam_python_advanced"] = generate_earnings(payment, details, dt("2026-03-30 20:40"), InstructorEarning.StatusChoices.AVAILABLE)

    payment, details = create_payment(
        users["student_thao"],
        [{"course": courses["math"], "price": money(299000), "discount": money(50000), "promotion": promotions["math"]}],
        dt("2026-04-18 09:00"),
        Payment.PaymentMethod.VNPAY,
    )
    payments["thao_math"] = payment
    [enrollments["thao_math"]] = create_purchase_enrollments(payment, details, dt("2026-04-18 09:05"))
    earnings["thao_math"] = generate_earnings(payment, details, dt("2026-04-18 09:10"), InstructorEarning.StatusChoices.AVAILABLE)

    payment, details = create_payment(
        users["student_minh"],
        [{"course": courses["video"], "price": money(429000)}],
        dt("2026-05-28 21:00"),
        Payment.PaymentMethod.MOMO,
    )
    payments["minh_video_refund"] = payment
    [enrollments["minh_video"]] = create_purchase_enrollments(payment, details, dt("2026-05-28 21:05"))
    earnings["minh_video"] = generate_earnings(payment, details, dt("2026-05-28 21:10"), InstructorEarning.StatusChoices.PENDING)

    payment, details = create_payment(
        users["student_hoa"],
        [{"course": courses["python"], "price": money(599000), "discount": money(100000), "promotion": promotions["python"]}],
        dt("2026-06-05 10:00"),
        Payment.PaymentMethod.VNPAY,
    )
    payments["hoa_python"] = payment
    [enrollments["hoa_python"]] = create_purchase_enrollments(payment, details, dt("2026-06-05 10:03"))
    earnings["hoa_python"] = generate_earnings(payment, details, dt("2026-06-05 10:08"), InstructorEarning.StatusChoices.PENDING)

    payment, details = create_payment(
        users["student_lan"],
        [{"course": courses["math"], "price": money(299000), "discount": money(50000), "promotion": promotions["math"]}],
        dt("2026-06-02 08:00"),
        Payment.PaymentMethod.MOMO,
    )
    payments["lan_math"] = payment
    [enrollments["lan_math"]] = create_purchase_enrollments(payment, details, dt("2026-06-02 08:04"))
    earnings["lan_math"] = generate_earnings(payment, details, dt("2026-06-02 08:08"), InstructorEarning.StatusChoices.PENDING)

    payment, details = create_payment(
        users["student_nam"],
        [
            {"course": courses["marketing"], "price": money(499000)},
            {"course": courses["finance"], "price": money(459000)},
        ],
        dt("2026-05-12 20:00"),
        Payment.PaymentMethod.VNPAY,
    )
    payments["nam_may_bundle"] = payment
    enrollments["nam_marketing"], enrollments["nam_finance"] = create_purchase_enrollments(payment, details, dt("2026-05-12 20:05"))
    earnings["nam_may_bundle"] = generate_earnings(payment, details, dt("2026-05-12 20:10"), InstructorEarning.StatusChoices.AVAILABLE)

    payment, details = create_payment(
        users["student_hoa"],
        [{"course": courses["english"], "price": money(399000), "discount": money(60000), "promotion": promotions["english"]}],
        dt("2026-05-22 19:30"),
        Payment.PaymentMethod.VNPAY,
        Payment.PaymentStatus.FAILED,
    )
    payments["hoa_english_failed"] = payment

    payment, details = create_payment(
        users["student_quang"],
        [{"course": courses["marketing"], "price": money(499000), "discount": money(49900), "promotion": promotions["summer"]}],
        dt("2026-06-08 18:00"),
        Payment.PaymentMethod.VNPAY,
    )
    payments["quang_marketing"] = payment
    [enrollments["quang_marketing"]] = create_purchase_enrollments(payment, details, dt("2026-06-08 18:03"))
    earnings["quang_marketing"] = generate_earnings(payment, details, dt("2026-06-08 18:08"), InstructorEarning.StatusChoices.PENDING)

    payment, details = create_payment(
        users["student_thao"],
        [{"course": courses["python"], "price": money(599000), "discount": money(100000), "promotion": promotions["python"]}],
        dt("2026-06-11 07:45"),
        Payment.PaymentMethod.MOMO,
    )
    payments["thao_python"] = payment
    [enrollments["thao_python"]] = create_purchase_enrollments(payment, details, dt("2026-06-11 07:50"))
    earnings["thao_python"] = generate_earnings(payment, details, dt("2026-06-11 07:55"), InstructorEarning.StatusChoices.PENDING)

    pending_payment, pending_details = create_payment(
        users["student_quang"],
        [{"course": courses["finance"], "price": money(459000)}],
        dt("2026-06-15 18:30"),
        Payment.PaymentMethod.VNPAY,
        Payment.PaymentStatus.PENDING,
    )
    payments["quang_finance_pending"] = pending_payment

    cancelled_payment, cancelled_details = create_payment(
        users["student_nam"],
        [{"course": courses["video"], "price": money(429000)}],
        dt("2026-06-09 22:00"),
        Payment.PaymentMethod.VNPAY,
        Payment.PaymentStatus.CANCELLED,
    )
    payments["nam_video_cancelled"] = cancelled_payment

    for promo in Promotion.objects.all():
        used = Payment_Details.objects.filter(promotion=promo, payment__payment_status__in=[Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.REFUNDED]).count()
        update_obj(promo, dt("2026-06-05 10:10"), used_count=used)

    seed_progress_and_results(users, courses, lessons_by_course, enrollments)
    certificates = seed_certificates(users, courses, enrollments)
    reviews = seed_reviews(users, courses, enrollments)
    seed_payouts(earnings)
    seed_refund_and_moderation(users, courses, payments, enrollments, earnings, certificates, reviews)
    seed_social_records(users, courses, lessons_by_course)
    return payments, enrollments, earnings


def seed_progress_and_results(users, courses, lessons_by_course, enrollments):
    complete_map = {
        "lan_marketing": dt("2026-03-15 18:00"),
        "nam_python_advanced": dt("2026-05-18 20:00"),
        "minh_finance": dt("2026-05-05 20:00"),
        "thao_math": dt("2026-05-24 10:00"),
        "minh_video": dt("2026-06-05 21:00"),
    }
    partial_progress = {
        "lan_python": (Decimal("80.00"), dt("2026-04-25 20:00")),
        "hoa_productivity": (Decimal("45.00"), dt("2026-04-10 08:00")),
        "quang_english": (Decimal("35.00"), dt("2026-05-08 21:00")),
        "nam_marketing": (Decimal("55.00"), dt("2026-06-10 20:00")),
        "nam_finance": (Decimal("35.00"), dt("2026-06-11 20:00")),
        "lan_math": (Decimal("30.00"), dt("2026-06-12 08:30")),
        "hoa_python": (Decimal("20.00"), dt("2026-06-12 12:00")),
        "quang_marketing": (Decimal("25.00"), dt("2026-06-14 19:00")),
        "thao_python": (Decimal("18.00"), dt("2026-06-16 08:00")),
    }

    enrollment_to_course_key = {
        "lan_marketing": "marketing",
        "lan_python": "python",
        "minh_finance": "finance",
        "hoa_productivity": "productivity",
        "quang_english": "english",
        "nam_python_advanced": "python_advanced",
        "thao_math": "math",
        "minh_video": "video",
        "lan_math": "math",
        "hoa_python": "python",
        "nam_marketing": "marketing",
        "nam_finance": "finance",
        "quang_marketing": "marketing",
        "thao_python": "python",
    }

    for key, enrollment in enrollments.items():
        course_key = enrollment_to_course_key[key]
        lessons = lessons_by_course[course_key]
        if key in complete_map:
            completed_at = complete_map[key]
            for idx, lesson in enumerate(lessons, start=1):
                progress = LearningProgress.objects.create(
                    user=enrollment.user,
                    enrollment=enrollment,
                    course=enrollment.course,
                    lesson=lesson,
                    progress_percentage=money(100),
                    status=LearningProgress.StatusChoices.COMPLETED,
                    start_time=enrollment.enrollment_date,
                    completion_date=completed_at.replace(hour=min(23, 8 + idx)),
                    time_spent=(lesson.duration or 8),
                    last_position=0,
                    is_completed=True,
                    notes="Hoàn thành trong seed review.",
                )
                created(progress, enrollment.enrollment_date)
                if lesson.content_type in [Lesson.ContentType.QUIZ, Lesson.ContentType.CODE]:
                    create_quiz_result(enrollment, lesson, completed_at.replace(hour=20), passed=True)
            update_obj(
                enrollment,
                completed_at,
                progress=money(100),
                status=Enrollment.Status.Complete,
                completion_date=completed_at,
                last_access_date=completed_at,
            )
        else:
            percent, last_at = partial_progress[key]
            lesson_count = max(1, int(len(lessons) * int(percent) / 100))
            for idx, lesson in enumerate(lessons[:lesson_count], start=1):
                progress = LearningProgress.objects.create(
                    user=enrollment.user,
                    enrollment=enrollment,
                    course=enrollment.course,
                    lesson=lesson,
                    progress_percentage=money(100),
                    status=LearningProgress.StatusChoices.COMPLETED,
                    start_time=enrollment.enrollment_date,
                    completion_date=last_at.replace(hour=min(23, 8 + idx)),
                    time_spent=(lesson.duration or 8),
                    last_position=0,
                    is_completed=True,
                )
                created(progress, enrollment.enrollment_date)
            if lessons[lesson_count:lesson_count + 1]:
                lesson = lessons[lesson_count]
                progress = LearningProgress.objects.create(
                    user=enrollment.user,
                    enrollment=enrollment,
                    course=enrollment.course,
                    lesson=lesson,
                    progress_percentage=money(35),
                    status=LearningProgress.StatusChoices.IN_PROGRESS,
                    start_time=last_at,
                    time_spent=5,
                    last_position=180,
                    is_completed=False,
                )
                created(progress, last_at)
            progress_rows = LearningProgress.objects.filter(enrollment=enrollment, is_deleted=False)
            progress_total = sum((row.progress_percentage for row in progress_rows), money(0))
            computed_progress = (progress_total / Decimal(len(lessons))).quantize(Decimal("0.01"))
            update_obj(enrollment, last_at, progress=computed_progress, last_access_date=last_at)


def create_quiz_result(enrollment, lesson, at, passed=True):
    questions = list(lesson.quiz_question_lesson.filter(is_deleted=False))
    if not questions:
        return None
    total_points = sum(question.points for question in questions)
    correct = len(questions) if passed else max(0, len(questions) - 1)
    result = QuizResult.objects.create(
        enrollment=enrollment,
        lesson=lesson,
        start_time=at.replace(minute=0),
        submit_time=at,
        time_taken=600,
        total_questions=len(questions),
        correct_answers=correct,
        total_points=total_points,
        score=money(92 if passed else 60),
        answers=[{"question_id": question.id, "correct": passed} for question in questions],
        passed=passed,
        attempt=1,
    )
    created(result, at)
    return result


def seed_certificates(users, courses, enrollments):
    certificate_specs = {
        "lan_marketing": dt("2026-03-16 09:00"),
        "nam_python_advanced": dt("2026-05-19 09:00"),
        "minh_finance": dt("2026-05-06 09:00"),
        "thao_math": dt("2026-05-25 09:00"),
        "minh_video": dt("2026-06-06 09:00"),
    }
    certificates = {}
    for key, issued_at in certificate_specs.items():
        enrollment = enrollments[key]
        cert = Certificate.objects.create(
            user=enrollment.user,
            course=enrollment.course,
            enrollment=enrollment,
            verification_code=str(uuid.uuid4()),
            certificate_url=f"https://certificates.example.com/{enrollment.user.username}/{enrollment.course_id}.pdf",
            student_name=enrollment.user.full_name,
            course_title=enrollment.course.title,
            instructor_name=enrollment.course.instructor.user.full_name,
            completion_date=enrollment.completion_date or issued_at,
        )
        created(cert, issued_at)
        update_obj(enrollment, issued_at, certificate=cert.verification_code, certificate_issue_date=issued_at)
        certificates[key] = cert
    return certificates


def seed_reviews(users, courses, enrollments):
    specs = [
        ("lan_marketing", 5, "Nội dung marketing có ví dụ thực tế, dễ áp dụng.", dt("2026-03-17 20:00")),
        ("lan_python", 4, "Bài Python dễ hiểu, phần code quiz rất hữu ích.", dt("2026-04-26 21:00")),
        ("nam_python_advanced", 5, "Phần debug và generator giúp tôi hiểu vì sao code chạy tốn RAM.", dt("2026-05-20 20:30")),
        ("minh_finance", 5, "Giúp tôi lập lại ngân sách cá nhân rõ ràng hơn.", dt("2026-05-07 21:00")),
        ("thao_math", 5, "Bài toán mẫu ngắn, dễ luyện lại trước khi kiểm tra.", dt("2026-05-26 20:00")),
        ("hoa_productivity", 5, "Khóa miễn phí nhưng rất chỉn chu, time blocking dùng được ngay.", dt("2026-04-12 08:30")),
        ("quang_english", 4, "Phần luyện nói theo tình huống khá sát nhu cầu đi làm.", dt("2026-05-09 21:15")),
        ("lan_math", 4, "Course Toán mới học được một phần nhưng cách trình bày rõ ràng.", dt("2026-06-12 09:00")),
        ("minh_video", 2, "Bài thực hành có đoạn clip bị nghi dùng lại chưa rõ bản quyền.", dt("2026-06-07 22:00")),
    ]
    reviews = {}
    for enrollment_key, rating, comment, at in specs:
        enrollment = enrollments[enrollment_key]
        review = Review.objects.create(
            course=enrollment.course,
            user=enrollment.user,
            rating=rating,
            comment=comment,
            status=Review.StatusChoices.APPROVED,
            likes=2 if rating >= 4 else 0,
        )
        created(review, at)
        reviews[enrollment_key] = review
    recalc_all_courses()
    return reviews


def seed_payouts(earnings):
    def create_payout(group, period, requested_at, processed_at):
        instructor_groups = {}
        for earning in group:
            instructor_groups.setdefault(earning.instructor, []).append(earning)

        for instructor, instructor_earnings in instructor_groups.items():
            total = sum((earning.net_amount for earning in instructor_earnings), money(0))
            payout = InstructorPayout.objects.create(
                instructor=instructor,
                amount=total,
                fee=money(0),
                net_amount=total,
                payment_method=InstructorPayoutMethod.MethodType.BANK_TRANSFER,
                transaction_id=f"PAYOUT-{period.replace('-', '')}-{instructor.id}",
                status=InstructorPayout.PayoutStatusChoices.PROCESSED,
                processed_date=processed_at,
                period=period,
                notes="Chi trả doanh thu các giao dịch đã qua thời hạn hoàn tiền.",
            )
            created(payout, requested_at)
            update_obj(payout, processed_at, processed_date=processed_at)
            for earning in instructor_earnings:
                update_obj(
                    earning,
                    processed_at,
                    status=InstructorEarning.StatusChoices.PAID,
                    instructor_payout=payout,
                )

    create_payout(
        earnings["lan_bundle"] + earnings["minh_finance"],
        "2026-04",
        dt("2026-04-30 16:00"),
        dt("2026-04-30 17:00"),
    )
    create_payout(
        earnings["nam_python_advanced"] + earnings["thao_math"] + earnings["nam_may_bundle"],
        "2026-06",
        dt("2026-06-17 15:00"),
        dt("2026-06-17 16:00"),
    )


def seed_refund_and_moderation(users, courses, payments, enrollments, earnings, certificates, reviews):
    hold_report = Report.objects.create(
        reporter=users["student_lan"],
        target_type=Report.TargetType.COURSE,
        target_id=courses["english"].id,
        reason=Report.Reason.COPYRIGHT,
        description="Một số slide luyện thi có dấu hiệu trùng tài liệu thương mại.",
        status=Report.Status.REVIEWING,
        metadata={"course_id": courses["english"].id},
    )
    created(hold_report, dt("2026-06-10 09:00"))
    hold_case = CopyrightCase.objects.create(
        target_type=Report.TargetType.COURSE,
        target_id=courses["english"].id,
        source_report=hold_report,
        course=courses["english"],
        instructor=courses["english"].instructor,
        status=CopyrightCase.Status.UNDER_REVIEW,
        severity=CopyrightCase.Severity.MEDIUM,
        content_action=CopyrightCase.ContentAction.SALE_SUSPENDED,
        financial_action=CopyrightCase.FinancialAction.HOLD,
        created_by=users["student_lan"],
        last_action_by=users["admin"],
    )
    created(hold_case, dt("2026-06-10 09:10"))
    message = CopyrightCaseMessage.objects.create(
        case=hold_case,
        actor=users["student_lan"],
        actor_role=CopyrightCaseMessage.ActorRole.REPORTER,
        message=hold_report.description,
        response_type="initial_report",
        metadata={"report_id": hold_report.id},
    )
    created(message, dt("2026-06-10 09:11"))
    message = CopyrightCaseMessage.objects.create(
        case=hold_case,
        actor=users["admin"],
        actor_role=CopyrightCaseMessage.ActorRole.ADMIN,
        message="Tạm ngừng bán khóa học trong lúc xác minh tài liệu.",
        response_type="suspend_sale",
        metadata={"financial": {"held_count": 1}},
    )
    created(message, dt("2026-06-10 09:15"))
    update_obj(courses["english"], dt("2026-06-10 09:15"), admin_hidden=True)
    english_earning = earnings["quang_english"][0]
    hold = InstructorEarningHold.objects.create(
        case=hold_case,
        earning=english_earning,
        course=courses["english"],
        instructor=courses["english"].instructor,
        status=InstructorEarningHold.Status.ACTIVE,
        reason="Tạm giữ doanh thu do report bản quyền đang review.",
        created_by=users["admin"],
    )
    created(hold, dt("2026-06-10 09:20"))

    refund_report = Report.objects.create(
        reporter=users["student_minh"],
        target_type=Report.TargetType.COURSE,
        target_id=courses["video"].id,
        reason=Report.Reason.COPYRIGHT,
        description="Bài đếm ngược có dấu hiệu dùng asset không được cấp phép.",
        status=Report.Status.RESOLVED,
        action_taken="copyright_takedown",
        resolved_by=users["admin"],
        resolved_at=dt("2026-06-12 16:30"),
        resolution_notes="Xác nhận vi phạm, gỡ khóa và hoàn tiền.",
    )
    created(refund_report, dt("2026-06-12 10:00"))
    case = CopyrightCase.objects.create(
        target_type=Report.TargetType.COURSE,
        target_id=courses["video"].id,
        source_report=refund_report,
        course=courses["video"],
        instructor=courses["video"].instructor,
        status=CopyrightCase.Status.TAKEDOWN,
        severity=CopyrightCase.Severity.CONFIRMED,
        content_action=CopyrightCase.ContentAction.TAKEDOWN,
        financial_action=CopyrightCase.FinancialAction.ADJUSTED,
        created_by=users["student_minh"],
        last_action_by=users["admin"],
        resolved_by=users["admin"],
        resolved_at=dt("2026-06-12 16:30"),
    )
    created(case, dt("2026-06-12 10:10"))
    message = CopyrightCaseMessage.objects.create(
        case=case,
        actor=users["admin"],
        actor_role=CopyrightCaseMessage.ActorRole.ADMIN,
        message="Xác nhận vi phạm, hard-block khóa học và tạo hoàn tiền toàn phần.",
        response_type="takedown",
        metadata={"refund": {"status": "success"}},
    )
    created(message, dt("2026-06-12 16:30"))
    strike = InstructorStrike.objects.create(
        instructor=courses["video"].instructor,
        source_case=case,
        reason="Takedown do vi phạm bản quyền trong khóa dựng video.",
        severity="copyright",
        created_by=users["admin"],
    )
    created(strike, dt("2026-06-12 16:35"))
    update_obj(
        courses["video"],
        dt("2026-06-12 16:30"),
        admin_hidden=True,
        is_hard_blocked=True,
        status=Course.Status.PUBLISHED,
    )

    payment = payments["minh_video_refund"]
    detail = payment.payment_details.get(course=courses["video"])
    refund_request_time = dt("2026-06-12 16:40")
    refund_date = dt("2026-06-13 09:05")
    refund_transaction_id = f"RF-{payment.transaction_id}"
    update_obj(
        detail,
        refund_date,
        refund_status=Payment_Details.RefundStatus.SUCCESS,
        refund_request_time=refund_request_time,
        refund_amount=detail.final_price,
        refund_reason="Hoàn tiền cưỡng chế do khóa học bị takedown bản quyền.",
        refund_date=refund_date,
        refund_transaction_id=refund_transaction_id,
        refund_response_code="00",
        gateway_attempt_count=1,
        last_gateway_attempt_at=refund_date,
        processed_by=Admin.objects.get(user=users["admin"]),
        refund_timeline=[
            {"event": "refund_requested", "actor": f"admin:{users['admin'].admin.id}", "timestamp": refund_request_time.isoformat()},
            {"event": "gateway_success", "actor": "momo", "timestamp": refund_date.isoformat(), "metadata": {"transaction_id": refund_transaction_id}},
        ],
    )
    update_obj(
        payment,
        refund_date,
        payment_status=Payment.PaymentStatus.REFUNDED,
        refund_amount=detail.final_price,
        gateway_response="00|seeded_refund_success",
    )
    enrollment = enrollments["minh_video"]
    update_obj(
        enrollment,
        refund_date,
        status=Enrollment.Status.Cancelled,
        expiry_date=refund_date,
        last_access_date=refund_date,
    )
    earning = earnings["minh_video"][0]
    update_obj(earning, refund_date, status=InstructorEarning.StatusChoices.CANCELLED)
    cert = certificates["minh_video"]
    update_obj(cert, refund_date, revoked=True, revoked_at=refund_date, revoked_by=users["admin"])
    review = reviews["minh_video"]
    update_obj(review, refund_date, is_deleted=True, deleted_at=refund_date, deleted_by=users["admin"])
    recalc_all_courses()


def seed_social_records(users, courses, lessons_by_course):
    cart = Cart.objects.create(user=users["student_lan"], course=courses["english"])
    created(cart, dt("2026-06-16 20:00"))
    wishlist = Wishlist.objects.create(user=users["student_quang"], course=courses["marketing"])
    created(wishlist, dt("2026-06-16 20:05"))

    question = Question.objects.create(
        title="Nên bắt đầu Python bằng bài tập nào?",
        content="Em đã xem bài biến và kiểu dữ liệu, nên luyện dạng bài nào trước?",
        author=users["student_hoa"],
        tags=["python", "beginner"],
        views=12,
        score=3,
    )
    created(question, dt("2026-06-13 09:00"))
    answer = question.answers_question.create(
        content="Hãy bắt đầu với bài nhập hai số và in tổng, sau đó luyện điều kiện if/else.",
        author=courses["python"].instructor.user,
        is_accepted=True,
        score=5,
    )
    created(answer, dt("2026-06-13 11:00"))
    update_obj(question, dt("2026-06-13 11:05"), answer_count=1)

    lesson = next(item for item in lessons_by_course["python"] if item.content_type == Lesson.ContentType.VIDEO)
    comment = LessonComment.objects.create(
        lesson=lesson,
        user=users["student_hoa"],
        content="Phần giải thích kiểu dữ liệu rõ hơn các tài liệu em từng đọc.",
        status="active",
    )
    created(comment, dt("2026-06-13 12:00"))


def seed_activity_and_notifications(users, courses, payments):
    entries = [
        (users["admin"], "CREATE", "RegistrationForm", 1, "Tạo form đăng ký giảng viên", dt("2026-01-02 09:30")),
        (users["instructor_linh"], "CREATE", "Course", courses["marketing"].id, "Tạo khóa Digital Marketing", dt("2026-01-14 09:00")),
        (users["admin"], "COURSE_APPROVED", "Course", courses["marketing"].id, "Duyệt khóa Digital Marketing", dt("2026-01-20 10:00")),
        (users["student_lan"], "PAYMENT_SUCCESS", "Payment", payments["lan_bundle"].id, "Thanh toán combo Marketing + Python thành công", dt("2026-01-30 09:15")),
        (users["student_minh"], "REFUND_APPROVED", "Payment", payments["minh_video_refund"].id, "Hoàn tiền khóa dựng video do takedown", dt("2026-06-13 09:05")),
    ]
    for user, action, entity_type, entity_id, description, at in entries:
        log = ActivityLog.objects.create(
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            trace_id=uuid.uuid4(),
            ip_address="127.0.0.1",
            user_agent="seed-review-data",
        )
        created(log, at)

    notifications = [
        (users["student_lan"], "Thanh toán thành công", "Bạn đã sở hữu combo Marketing + Python.", "payment", payments["lan_bundle"].id, dt("2026-01-30 09:16")),
        (users["instructor_linh"], "Có học viên mới", "Lan vừa ghi danh vào khóa học của bạn.", "course", courses["marketing"].id, dt("2026-01-30 09:21")),
        (users["student_minh"], "Chứng chỉ đã bị thu hồi", "Chứng chỉ khóa dựng video bị thu hồi sau hoàn tiền.", "course", courses["video"].id, dt("2026-06-13 09:06")),
        (users["instructor_an"], "Doanh thu đang bị giữ", "Doanh thu khóa tiếng Anh bị tạm giữ do report bản quyền.", "system", courses["english"].id, dt("2026-06-10 09:30")),
    ]
    for receiver, title, message, type_, related_id, at in notifications:
        notification = Notification.objects.create(
            receiver=receiver,
            sender=users["admin"] if type_ in {"system", "course"} else None,
            title=title,
            message=message,
            type=type_,
            related_id=related_id,
            notification_code=normalize(title).replace(" ", "_"),
            metadata={"seeded": True},
        )
        created(notification, at)


def recalc_all_courses():
    for course in Course.objects.filter(is_deleted=False):
        lessons = Lesson.objects.filter(coursemodule__course=course, is_deleted=False)
        modules = CourseModule.objects.filter(course=course, is_deleted=False)
        total_duration = sum((lesson.duration or 0 for lesson in lessons), 0)
        review_agg = Review.objects.filter(course=course, is_deleted=False).exclude(
            status=Review.StatusChoices.REJECTED
        ).aggregate(avg=Avg("rating"), count=Count("id"))
        student_count = Enrollment.objects.filter(
            course=course,
            is_deleted=False,
            status__in=OWNED_ENROLLMENT_STATUSES,
        ).count()
        Course.objects.filter(pk=course.pk).update(
            total_lessons=lessons.count(),
            total_modules=modules.count(),
            duration=total_duration or None,
            rating=money(round(float(review_agg["avg"]), 2)) if review_agg["avg"] else money(0),
            total_reviews=review_agg["count"] or 0,
            total_students=student_count,
        )
        for module in modules:
            module_lessons = lessons.filter(coursemodule=module)
            module_duration = sum((lesson.duration or 0 for lesson in module_lessons), 0)
            CourseModule.objects.filter(pk=module.pk).update(duration=module_duration or None)

    for instructor in Instructor.objects.select_related("user"):
        course_ids = Course.objects.filter(instructor=instructor, is_deleted=False).values_list("id", flat=True)
        active_students = Enrollment.objects.filter(
            course_id__in=course_ids,
            is_deleted=False,
            status__in=OWNED_ENROLLMENT_STATUSES,
        ).values("user_id").distinct().count()
        ratings = Review.objects.filter(course_id__in=course_ids, is_deleted=False).exclude(
            status=Review.StatusChoices.REJECTED
        ).aggregate(avg=Avg("rating"))
        Instructor.objects.filter(pk=instructor.pk).update(
            total_courses=Course.objects.filter(instructor=instructor, is_deleted=False, status=Course.Status.PUBLISHED).count(),
            total_students=active_students,
            rating=money(round(float(ratings["avg"]), 2)) if ratings["avg"] else money(0),
        )


def validate_business_rules():
    errors = []

    for model in project_models():
        for field in model._meta.fields:
            if not field.choices:
                continue
            valid_values = {choice[0] for choice in field.choices}
            invalid_rows = (
                model.objects.exclude(**{f"{field.name}__in": valid_values})
                .exclude(**{f"{field.name}__isnull": True})
                .values_list("pk", field.name)[:10]
            )
            for pk, value in invalid_rows:
                errors.append(f"{model.__name__} #{pk} có {field.name}='{value}' không thuộc choices.")

    if PlatformSetting.objects.count() != 1:
        errors.append("PlatformSetting phải có đúng một bản ghi singleton.")
    if PaymentSetting.objects.count() != 1:
        errors.append("PaymentSetting phải có đúng một bản ghi singleton.")

    for admin in Admin.objects.select_related("user"):
        if not admin.user or admin.user.is_deleted:
            errors.append(f"Admin #{admin.id} không có user hợp lệ.")
    for instructor in Instructor.objects.select_related("user", "level"):
        if not instructor.user or instructor.user.is_deleted:
            errors.append(f"Instructor #{instructor.id} không có user hợp lệ.")
        if not instructor.level:
            errors.append(f"Instructor #{instructor.id} không có level.")

    for lesson in Lesson.objects.prefetch_related("quiz_question_lesson__test_cases"):
        active_questions = [question for question in lesson.quiz_question_lesson.all() if not question.is_deleted]
        code_questions = [
            question
            for question in active_questions
            if question.question_type == QuizQuestion.QuestionType.CODE
        ]
        quiz_questions = [
            question
            for question in active_questions
            if question.question_type != QuizQuestion.QuestionType.CODE
        ]
        if lesson.content_type == Lesson.ContentType.VIDEO and active_questions:
            errors.append(f"Video lesson #{lesson.id} không được có quiz/code question.")
        if lesson.content_type == Lesson.ContentType.QUIZ:
            if code_questions:
                errors.append(f"Quiz lesson #{lesson.id} đang chứa code question.")
            if len(quiz_questions) < 2:
                errors.append(f"Quiz lesson #{lesson.id} phải có ít nhất 2 câu hỏi quiz.")
        if lesson.content_type == Lesson.ContentType.CODE:
            if quiz_questions:
                errors.append(f"Code lesson #{lesson.id} đang chứa câu hỏi quiz thường.")
            if len(code_questions) != 1:
                errors.append(f"Code lesson #{lesson.id} phải có đúng 1 code question.")
            for question in code_questions:
                active_test_cases = [case for case in question.test_cases.all() if not case.is_deleted]
                if not active_test_cases:
                    errors.append(f"Code question #{question.id} phải có test case.")

    for enrollment in Enrollment.objects.select_related("course", "payment", "user"):
        if enrollment.course and enrollment.course.published_date and enrollment.enrollment_date:
            if enrollment.enrollment_date < enrollment.course.published_date:
                errors.append(f"Enrollment #{enrollment.id} xảy ra trước khi course được publish.")
        if enrollment.source == Enrollment.Source.PURCHASE:
            if not enrollment.payment:
                errors.append(f"Enrollment #{enrollment.id} là purchase nhưng thiếu payment.")
            elif enrollment.course and not Payment_Details.objects.filter(payment=enrollment.payment, course=enrollment.course).exists():
                errors.append(f"Enrollment #{enrollment.id} không có payment detail cho course.")
        if enrollment.source == Enrollment.Source.GRANTED:
            if enrollment.payment_id:
                errors.append(f"Enrollment miễn phí #{enrollment.id} không được có payment.")
            if enrollment.course and enrollment.course.price > 0:
                errors.append(f"Enrollment granted #{enrollment.id} đang trỏ đến khóa trả phí.")
        if enrollment.payment and enrollment.enrollment_date and enrollment.payment.payment_date:
            if enrollment.enrollment_date < enrollment.payment.payment_date:
                errors.append(f"Enrollment #{enrollment.id} xảy ra trước payment.")
        if enrollment.status == Enrollment.Status.Complete:
            if enrollment.progress != money(100) or not enrollment.completion_date:
                errors.append(f"Enrollment #{enrollment.id} complete nhưng progress/completion_date không hợp lệ.")
        if enrollment.status == Enrollment.Status.Cancelled:
            if not enrollment.expiry_date:
                errors.append(f"Enrollment #{enrollment.id} cancelled nhưng thiếu expiry_date.")
            if enrollment.payment and enrollment.payment.payment_status != Payment.PaymentStatus.REFUNDED:
                errors.append(f"Enrollment #{enrollment.id} cancelled nhưng payment chưa refunded.")
        if enrollment.course:
            course_lessons = Lesson.objects.filter(coursemodule__course=enrollment.course, is_deleted=False).count()
            if course_lessons:
                progress_total = LearningProgress.objects.filter(
                    enrollment=enrollment,
                    user=enrollment.user,
                    course=enrollment.course,
                    is_deleted=False,
                ).aggregate(total=Sum("progress_percentage"))["total"] or money(0)
                expected_progress = (progress_total / Decimal(course_lessons)).quantize(Decimal("0.01"))
                if enrollment.progress != expected_progress:
                    errors.append(f"Enrollment #{enrollment.id} progress snapshot không khớp LearningProgress.")

    for progress in LearningProgress.objects.select_related("enrollment__course", "course", "lesson__coursemodule__course", "user"):
        if progress.enrollment.user_id != progress.user_id:
            errors.append(f"LearningProgress #{progress.id} user không khớp enrollment.")
        if progress.enrollment.course_id != progress.course_id:
            errors.append(f"LearningProgress #{progress.id} course không khớp enrollment.")
        if progress.lesson.coursemodule.course_id != progress.course_id:
            errors.append(f"LearningProgress #{progress.id} lesson không thuộc course.")
        if progress.start_time and progress.enrollment.enrollment_date and progress.start_time < progress.enrollment.enrollment_date:
            errors.append(f"LearningProgress #{progress.id} bắt đầu trước enrollment.")
        if progress.progress_percentage < 0 or progress.progress_percentage > 100:
            errors.append(f"LearningProgress #{progress.id} progress_percentage ngoài 0-100.")
        if progress.status == LearningProgress.StatusChoices.COMPLETED:
            if not progress.is_completed or progress.progress_percentage != money(100) or not progress.completion_date:
                errors.append(f"LearningProgress #{progress.id} completed nhưng trạng thái phụ không khớp.")
            if progress.completion_date and progress.start_time and progress.completion_date < progress.start_time:
                errors.append(f"LearningProgress #{progress.id} completion_date trước start_time.")
        if progress.status == LearningProgress.StatusChoices.IN_PROGRESS:
            if progress.is_completed or progress.progress_percentage <= 0 or progress.progress_percentage >= 100:
                errors.append(f"LearningProgress #{progress.id} in-progress nhưng progress/is_completed không khớp.")

    for result in QuizResult.objects.select_related("enrollment__course", "lesson__coursemodule__course"):
        if result.lesson.coursemodule.course_id != result.enrollment.course_id:
            errors.append(f"QuizResult #{result.id} lesson không thuộc enrollment course.")
        if result.lesson.content_type not in [Lesson.ContentType.QUIZ, Lesson.ContentType.CODE]:
            errors.append(f"QuizResult #{result.id} không gắn với quiz/code lesson.")
        questions = list(result.lesson.quiz_question_lesson.filter(is_deleted=False))
        expected_points = sum((question.points for question in questions), 0)
        if result.total_questions != len(questions):
            errors.append(f"QuizResult #{result.id} total_questions không khớp câu hỏi thật.")
        if result.total_points != expected_points:
            errors.append(f"QuizResult #{result.id} total_points không khớp câu hỏi thật.")
        if result.correct_answers is not None and result.total_questions is not None and result.correct_answers > result.total_questions:
            errors.append(f"QuizResult #{result.id} correct_answers lớn hơn total_questions.")
        if result.score is not None and (result.score < 0 or result.score > 100):
            errors.append(f"QuizResult #{result.id} score ngoài 0-100.")
        if result.passed and result.score is not None and result.score < 70:
            errors.append(f"QuizResult #{result.id} passed nhưng score dưới passing score.")
        if result.start_time and result.enrollment.enrollment_date and result.start_time < result.enrollment.enrollment_date:
            errors.append(f"QuizResult #{result.id} bắt đầu trước enrollment.")
        if result.start_time and result.submit_time and result.submit_time < result.start_time:
            errors.append(f"QuizResult #{result.id} submit_time trước start_time.")

    for transcript in LessonTranscript.objects.prefetch_related("segments__words").select_related("lesson"):
        if transcript.lesson.content_type != Lesson.ContentType.VIDEO:
            errors.append(f"Transcript #{transcript.id} không gắn với video lesson.")
        expected_snapshot = get_lesson_source_snapshot(transcript.lesson)
        if transcript.source_video_url_snapshot != expected_snapshot:
            errors.append(f"Transcript #{transcript.id} source snapshot không khớp lesson video hiện tại.")
        if transcript.status == LessonTranscript.Status.PUBLISHED and not transcript.published_at:
            errors.append(f"Transcript #{transcript.id} published nhưng thiếu published_at.")
        for segment in transcript.segments.all():
            if segment.end_ms <= segment.start_ms:
                errors.append(f"Transcript segment #{segment.id} end_ms không sau start_ms.")
            for word in segment.words.all():
                if word.end_ms <= word.start_ms:
                    errors.append(f"Transcript word #{word.id} end_ms không sau start_ms.")
                if word.start_ms < segment.start_ms or word.end_ms > segment.end_ms:
                    errors.append(f"Transcript word #{word.id} nằm ngoài segment.")

    for payment in Payment.objects.select_related("user"):
        details = list(payment.payment_details.select_related("course__instructor"))
        if payment.payment_type == Payment.PaymentType.COURSE_PURCHASE and not details:
            errors.append(f"Payment #{payment.id} không có sản phẩm.")
        if not payment.user:
            errors.append(f"Payment #{payment.id} không có người mua.")
        detail_total = sum((detail.final_price for detail in details), money(0))
        if detail_total != payment.total_amount:
            errors.append(f"Payment #{payment.id} total_amount không khớp tổng detail.")
        success_refund_total = sum(
            (
                detail.refund_amount or money(0)
                for detail in details
                if detail.refund_status == Payment_Details.RefundStatus.SUCCESS
            ),
            money(0),
        )
        if payment.refund_amount != success_refund_total:
            errors.append(f"Payment #{payment.id} refund_amount không khớp tổng refund success.")
        if payment.payment_status == Payment.PaymentStatus.REFUNDED and payment.refund_amount < payment.total_amount:
            errors.append(f"Payment #{payment.id} refunded nhưng refund_amount chưa đủ total_amount.")
        if payment.payment_status != Payment.PaymentStatus.REFUNDED and payment.refund_amount >= payment.total_amount:
            errors.append(f"Payment #{payment.id} chưa refunded nhưng refund_amount đã đủ total_amount.")
        for detail in details:
            if not detail.course or not detail.course.instructor:
                errors.append(f"Payment detail #{detail.id} thiếu course hoặc người bán.")
            if detail.course and detail.course.price <= 0:
                errors.append(f"Payment detail #{detail.id} đang bán khóa miễn phí.")
            if detail.discount < 0 or detail.final_price <= 0 or detail.final_price != detail.price - detail.discount:
                errors.append(f"Payment detail #{detail.id} discount/final_price không hợp lệ.")
            if detail.promotion:
                promo = detail.promotion
                if promo.status != Promotion.StatusChoices.ACTIVE:
                    errors.append(f"Payment detail #{detail.id} dùng promotion không active.")
                if payment.payment_date and not (promo.start_date <= payment.payment_date <= promo.end_date):
                    errors.append(f"Payment detail #{detail.id} dùng promotion ngoài thời gian hiệu lực.")
                if detail.price < promo.min_purchase:
                    errors.append(f"Payment detail #{detail.id} chưa đạt min_purchase của promotion.")
                if promo.discount_type == Promotion.DiscountTypeChoices.PERCENTAGE:
                    expected_discount = (detail.price * promo.discount_value / money("100.00")).quantize(Decimal("0.01"))
                    if promo.max_discount is not None:
                        expected_discount = min(expected_discount, promo.max_discount)
                    if detail.discount != expected_discount:
                        errors.append(f"Payment detail #{detail.id} discount không khớp promotion percentage.")
                if promo.discount_type == Promotion.DiscountTypeChoices.FIXED_AMOUNT and detail.discount != promo.discount_value:
                    errors.append(f"Payment detail #{detail.id} discount không khớp promotion fixed.")
                if promo.applicable_courses.exists() and not promo.applicable_courses.filter(pk=detail.course_id).exists():
                    errors.append(f"Payment detail #{detail.id} dùng promotion không áp dụng cho course.")
                if promo.applicable_categories.exists() and detail.course:
                    category_ids = {detail.course.category_id, detail.course.subcategory_id}
                    if detail.course.subcategory and detail.course.subcategory.parent_category_id:
                        category_ids.add(detail.course.subcategory.parent_category_id)
                    if not promo.applicable_categories.filter(pk__in=category_ids).exists():
                        errors.append(f"Payment detail #{detail.id} dùng promotion không áp dụng cho category.")
                if promo.instructor_id and detail.course and promo.instructor_id != detail.course.instructor_id:
                    errors.append(f"Payment detail #{detail.id} dùng promotion sai instructor.")
                if promo.admin_id is None and promo.instructor_id is None:
                    errors.append(f"Payment detail #{detail.id} dùng promotion thiếu owner admin/instructor.")
            if detail.course and (detail.course.admin_hidden or detail.course.is_hard_blocked):
                blocked_at = detail.course.updated_at
                if payment.payment_date and blocked_at and payment.payment_date > blocked_at:
                    errors.append(f"Payment detail #{detail.id} xảy ra sau khi course bị khóa/ẩn.")
            has_enrollment = Enrollment.objects.filter(
                user=payment.user,
                course=detail.course,
                payment=payment,
                is_deleted=False,
            ).exists()
            has_earning = InstructorEarning.objects.filter(
                payment=payment,
                course=detail.course,
                is_deleted=False,
            ).exists()
            if payment.payment_status in [Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.REFUNDED]:
                if not has_enrollment:
                    errors.append(f"Payment detail #{detail.id} đã thanh toán nhưng thiếu enrollment.")
                if not has_earning:
                    errors.append(f"Payment detail #{detail.id} đã thanh toán nhưng thiếu earning.")
            else:
                if has_enrollment:
                    errors.append(f"Payment detail #{detail.id} chưa completed/refunded nhưng đã có enrollment.")
                if has_earning:
                    errors.append(f"Payment detail #{detail.id} chưa completed/refunded nhưng đã có earning.")
            if detail.refund_request_time and not detail.refund_amount:
                errors.append(f"Refund detail #{detail.id} có request nhưng thiếu refund_amount.")
            if detail.refund_status == Payment_Details.RefundStatus.SUCCESS and not detail.refund_transaction_id:
                errors.append(f"Refund detail #{detail.id} success nhưng thiếu refund_transaction_id.")
            if detail.refund_status == Payment_Details.RefundStatus.SUCCESS:
                if payment.payment_status != Payment.PaymentStatus.REFUNDED:
                    errors.append(f"Refund detail #{detail.id} success nhưng payment chưa refunded.")
                if detail.refund_amount != detail.final_price:
                    errors.append(f"Refund detail #{detail.id} không hoàn đúng final_price.")
                if detail.refund_request_time and detail.refund_date and detail.refund_date < detail.refund_request_time:
                    errors.append(f"Refund detail #{detail.id} có refund_date trước request_time.")

    for promo in Promotion.objects.all():
        used_count = Payment_Details.objects.filter(
            promotion=promo,
            payment__payment_status__in=[Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.REFUNDED],
        ).count()
        if promo.used_count != used_count:
            errors.append(f"Promotion {promo.code} used_count không khớp payment detail.")

    for earning in InstructorEarning.objects.select_related("payment", "course__instructor", "instructor"):
        if not earning.payment and not earning.user_subscription:
            errors.append(f"Earning #{earning.id} không có nguồn giao dịch.")
        if earning.payment and not Payment_Details.objects.filter(payment=earning.payment, course=earning.course).exists():
            errors.append(f"Earning #{earning.id} không có payment detail tương ứng.")
        if earning.payment and earning.payment.payment_status not in [Payment.PaymentStatus.COMPLETED, Payment.PaymentStatus.REFUNDED]:
            errors.append(f"Earning #{earning.id} trỏ đến payment chưa hoàn tất.")
        if earning.course and earning.course.instructor_id != earning.instructor_id:
            errors.append(f"Earning #{earning.id} instructor không khớp người bán của course.")
        if earning.instructor and earning.instructor.level:
            expected_platform_rate = earning.instructor.level.commission_rate
            expected_share_rate = money("100.00") - expected_platform_rate
            if earning.platform_commission_rate != expected_platform_rate:
                errors.append(f"Earning #{earning.id} commission snapshot không khớp level hiện tại.")
            if earning.instructor_share_rate != expected_share_rate:
                errors.append(f"Earning #{earning.id} share snapshot không khớp level hiện tại.")
            if earning.instructor_level_id_snapshot != earning.instructor.level_id:
                errors.append(f"Earning #{earning.id} level id snapshot không khớp level thật.")
            if earning.instructor_level_name_snapshot != earning.instructor.level.name:
                errors.append(f"Earning #{earning.id} level name snapshot không khớp level thật.")
        if earning.payment and earning.earning_date and earning.payment.payment_date:
            if earning.earning_date < earning.payment.payment_date:
                errors.append(f"Earning #{earning.id} xảy ra trước payment.")
        if earning.status == InstructorEarning.StatusChoices.PAID and not earning.instructor_payout_id:
            errors.append(f"Earning #{earning.id} PAID nhưng thiếu payout.")
        if earning.status != InstructorEarning.StatusChoices.PAID and earning.instructor_payout_id:
            errors.append(f"Earning #{earning.id} chưa PAID nhưng đã gắn payout.")

    for payout in InstructorPayout.objects.prefetch_related("earnings"):
        if payout.status == InstructorPayout.PayoutStatusChoices.PROCESSED and payout.processed_date is None:
            errors.append(f"Payout #{payout.id} processed nhưng thiếu processed_date.")
        earning_total = sum((earning.net_amount for earning in payout.earnings.all()), money(0))
        if payout.amount != earning_total:
            errors.append(f"Payout #{payout.id} amount không khớp tổng earning.")
        if payout.net_amount != payout.amount - payout.fee:
            errors.append(f"Payout #{payout.id} net_amount không khớp amount-fee.")
        for earning in payout.earnings.all():
            if earning.status != InstructorEarning.StatusChoices.PAID:
                errors.append(f"Payout #{payout.id} chứa earning #{earning.id} chưa PAID.")
            if earning.earning_date and payout.processed_date and earning.earning_date > payout.processed_date:
                errors.append(f"Payout #{payout.id} xảy ra trước earning #{earning.id}.")

    for course in Course.objects.filter(is_hard_blocked=True):
        active_enrollments = Enrollment.objects.filter(
            course=course,
            status__in=[Enrollment.Status.Active, Enrollment.Status.Complete, Enrollment.Status.SUSPENDED],
            is_deleted=False,
        ).count()
        if active_enrollments:
            errors.append(f"Course #{course.id} hard-blocked nhưng còn enrollment đang sở hữu.")

    for cert in Certificate.objects.select_related("enrollment"):
        if cert.user_id != cert.enrollment.user_id or cert.course_id != cert.enrollment.course_id:
            errors.append(f"Certificate #{cert.id} user/course không khớp enrollment.")
        if cert.student_name != cert.enrollment.user.full_name:
            errors.append(f"Certificate #{cert.id} student_name snapshot không khớp user.")
        if cert.course_title != cert.enrollment.course.title:
            errors.append(f"Certificate #{cert.id} course_title snapshot không khớp course.")
        expected_instructor_name = cert.enrollment.course.instructor.user.full_name if cert.enrollment.course.instructor else None
        if cert.instructor_name != expected_instructor_name:
            errors.append(f"Certificate #{cert.id} instructor_name snapshot không khớp course.")
        if cert.enrollment.status not in [Enrollment.Status.Complete, Enrollment.Status.Cancelled]:
            errors.append(f"Certificate #{cert.id} không gắn với enrollment hoàn thành/đã refund.")
        if cert.issued_at and cert.enrollment.completion_date and cert.issued_at < cert.enrollment.completion_date:
            errors.append(f"Certificate #{cert.id} cấp trước completion_date.")
        if cert.revoked and not (cert.revoked_at and cert.revoked_by):
            errors.append(f"Certificate #{cert.id} revoked nhưng thiếu thời gian/người thu hồi.")
        if cert.revoked_at and cert.issued_at and cert.revoked_at < cert.issued_at:
            errors.append(f"Certificate #{cert.id} revoked_at trước issued_at.")

    for review in Review.objects.select_related("user", "course"):
        enrollment = Enrollment.objects.filter(user=review.user, course=review.course).first()
        if not enrollment:
            errors.append(f"Review #{review.id} không có enrollment trước đó.")
        elif review.created_at and enrollment.enrollment_date and review.created_at < enrollment.enrollment_date:
            errors.append(f"Review #{review.id} xảy ra trước enrollment.")
        if enrollment and enrollment.status == Enrollment.Status.Cancelled and not review.is_deleted:
            errors.append(f"Review #{review.id} của enrollment refunded/cancelled chưa bị ẩn.")
        if review.response_at and review.response_at < review.created_at:
            errors.append(f"Review #{review.id} có instructor response trước review.")

    for hold in InstructorEarningHold.objects.select_related("case", "earning"):
        if hold.status == InstructorEarningHold.Status.ACTIVE and hold.earning.status == InstructorEarning.StatusChoices.PAID:
            errors.append(f"Hold #{hold.id} đang giữ earning đã PAID.")
        if hold.created_at and hold.case.created_at and hold.created_at < hold.case.created_at:
            errors.append(f"Hold #{hold.id} xảy ra trước copyright case.")

    if errors:
        raise SeedError("Business validation failed:\n- " + "\n- ".join(errors))


def print_summary(asset_context):
    print("\n=== SEED REVIEW DATA HOÀN TẤT ===")
    print(f"Users: {User.objects.count()} | Admins: {Admin.objects.count()} | Instructors: {Instructor.objects.count()}")
    print(f"Courses: {Course.objects.count()} | Lessons: {Lesson.objects.count()} | Quiz questions: {QuizQuestion.objects.count()}")
    print(f"Payments: {Payment.objects.count()} | Payment details: {Payment_Details.objects.count()} | Enrollments: {Enrollment.objects.count()}")
    print(f"Earnings: {InstructorEarning.objects.count()} | Payouts: {InstructorPayout.objects.count()} | Refund success: {Payment_Details.objects.filter(refund_status=Payment_Details.RefundStatus.SUCCESS).count()}")
    print(f"Reviews: {Review.objects.count()} | Certificates: {Certificate.objects.count()} | Revoked certificates: {Certificate.objects.filter(revoked=True).count()}")
    video_sources = {}
    for asset in asset_context["video_assets"].values():
        video_sources[asset["source"]] = video_sources.get(asset["source"], 0) + 1
    print(f"Video assets: {video_sources}")
    if asset_context["missing_thumbnails"]:
        print("Thiếu thumbnail:", ", ".join(asset_context["missing_thumbnails"]))
    print("\nTài khoản đăng nhập mẫu:")
    print(f"  admin@example.com / {DEFAULT_PASSWORD}")
    print(f"  linh.instructor@example.com / {DEFAULT_PASSWORD}")
    print(f"  huydang2312003@gmail.com / {DEFAULT_PASSWORD}")
    print(f"  danghuy2312003@gmail.com / {DEFAULT_PASSWORD}")


def main():
    asset_context = prepare_assets()
    print("[db] Reset project tables...")
    clear_database()
    print("[seed] Tạo user, role, level, course, payment, refund, payout...")
    with transaction.atomic():
        users = seed_users()
        admin, instructors, _levels = seed_roles(users)
        restore_settings(asset_context["settings_cache"], admin)
        categories = seed_categories()
        courses, lessons_by_course = seed_courses(categories, instructors, asset_context)
        promotions = seed_promotions(admin, instructors, courses, categories)
        payments, _enrollments, _earnings = seed_orders_and_learning(users, courses, lessons_by_course, promotions)
        seed_activity_and_notifications(users, courses, payments)
        recalc_all_courses()
        validate_business_rules()
    print_summary(asset_context)


if __name__ == "__main__":
    main()
