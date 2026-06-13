
import os, sys, random, hashlib, uuid, json
from datetime import timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.utils import timezone
from django.utils.text import slugify
from django.contrib.auth.hashers import make_password


from users.models import User
from admins.models import Admin
from categories.models import Category
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from courses.models import Course
from coursemodules.models import CourseModule
from lessons.models import Lesson
from lesson_attachments.models import LessonAttachment
from lesson_comments.models import LessonComment
from enrollments.models import Enrollment
from learning_progress.models import LearningProgress
from certificates.models import Certificate
from quiz_questions.models import QuizQuestion, QuizTestCase
from quiz_results.models import QuizResult
from reviews.models import Review
from blog_posts.models import BlogPost
from blog_comments.models import BlogComment
from questions.models import Question
from answers.models import Answer
from promotions.models import Promotion
from carts.models import Cart
from wishlists.models import Wishlist
from payments.models import Payment
from payment_details.models import Payment_Details
from payment_methods.models import UserPaymentMethod, InstructorPayoutMethod
from instructor_earnings.models import InstructorEarning
from instructor_payouts.models import InstructorPayout
from notifications.models import Notification
from supports.models import Support
from support_replies.models import SupportReply
from systems_settings.models import PlatformSetting
from activity_logs.models import ActivityLog
from registration_forms.models import RegistrationForm, FormQuestion
from applications.models import Application, ApplicationResponse
from subscription_plans.models import SubscriptionPlan, PlanCourse, UserSubscription, CourseSubscriptionConsent, SubscriptionUsage

now = timezone.now()

CODE_CHALLENGE_TEMPLATES = [
    {
        "title": "Tong hai so nguyen",
        "description": "Viet ham `solve(a, b)` tra ve tong cua hai so nguyen.",
        "starter_code": "def solve(a, b):\n    # TODO: return the sum\n    pass",
        "solution": "def solve(a, b):\n    return a + b",
        "test_cases": [
            ("1 2", "3", False),
            ("10 -4", "6", True),
            ("0 0", "0", True),
        ],
    },
    {
        "title": "Do dai chuoi",
        "description": "Viet ham `solve(text)` tra ve do dai cua chuoi dau vao.",
        "starter_code": "def solve(text):\n    # TODO: return len(text)\n    pass",
        "solution": "def solve(text):\n    return len(text)",
        "test_cases": [
            ("python", "6", False),
            ("chatgpt", "7", True),
            ("", "0", True),
        ],
    },
    {
        "title": "So lon nhat trong 3 so",
        "description": "Viet ham `solve(a, b, c)` tra ve gia tri lon nhat.",
        "starter_code": "def solve(a, b, c):\n    # TODO: return the maximum value\n    pass",
        "solution": "def solve(a, b, c):\n    return max(a, b, c)",
        "test_cases": [
            ("1 9 3", "9", False),
            ("-5 -2 -9", "-2", True),
            ("7 7 1", "7", True),
        ],
    },
]


def build_code_challenge(seed_value):
    template = CODE_CHALLENGE_TEMPLATES[seed_value % len(CODE_CHALLENGE_TEMPLATES)]
    return {
        "question_text": template["title"],
        "description": template["description"],
        "starter_code": template["starter_code"],
        "correct_answer": template["solution"],
        "time_limit": 120,
        "memory_limit": 65536,
        "allowed_languages": [71, 63],
        "test_cases": template["test_cases"],
    }

def hashed(pw):
    return make_password(pw)

def past(days_max=365):
    return now - timedelta(days=random.randint(1, days_max), hours=random.randint(0, 23))

def future(days_max=365):
    return now + timedelta(days=random.randint(1, days_max))

print("🌱 Seeding database...")




print("  → Users...")
pw = hashed("password123")


admin_user, _ = User.objects.update_or_create(
    email="admin@example.com",
    defaults={
        'username': "admin",
        'password_hash': pw,
        'full_name': "System Admin",
        'status': "active",
        'phone': "0900000001",
        'address': "Hà Nội",
    }
)

instructor_users = []
instructor_names = [
    ("nguyenvana", "Nguyễn Văn A", "0911111001"),
    ("tranthib", "Trần Thị B", "0911111002"),
    ("levanc", "Lê Văn C", "0911111003"),
    ("phamthid", "Phạm Thị D", "0911111004"),
    ("hoangvane", "Hoàng Văn E", "0911111005"),
    ("dangthif", "Đặng Thị F", "0911111006"),
    ("buiducg", "Bùi Đức G", "0911111007"),
    ("vothih", "Võ Thị H", "0911111008"),
]
for uname, fname, phone in instructor_names:
    u, _ = User.objects.update_or_create(
        email=f"{uname}@example.com",
        defaults={
            'username': uname,
            'password_hash': pw,
            'full_name': fname,
            'status': "active",
            'phone': phone,
            'address': "TP. Hồ Chí Minh",
        }
    )
    instructor_users.append(u)

student_users = []
student_names = [
    "student01", "student02", "student03", "student04", "student05",
    "student06", "student07", "student08", "student09", "student10",
    "student11", "student12", "student13", "student14", "student15",
    "student16", "student17", "student18", "student19", "student20",
    "student21", "student22", "student23", "student24", "student25",
    "student26", "student27", "student28", "student29", "student30",
]
for i, uname in enumerate(student_names, 1):
    u, _ = User.objects.update_or_create(
        email=f"{uname}@example.com",
        defaults={
            'username': uname,
            'password_hash': pw,
            'full_name': f"Học Viên {i:02d}",
            'status': "active",
            'phone': f"09222{i:05d}",
            'address': "Đà Nẵng",
        }
    )
    student_users.append(u)

all_users = [admin_user] + instructor_users + student_users




print("  → Admin...")
admin_obj, _ = Admin.objects.update_or_create(
    user=admin_user,
    defaults={'department': "IT", 'role': "super_admin"}
)




print("  → Categories...")
cat_data = {
    "Lập trình": ["Python", "JavaScript", "Java", "C/C++"],
    "Thiết kế": ["UI/UX Design", "Graphic Design", "Motion Graphics"],
    "Kinh doanh": ["Marketing", "Khởi nghiệp", "Quản lý dự án"],
    "Ngoại ngữ": ["Tiếng Anh", "Tiếng Nhật", "Tiếng Hàn", "Tiếng Trung"],
    "Phát triển cá nhân": ["Kỹ năng mềm", "Quản lý thời gian", "Tư duy phản biện"],
    "Data Science": ["Machine Learning", "Data Analysis", "Deep Learning"],
    "DevOps": ["Docker & K8s", "CI/CD", "Cloud AWS"],
    "Mobile": ["React Native", "Flutter", "iOS Swift"],
}


icon_choices = [
    "Code", "Briefcase", "Palette", "Megaphone",
    "Database", "Music", "BookOpen", "Folder",
]

categories = {}
subcategories = {}
for i, (parent_name, subs) in enumerate(cat_data.items()):
    icon = icon_choices[i % len(icon_choices)]
    parent, _ = Category.objects.update_or_create(
        name=parent_name,
        defaults={
            'description': f"Danh mục {parent_name}",
            'status': "active",
            'icon': icon,
            'parent_category': None,
        }
    )
    categories[parent_name] = parent
    for j, sub_name in enumerate(subs):
        sub_icon = random.choice(icon_choices)
        sub, _ = Category.objects.update_or_create(
            name=sub_name,
            defaults={
                'description': f"Chuyên mục {sub_name}",
                'parent_category': parent,
                'status': "active",
                'icon': sub_icon,
            }
        )
        subcategories[sub_name] = sub

all_parent_cats = list(categories.values())
all_sub_cats = list(subcategories.values())




print("  → Instructor Levels...")
levels_data = [
    ("Bronze", 0, 0, 20),
    ("Silver", 50, 5000000, 25),
    ("Gold", 200, 20000000, 30),
    ("Platinum", 500, 50000000, 35),
    ("Diamond", 1000, 100000000, 40),
]
inst_levels = []
for name, min_s, min_r, comm in levels_data:
    lv, _ = InstructorLevel.objects.update_or_create(
        name=name,
        defaults={
            'description': f"Cấp {name}",
            'min_students': min_s,
            'min_revenue': Decimal(min_r),
            'commission_rate': Decimal(comm),
            'plan_commission_rate': Decimal(comm),
        }
    )
    inst_levels.append(lv)




print("  → Instructors...")
specializations = ["Web Development", "AI/ML", "Mobile Dev", "UI/UX", "Cloud", "Data", "DevOps", "Language"]
instructors = []
for i, u in enumerate(instructor_users):
    inst, _ = Instructor.objects.update_or_create(
        user=u,
        defaults={
            'bio': f"Giảng viên {u.full_name} với hơn {random.randint(3,15)} năm kinh nghiệm.",
            'specialization': specializations[i % len(specializations)],
            'qualification': random.choice(["Thạc sĩ CNTT", "Tiến sĩ", "Kỹ sư phần mềm", "MBA"]),
            'experience': random.randint(3, 15),
            'rating': Decimal(str(round(random.uniform(3.5, 5.0), 2))),
            'total_students': random.randint(100, 5000),
            'total_courses': 0,
            'level': random.choice(inst_levels),
            'social_links': {},
        }
    )
    instructors.append(inst)




print("  → Courses...")
course_templates = [

    ("Lập trình Python từ cơ bản đến nâng cao", "Lập trình", "Python", "beginner", "Tiếng Việt", 499000, True),
    ("Python cho Data Science", "Lập trình", "Python", "intermediate", "Tiếng Việt", 699000, True),
    ("Tự động hoá với Python", "Lập trình", "Python", "advanced", "Tiếng Việt", 899000, True),
    ("Machine Learning với Python", "Data Science", "Machine Learning", "intermediate", "Tiếng Việt", 999000, True),
    ("Deep Learning A-Z", "Data Science", "Deep Learning", "advanced", "English", 1299000, True),
    ("Phân tích dữ liệu với Pandas", "Data Science", "Data Analysis", "beginner", "Tiếng Việt", 399000, False),
    ("JavaScript ES6+ hoàn chỉnh", "Lập trình", "JavaScript", "beginner", "Tiếng Việt", 549000, True),
    ("React.js thực chiến", "Lập trình", "JavaScript", "intermediate", "Tiếng Việt", 799000, True),
    ("Node.js Backend Master", "Lập trình", "JavaScript", "advanced", "English", 999000, True),
    ("Vue.js 3 từ A-Z", "Lập trình", "JavaScript", "beginner", "Tiếng Việt", 499000, False),
    ("Java Core cho người mới", "Lập trình", "Java", "beginner", "Tiếng Việt", 399000, True),
    ("Spring Boot REST API", "Lập trình", "Java", "intermediate", "Tiếng Việt", 799000, True),
    ("C++ lập trình thi đấu", "Lập trình", "C/C++", "advanced", "Tiếng Việt", 599000, False),
    ("Figma UI/UX Design", "Thiết kế", "UI/UX Design", "beginner", "Tiếng Việt", 449000, True),
    ("Adobe Illustrator chuyên nghiệp", "Thiết kế", "Graphic Design", "intermediate", "Tiếng Việt", 549000, False),
    ("After Effects Motion Graphics", "Thiết kế", "Motion Graphics", "advanced", "English", 899000, True),
    ("Digital Marketing toàn diện", "Kinh doanh", "Marketing", "beginner", "Tiếng Việt", 599000, True),
    ("SEO từ zero đến hero", "Kinh doanh", "Marketing", "intermediate", "Tiếng Việt", 499000, False),
    ("Khởi nghiệp Lean Startup", "Kinh doanh", "Khởi nghiệp", "all_levels", "Tiếng Việt", 699000, True),
    ("Quản lý dự án Agile/Scrum", "Kinh doanh", "Quản lý dự án", "intermediate", "Tiếng Việt", 799000, True),
    ("IELTS 7.0+ chiến lược", "Ngoại ngữ", "Tiếng Anh", "intermediate", "Tiếng Việt", 899000, True),
    ("TOEIC 800+ luyện thi", "Ngoại ngữ", "Tiếng Anh", "beginner", "Tiếng Việt", 599000, True),
    ("Giao tiếp tiếng Anh thực tế", "Ngoại ngữ", "Tiếng Anh", "all_levels", "Tiếng Việt", 499000, False),
    ("Tiếng Nhật N4 cấp tốc", "Ngoại ngữ", "Tiếng Nhật", "beginner", "Tiếng Việt", 699000, True),
    ("Tiếng Hàn TOPIK I", "Ngoại ngữ", "Tiếng Hàn", "beginner", "Tiếng Việt", 599000, False),
    ("HSK 4 tiếng Trung", "Ngoại ngữ", "Tiếng Trung", "intermediate", "Tiếng Việt", 799000, True),
    ("Kỹ năng thuyết trình", "Phát triển cá nhân", "Kỹ năng mềm", "all_levels", "Tiếng Việt", 299000, False),
    ("Quản lý thời gian hiệu quả", "Phát triển cá nhân", "Quản lý thời gian", "beginner", "Tiếng Việt", 199000, False),
    ("Tư duy phản biện", "Phát triển cá nhân", "Tư duy phản biện", "intermediate", "Tiếng Việt", 349000, False),
    ("Docker & Kubernetes thực hành", "DevOps", "Docker & K8s", "intermediate", "Tiếng Việt", 899000, True),
    ("CI/CD với GitHub Actions", "DevOps", "CI/CD", "beginner", "Tiếng Việt", 499000, True),
    ("AWS Solutions Architect", "DevOps", "Cloud AWS", "advanced", "English", 1499000, True),
    ("React Native thực chiến", "Mobile", "React Native", "intermediate", "Tiếng Việt", 799000, True),
    ("Flutter từ cơ bản", "Mobile", "Flutter", "beginner", "Tiếng Việt", 599000, True),
    ("iOS Swift Development", "Mobile", "iOS Swift", "intermediate", "English", 999000, True),
    ("Lập trình Web HTML/CSS", "Lập trình", "JavaScript", "beginner", "Tiếng Việt", 0, False),
    ("Git & GitHub cho người mới", "Lập trình", "Python", "beginner", "Tiếng Việt", 0, False),
    ("SQL cơ bản đến nâng cao", "Data Science", "Data Analysis", "beginner", "Tiếng Việt", 399000, True),
    ("Power BI Dashboard", "Data Science", "Data Analysis", "intermediate", "Tiếng Việt", 599000, True),
    ("Ethical Hacking cơ bản", "Lập trình", "C/C++", "intermediate", "English", 899000, True),
    ("TypeScript Master Class", "Lập trình", "JavaScript", "advanced", "English", 799000, True),
    ("Next.js Full-Stack", "Lập trình", "JavaScript", "advanced", "Tiếng Việt", 999000, True),
    ("Django REST Framework", "Lập trình", "Python", "intermediate", "Tiếng Việt", 799000, True),
    ("FastAPI Modern Backend", "Lập trình", "Python", "advanced", "Tiếng Việt", 899000, True),
    ("Kotlin Android Dev", "Mobile", "Flutter", "intermediate", "Tiếng Việt", 699000, True),
    ("GraphQL API Design", "Lập trình", "JavaScript", "advanced", "English", 899000, True),
    ("Microservices Architecture", "DevOps", "Docker & K8s", "advanced", "English", 1299000, True),
    ("Terraform Infrastructure as Code", "DevOps", "Cloud AWS", "intermediate", "English", 999000, True),
    ("Data Engineering Pipeline", "Data Science", "Data Analysis", "advanced", "Tiếng Việt", 1099000, True),
    ("NLP với Transformers", "Data Science", "Deep Learning", "advanced", "English", 1399000, True),
]

courses = []
for idx, (title, pcat, subcat, level, lang, price, cert) in enumerate(course_templates):
    inst = instructors[idx % len(instructors)]
    parent_cat = categories[pcat]
    sub_cat = subcategories[subcat]
    total_students = random.randint(50, 150000) if price > 0 else random.randint(500, 300000)
    total_reviews = max(1, total_students // random.randint(5, 15))
    rating = round(random.uniform(3.0, 5.0), 2)
    duration = random.randint(120, 3600)

    disc_price = None
    disc_start = None
    disc_end = None
    if price > 0 and random.random() < 0.3:
        disc_price = Decimal(str(int(price * random.uniform(0.5, 0.8))))
        disc_start = now - timedelta(days=random.randint(1, 10))
        disc_end = now + timedelta(days=random.randint(10, 60))

    c, _ = Course.objects.update_or_create(
        title=title,
        defaults={
            'shortdescription': f"Khóa học {title} — học từ cơ bản đến thực chiến.",
            'description': f"Khóa học {title} được thiết kế dành cho người muốn nắm vững kiến thức ",
            'instructor': inst,
            'category': parent_cat,
            'subcategory': sub_cat,
            'price': Decimal(str(price)),
            'discount_price': disc_price,
            'discount_start_date': disc_start,
            'discount_end_date': disc_end,
            'level': level,
            'language': lang,
            'duration': duration,
            'total_lessons': random.randint(20, 120),
            'total_modules': random.randint(5, 20),
            'requirements': "Máy tính có kết nối internet. Không yêu cầu kinh nghiệm trước.",
            'learning_objectives': [
                f"Hiểu rõ kiến thức nền tảng về {subcat}",
                f"Thực hành dự án thực tế với {subcat}",
                "Có kỹ năng tự phát triển sau khóa học",
            ],
            'target_audience': ["Sinh viên", "Người đi làm muốn chuyển ngành", "Tự học"],
            'tags': [subcat.lower(), pcat.lower(), level],
            'status': "published",
            'published_date': past(180),
            'is_featured': random.random() < 0.2,
            'rating': Decimal(str(rating)),
            'total_reviews': total_reviews,
            'total_students': total_students,
            'certificate': cert,
            'thumbnail': f"https://picsum.photos/seed/course{idx}/640/360",
        }
    )
    courses.append(c)




print("  → Demo Course (Nguyễn Văn A: Code Quiz + Quiz + Video)...")
# Khóa học cố định để demo: slot 1 = bài quiz code (tính tổng mảng),
# slot 2 = bài quiz trắc nghiệm, sau đó là các bài video.
# Tạo riêng, KHÔNG thêm vào list `courses` để vòng tạo module/lesson ngẫu nhiên bỏ qua.
inst_a = Instructor.objects.get(user__username="nguyenvana")
demo_course, _ = Course.objects.update_or_create(
    title="[DEMO] Lập trình Python - Code Quiz & Trắc nghiệm",
    defaults={
        'shortdescription': "Khóa demo: bài quiz code, bài quiz trắc nghiệm và các bài video.",
        'description': "Khóa học demo dùng để kiểm thử tính năng quiz code, quiz trắc nghiệm và video.",
        'instructor': inst_a,
        'category': categories["Lập trình"],
        'subcategory': subcategories["Python"],
        'price': Decimal("0"),
        'level': "beginner",
        'language': "Tiếng Việt",
        'duration': 60,
        'total_lessons': 5,
        'total_modules': 1,
        'requirements': "Không yêu cầu kiến thức trước.",
        'learning_objectives': ["Làm quen bài quiz code", "Làm bài quiz trắc nghiệm", "Xem bài giảng video"],
        'target_audience': ["Người mới bắt đầu"],
        'tags': ["python", "demo", "quiz"],
        'status': "published",
        'published_date': past(10),
        'is_featured': True,
        'rating': Decimal("5.0"),
        'total_reviews': 0,
        'total_students': 0,
        'certificate': True,
        'thumbnail': "https://picsum.photos/seed/democodequiz/640/360",
    }
)

demo_module = CourseModule.objects.create(
    course=demo_course,
    title="Module 1: Bài giảng Demo",
    description="Module demo gồm bài quiz code, bài quiz trắc nghiệm và video.",
    order_number=1,
    duration=60,
    status="Published",
)

# --- Slot 1: Bài quiz CODE - tính tổng mảng ---
demo_code_lesson = Lesson.objects.create(
    coursemodule=demo_module,
    title="Bài 1: Code Quiz - Tính tổng mảng",
    description="Cài đặt hàm solve(arr) trả về tổng các phần tử trong mảng.",
    content_type="quiz",
    duration=15,
    is_free=True,
    order=1,
    status="published",
)
code_q = QuizQuestion.objects.create(
    lesson=demo_code_lesson,
    difficulty="easy",
    question_text="Tính tổng mảng",
    question_type="code",
    options=None,
    correct_answer="def solve(arr):\n    return sum(arr)",
    points=100,
    explanation="Dùng sum(arr) (Python) hoặc reduce (JS) để cộng dồn các phần tử.",
    order_number=1,
    description=(
        "Cho một mảng số nguyên, hãy cài đặt hàm `solve(arr)` trả về tổng "
        "các phần tử của mảng. Input là mảng JSON trên một dòng, ví dụ: [1, 2, 3]."
    ),
    starter_code=json.dumps({
        "71": "def solve(arr):\n    # Trả về tổng các phần tử trong mảng\n    pass",
        "63": "function solve(arr) {\n  // Trả về tổng các phần tử trong mảng\n}",
    }),
    time_limit=120,
    memory_limit=65536,
    allowed_languages=[71, 63],
    function_name="solve",
    require_completion=True,
)
demo_code_testcases = [
    ("[1, 2, 3, 4, 5]", "15", False),
    ("[10, -4, 6]", "12", False),
    ("[0, 0, 0]", "0", False),
    ("[-5, -2, -9]", "-16", True),
    ("[100]", "100", True),
]
for tc_idx, (inp, out, hidden) in enumerate(demo_code_testcases, 1):
    QuizTestCase.objects.create(
        question=code_q,
        input_data=inp,
        expected_output=out,
        is_hidden=hidden,
        points=1,
        order_number=tc_idx,
    )

# --- Slot 2: Bài quiz TRẮC NGHIỆM ---
demo_quiz_lesson = Lesson.objects.create(
    coursemodule=demo_module,
    title="Bài 2: Quiz trắc nghiệm Python",
    description="Bài kiểm tra trắc nghiệm kiến thức Python cơ bản.",
    content_type="quiz",
    duration=10,
    is_free=True,
    order=2,
    status="published",
)
demo_quiz_questions = [
    {
        "question_text": "Hàm nào trả về độ dài của một list trong Python?",
        "question_type": "multiple",
        "options": [
            {"text": "len()", "is_correct": True},
            {"text": "size()", "is_correct": False},
            {"text": "count()", "is_correct": False},
            {"text": "length()", "is_correct": False},
        ],
        "correct_answer": "len()",
        "explanation": "len() trả về số phần tử của list.",
    },
    {
        "question_text": "Python là ngôn ngữ phân biệt chữ hoa/chữ thường (case-sensitive).",
        "question_type": "truefalse",
        "options": [{"text": "True", "is_correct": True}, {"text": "False", "is_correct": False}],
        "correct_answer": "True",
        "explanation": "Biến `a` và `A` là hai biến khác nhau.",
    },
    {
        "question_text": "Cú pháp nào tạo một dictionary rỗng?",
        "question_type": "multiple",
        "options": [
            {"text": "{}", "is_correct": True},
            {"text": "[]", "is_correct": False},
            {"text": "()", "is_correct": False},
            {"text": "set()", "is_correct": False},
        ],
        "correct_answer": "{}",
        "explanation": "{} tạo dict rỗng, [] tạo list rỗng, () tạo tuple rỗng.",
    },
]
for q_idx, q in enumerate(demo_quiz_questions, 1):
    QuizQuestion.objects.create(
        lesson=demo_quiz_lesson,
        difficulty="easy",
        question_text=q["question_text"],
        question_type=q["question_type"],
        options=q["options"],
        correct_answer=q["correct_answer"],
        points=1,
        explanation=q["explanation"],
        order_number=q_idx,
    )

# --- Slot 3+: Bài VIDEO ---
demo_video_titles = [
    "Bài 3: Giới thiệu khóa học",
    "Bài 4: Cài đặt môi trường Python",
    "Bài 5: Viết chương trình đầu tiên",
]
for v_idx, v_title in enumerate(demo_video_titles, 3):
    Lesson.objects.create(
        coursemodule=demo_module,
        title=v_title,
        description=f"Nội dung video: {v_title}",
        content_type="video",
        video_url="https://res.cloudinary.com/dqzopvk2t/video/upload/v1780068574/course_lessons/course_sample_lesson.mp4",
        duration=12,
        is_free=(v_idx == 3),
        order=v_idx,
        status="published",
    )


for inst in instructors:
    inst.total_courses = Course.objects.filter(instructor=inst, is_deleted=False).count()
    inst.save(update_fields=['total_courses'])




print("  → Modules & Lessons...")
all_lessons = []
for course in courses:
    num_modules = random.randint(4, 10)
    for m_idx in range(1, num_modules + 1):
        module = CourseModule.objects.create(
            course=course,
            title=f"Module {m_idx}: {'Giới thiệu' if m_idx == 1 else f'Chương {m_idx}'}",
            description=f"Nội dung module {m_idx} của khóa học {course.title}",
            order_number=m_idx,
            duration=random.randint(30, 180),
            status="Published",
        )
        num_lessons = random.randint(3, 8)
        for l_idx in range(1, num_lessons + 1):
            ct = random.choice(["video", "video", "video", "text", "quiz"])
            lesson = Lesson.objects.create(
                coursemodule=module,
                title=f"Bài {l_idx}: {'Nội dung lý thuyết' if ct == 'text' else 'Bài giảng video' if ct == 'video' else 'Bài kiểm tra'}",
                description=f"Bài học {l_idx} trong module {m_idx}",
                content_type=ct,
                content=f"Nội dung chi tiết cho bài {l_idx}..." if ct == "text" else None,
                video_url="https://res.cloudinary.com/dqzopvk2t/video/upload/v1780068574/course_lessons/course_sample_lesson.mp4" if ct == "video" else None,
                duration=random.randint(5, 45) if ct != "quiz" else random.randint(10, 30),
                is_free=(m_idx == 1 and l_idx <= 2),
                order=l_idx,
                status="published",
            )
            all_lessons.append(lesson)


            if random.random() < 0.3:
                LessonAttachment.objects.create(
                    lesson=lesson,
                    title=f"Tài liệu bài {l_idx}",
                    file_path=f"/uploads/attachments/c{course.id}_l{lesson.id}.pdf",
                    file_type="application/pdf",
                    file_size=random.randint(50000, 5000000),
                )




print("  → Quiz Questions...")
quiz_lessons = [l for l in all_lessons if l.content_type == "quiz"]
for lesson in quiz_lessons[:80]:
    num_q = random.randint(3, 8)
    for q_idx in range(1, num_q + 1):
        qtype = random.choice(["multiple", "truefalse", "multiple", "code"])
        question_text = f"CÃ¢u há»i {q_idx} cho bÃ i {lesson.title}?"
        description = None
        starter_code = None
        time_limit = None
        memory_limit = None
        allowed_languages = None
        explanation = f"Giáº£i thÃ­ch cho cÃ¢u {q_idx}."
        if qtype == "multiple":
            options = [
                {"text": f"Đáp án A", "is_correct": q_idx % 4 == 1},
                {"text": f"Đáp án B", "is_correct": q_idx % 4 == 2},
                {"text": f"Đáp án C", "is_correct": q_idx % 4 == 3},
                {"text": f"Đáp án D", "is_correct": q_idx % 4 == 0},
            ]
            correct = chr(65 + (q_idx % 4))
        elif qtype == "truefalse":
            options = [{"text": "True"}, {"text": "False"}]
            correct = random.choice(["True", "False"])
        else:
            options = None
            challenge = build_code_challenge(q_idx + lesson.id)
            question_text = f"{challenge['question_text']} - {lesson.title}"
            description = challenge["description"]
            starter_code = challenge["starter_code"]
            correct = challenge["correct_answer"]
            time_limit = challenge["time_limit"]
            memory_limit = challenge["memory_limit"]
            allowed_languages = challenge["allowed_languages"]
            explanation = f"Code challenge: {challenge['description']}"

        qq = QuizQuestion.objects.create(
            lesson=lesson,
            difficulty=random.choice(["easy", "medium", "hard"]),
            question_text=f"Câu hỏi {q_idx} cho bài {lesson.title}?",
            question_type=qtype,
            options=options,
            correct_answer=correct,
            points=random.choice([1, 2, 3]),
            explanation=f"Giải thích cho câu {q_idx}.",
            order_number=q_idx,
        )

        if qtype == "code":
            qq.question_text = question_text
            qq.correct_answer = correct
            qq.explanation = explanation
            qq.description = description
            qq.starter_code = starter_code
            qq.time_limit = time_limit
            qq.memory_limit = memory_limit
            qq.allowed_languages = allowed_languages
            qq.save(
                update_fields=[
                    "question_text",
                    "correct_answer",
                    "explanation",
                    "description",
                    "starter_code",
                    "time_limit",
                    "memory_limit",
                    "allowed_languages",
                ]
            )
            for tc_idx, (input_data, expected_output, is_hidden) in enumerate(challenge["test_cases"], 1):
                QuizTestCase.objects.create(
                    question=qq,
                    input_data=input_data,
                    expected_output=expected_output,
                    is_hidden=is_hidden,
                    points=1,
                    order_number=tc_idx,
                )




print("  → Subscription Plans...")
plans_data = [
    ("Cơ bản", 99000, "monthly", 30, ["Truy cập khóa học cơ bản", "Hỗ trợ email"], ["Khóa học nâng cao", "Certificate"]),
    ("Tiêu chuẩn", 249000, "monthly", 30, ["Tất cả khóa học", "Hỗ trợ 24/7", "Certificate"], ["Mentoring 1-1"]),
    ("Cao cấp", 599000, "quarterly", 90, ["Tất cả khóa học", "Mentoring 1-1", "Certificate", "Ưu tiên hỗ trợ"], []),
    ("VIP Năm", 1999000, "annual", 365, ["Toàn bộ nền tảng", "Mentoring không giới hạn", "Certificate", "Ưu tiên VIP"], []),
]
sub_plans = []
for name, price, dtype, days, features, not_inc in plans_data:
    sp, _ = SubscriptionPlan.objects.update_or_create(
        name=name,
        defaults={
            'description': f"Gói {name}",
            'price': Decimal(str(price)),
            'duration_type': dtype,
            'duration_days': days,
            'status': "active",
            'is_featured': (name == "Tiêu chuẩn"),
            'features': features,
            'not_included': not_inc,
            'badge_text': "Phổ biến" if name == "Tiêu chuẩn" else None,
            'created_by': admin_obj,
        }
    )
    sub_plans.append(sp)


for sp in sub_plans:
    if courses:
        plan_courses_list = random.sample(courses, k=min(random.randint(10, 30), len(courses)))
        for c in plan_courses_list:
            PlanCourse.objects.get_or_create(plan=sp, course=c, defaults={'status': "active", 'added_by': admin_obj})




print("  → Promotions...")
promos = []
promo_data = [
    ("WELCOME20", "percentage", 20, 0, None),
    ("SAVE50K", "fixed", 50000, 200000, None),
    ("SUMMER30", "percentage", 30, 0, 500000),
    ("NEWYEAR25", "percentage", 25, 100000, 300000),
    ("VIP100K", "fixed", 100000, 500000, None),
    ("FLASH40", "percentage", 40, 0, 800000),
]
for code, dtype, val, min_p, max_d in promo_data:
    p, _ = Promotion.objects.update_or_create(
        code=code,
        defaults={
            'description': f"Mã giảm giá {code}",
            'discount_type': dtype,
            'discount_value': Decimal(str(val)),
            'start_date': past(30),
            'end_date': future(60),
            'usage_limit': random.randint(50, 500),
            'used_count': random.randint(0, 30),
            'min_purchase': Decimal(str(min_p)),
            'max_discount': Decimal(str(max_d)) if max_d else None,
            'admin': admin_obj,
            'instructor': random.choice(instructors) if instructors else None,
            'status': "active",
        }
    )
    if courses:
        p.applicable_courses.set(random.sample(courses, k=min(random.randint(3, 10), len(courses))))
    if all_parent_cats:
        p.applicable_categories.set(random.sample(all_parent_cats, k=min(random.randint(1, 3), len(all_parent_cats))))
    promos.append(p)




print("  → Payments & Enrollments...")
# Tài khoản sạch hoàn toàn để demo luồng chính: không gắn sẵn bất kỳ dữ liệu nào
# (enrollment/thanh toán/subscription/giỏ hàng/wishlist/đơn giảng viên/phương thức
# thanh toán/thông báo/Q&A/comment/support/chat).
DEMO_CLEAN_USERNAMES = {"student01"}
clean_students = [s for s in student_users if s.username not in DEMO_CLEAN_USERNAMES]
clean_all_users = [u for u in all_users if u.username not in DEMO_CLEAN_USERNAMES]
payments_list = []
enrollments_list = []

for student in student_users:
    if student.username in DEMO_CLEAN_USERNAMES:
        continue



    txns = random.randint(2, 5)

    available = random.sample(courses, k=len(courses))
    idx = 0
    for _ in range(txns):

        count = random.randint(1, 4)
        bought = available[idx:idx + count]
        idx += count
        if not bought:
            break


        pmt = Payment.objects.create(
            user=student,
            payment_type="course_purchase",
            amount=Decimal('0.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('0.00'),
            transaction_id=f"TXN_{uuid.uuid4().hex[:16].upper()}",

            payment_status=Payment.PaymentStatus.COMPLETED,
            payment_method=random.choice(["vnpay", "momo"]),
            promotion=None,
            ipn_attempts=0,
        )

        running_amount = Decimal('0.00')
        running_discount = Decimal('0.00')

        for course in bought:
            price = Decimal(str(course.discount_price or course.price))
            promo = random.choice(promos) if random.random() < 0.2 else None
            discount = Decimal('0.00')
            if promo:
                if promo.discount_type == "percentage":
                    discount = price * Decimal(str(promo.discount_value)) / Decimal(100)
                    if promo.max_discount:
                        discount = min(discount, promo.max_discount)
                else:
                    discount = Decimal(str(promo.discount_value))
            final_price = max(Decimal('0.00'), price - discount)

            Payment_Details.objects.create(
                payment=pmt,
                course=course,
                price=price,
                discount=discount,
                final_price=final_price,
                promotion=promo,
            )

            running_amount += price
            running_discount += discount

            enroll_date = past(120)
            progress = Decimal(str(round(random.uniform(0, 100), 2)))
            status = "complete" if progress >= 100 else "active"
            enr, _ = Enrollment.objects.update_or_create(
                user=student, course=course,
                defaults={
                    'payment': pmt,
                    'source': "purchase",
                    'enrollment_date': enroll_date,
                    'progress': progress,
                    'status': status,
                    'completion_date': enroll_date + timedelta(days=random.randint(30, 90)) if status == "complete" else None,
                    'last_access_date': past(14),
                }
            )
            enrollments_list.append(enr)


        pmt.amount = running_amount
        pmt.discount_amount = running_discount
        pmt.total_amount = running_amount - running_discount
        pmt.save()
        payments_list.append(pmt)




print("  → User Subscriptions...")
user_subs = []
for student in student_users[:10]:
    if student.username in DEMO_CLEAN_USERNAMES:
        continue
    plan = random.choice(sub_plans)
    start = past(60)
    us = UserSubscription.objects.create(
        user=student, plan=plan,
        status="active", start_date=start,
        end_date=start + timedelta(days=plan.duration_days),
        auto_renew=random.choice([True, False]),
    )
    user_subs.append(us)




print("  → Learning Progress...")
lp_count = 0
for enr in enrollments_list[:100]:
    course_lessons = Lesson.objects.filter(
        coursemodule__course=enr.course, is_deleted=False
    ).order_by('coursemodule__order_number', 'order')[:10]
    for lesson in course_lessons:
        if random.random() < 0.7:
            completed = random.random() < 0.5
            lp, created = LearningProgress.objects.update_or_create(
                user=enr.user, enrollment=enr, course=enr.course, lesson=lesson,
                defaults={
                    'progress_percentage': Decimal("100.00") if completed else Decimal(str(round(random.uniform(10, 90), 2))),
                    'status': "completed" if completed else "progress",
                    'is_completed': completed,
                    'time_spent': random.randint(60, 3600),
                    'start_time': past(60),
                    'completion_date': past(30) if completed else None,
                }
            )
            if created:
                lp_count += 1
print(f"    ({lp_count} records)")




print("  → Quiz Results...")
qr_count = 0
for enr in enrollments_list[:60]:
    quiz_ls = Lesson.objects.filter(
        coursemodule__course=enr.course, content_type="quiz", is_deleted=False
    )[:3]
    for ql in quiz_ls:
        score = Decimal(str(round(random.uniform(30, 100), 2)))
        qr, created = QuizResult.objects.update_or_create(
            enrollment=enr, lesson=ql,
            defaults={
                'start_time': past(30),
                'submit_time': past(29),
                'time_taken': random.randint(300, 1800),
                'total_questions': random.randint(5, 15),
                'correct_answers': random.randint(2, 15),
                'total_points': random.randint(10, 30),
                'score': score,
                'passed': score >= 60,
                'attempt': 1,
            }
        )
        if created:
            qr_count += 1
print(f"    ({qr_count} records)")




print("  → Certificates...")
cert_count = 0
complete_enrollments = [e for e in enrollments_list if e.status == "complete" and e.course.certificate]
for enr in complete_enrollments[:40]:
    try:
        Certificate.objects.create(
            user=enr.user, course=enr.course, enrollment=enr,
            student_name=enr.user.full_name,
            course_title=enr.course.title,
            instructor_name=enr.course.instructor.user.full_name if enr.course.instructor else None,
            completion_date=enr.completion_date or now,
            certificate_url=f"/certificates/{enr.id}.pdf",
        )
        cert_count += 1
    except Exception:
        pass
print(f"    ({cert_count} records)")




print("  → Reviews...")
review_comments = [
    "Khóa học rất tuyệt vời, giảng viên dạy dễ hiểu!",
    "Nội dung phong phú, bài tập thực hành nhiều.",
    "Giá trị xứng đáng với số tiền bỏ ra.",
    "Cần cập nhật thêm nội dung mới hơn.",
    "Tốt cho người mới bắt đầu.",
    "Giảng viên rất nhiệt tình hỗ trợ.",
    "Khóa học hay nhưng hơi ngắn.",
    "Rất hài lòng, sẽ giới thiệu bạn bè.",
    "Chất lượng video cần cải thiện.",
    "Bài tập cuối khóa rất thú vị và thực tế.",
]
for enr in enrollments_list[:80]:
    if random.random() < 0.7:
        try:
            Review.objects.create(
                course=enr.course, user=enr.user,
                rating=random.randint(3, 5),
                comment=random.choice(review_comments),
                status="approved",
                likes=random.randint(0, 50),
                instructor_response="Cảm ơn bạn đã đánh giá!" if random.random() < 0.3 else None,
                response_at=past(10) if random.random() < 0.3 else None,
            )
        except Exception:
            pass




print("  → Blog Posts & Comments...")
blog_titles = [
    "10 tips học lập trình hiệu quả",
    "Xu hướng công nghệ 2026",
    "Làm sao để chuyển ngành IT thành công?",
    "Review các framework JavaScript phổ biến",
    "Machine Learning cho người mới bắt đầu",
    "Cách xây dựng portfolio ấn tượng",
    "DevOps là gì? Lộ trình học DevOps",
    "Kinh nghiệm phỏng vấn fresher IT",
    "So sánh Python vs JavaScript",
    "Tại sao nên học Data Science?",
    "Career path cho UI/UX Designer",
    "5 dự án side-project nên thử",
]
blog_posts = []
for i, title in enumerate(blog_titles):
    slug_base = slugify(title, allow_unicode=True) or f"blog-post-{i}"
    slug_val = f"{slug_base}-{i}"
    bp, _ = BlogPost.objects.update_or_create(
        slug=slug_val,
        defaults={
            'title': title,
            'content': f"<p>Nội dung chi tiết về {title}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
                       f"Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>"
                       f"<h2>Phần 1</h2><p>Chi tiết phần 1...</p>"
                       f"<h2>Phần 2</h2><p>Chi tiết phần 2...</p>",
            'author': random.choice(instructor_users + [admin_user]),
            'status': "published",
            'tags': ["technology", "education", random.choice(["python", "javascript", "devops", "career"])],
            'category': random.choice(all_parent_cats) if all_parent_cats else None,
            'summary': f"Tóm tắt: {title}",
            'published_at': past(90),
            'views': random.randint(100, 10000),
            'likes': random.randint(10, 500),
            'is_featured': (i < 3),
        }
    )
    blog_posts.append(bp)


    for _ in range(random.randint(2, 8)):
        BlogComment.objects.create(
            blog_post=bp,
            content=random.choice([
                "Bài viết hay quá!", "Cảm ơn tác giả!", "Rất hữu ích.",
                "Mình muốn biết thêm về chủ đề này.", "Share cho bạn bè ngay!",
                "Nội dung chi tiết và dễ hiểu.", "Mong có thêm bài viết tương tự.",
            ]),
            user=random.choice(clean_students) if clean_students else None,
            status="active",
            likes=random.randint(0, 20),
        )




print("  → Questions & Answers (QA Community)...")
qa_tags_pool = [['python'], ['django'], ['javascript'], ['react'], ['css'], ['sql'], ['api'], ['debug'], ['html'], ['git']]
question_titles = [
    "Làm thế nào để xử lý lỗi này?",
    "Cách tối ưu query trong Django?",
    "React hooks hoạt động như thế nào?",
    "Khác nhau giữa async/await và Promise?",
    "Cách deploy ứng dụng lên Render?",
    "CSS flexbox vs grid, khi nào dùng cái nào?",
    "Cách viết unit test cho Django REST API?",
    "JWT token refresh hoạt động ra sao?",
    "Cách tối ưu performance React app?",
    "Migrations trong Django, best practices?",
]
for q_idx in range(min(30, len(student_users) * 2)):
    student = random.choice(clean_students)
    q = Question.objects.create(
        title=question_titles[q_idx % len(question_titles)],
        content=f"Mình đang gặp vấn đề số {q_idx + 1}. Bạn nào giúp mình với?",
        author=student,
        tags=qa_tags_pool[q_idx % len(qa_tags_pool)],
        status="open",
        views=random.randint(5, 300),
        score=random.randint(0, 20),
    )
    num_answers = random.randint(0, 4)
    for a_idx in range(num_answers):
        Answer.objects.create(
            question=q,
            content=random.choice([
                "Bạn thử cách này nhé...",
                "Mình đã gặp vấn đề tương tự và giải quyết bằng...",
                "Tham khảo tài liệu chính thức tại docs.djangoproject.com",
                "Đây là approach mình hay dùng:",
                "Hãy kiểm tra lại phần import và dependencies.",
            ]),
            author=random.choice(clean_all_users[:20]),
            score=random.randint(0, 15),
        )
    Question.objects.filter(id=q.id).update(answer_count=num_answers)




print("  → Lesson Comments...")
for lesson in all_lessons[:100]:
    if random.random() < 0.4:
        for _ in range(random.randint(1, 3)):
            LessonComment.objects.create(
                user=random.choice(clean_students),
                lesson=lesson,
                content=random.choice([
                    "Phần này hay quá!", "Mình chưa hiểu chỗ này.",
                    "Cảm ơn giảng viên!", "Bài này hơi khó.",
                    "Rất rõ ràng!",
                ]),
                votes=random.randint(0, 15),
            )




print("  → Carts & Wishlists...")
for student in student_users:
    if student.username in DEMO_CLEAN_USERNAMES:
        continue
    enrolled_ids = set(Enrollment.objects.filter(user=student).values_list('course_id', flat=True))
    available = [c for c in courses if c.id not in enrolled_ids]
    if available:

        for c in random.sample(available, k=min(random.randint(1, 3), len(available))):
            try:
                Cart.objects.create(user=student, course=c)
            except Exception:
                pass

        for c in random.sample(available, k=min(random.randint(2, 5), len(available))):
            try:
                Wishlist.objects.create(user=student, course=c)
            except Exception:
                pass




print("  → Payment Methods...")
for student in clean_students[:15]:
    UserPaymentMethod.objects.create(
        user=student,
        method_type=random.choice(["vnpay", "momo", "bank_transfer"]),
        is_default=True,
        nickname="Thanh toán chính",
        masked_account=f"****{random.randint(1000, 9999)}",
        bank_name=random.choice(["Vietcombank", "Techcombank", "MB Bank", "VPBank"]),
    )

for inst in instructors:
    InstructorPayoutMethod.objects.create(
        instructor=inst,
        method_type="bank_transfer",
        is_default=True,
        nickname="Tài khoản nhận tiền",
        bank_name=random.choice(["Vietcombank", "Techcombank", "MB Bank"]),
        account_number=f"0{random.randint(100000000, 999999999)}",
        account_name=inst.user.full_name.upper(),
    )




print("  → Instructor Earnings & Payouts...")
for inst in instructors:
    payout = InstructorPayout.objects.create(
        instructor=inst,
        amount=Decimal(str(random.randint(1000000, 20000000))),
        fee=Decimal("50000"),
        net_amount=Decimal(str(random.randint(950000, 19950000))),
        payment_method="bank_transfer",
        status=random.choice(["pending", "processed"]),
        period="2026-02",
        notes="Thanh toán tháng 02/2026",
        processed_by=admin_obj if random.random() < 0.5 else None,
        processed_date=past(10) if random.random() < 0.5 else None,
    )

    inst_courses = Course.objects.filter(instructor=inst, is_deleted=False)[:5]
    for c in inst_courses:
        inst_payments = Payment.objects.filter(
            is_deleted=False,
            payment_status="completed",
        )[:3]
        for pmt in inst_payments:
            try:
                InstructorEarning.objects.create(
                    instructor=inst, course=c, payment=pmt,
                    amount=Decimal(str(random.randint(100000, 500000))),
                    net_amount=Decimal(str(random.randint(70000, 350000))),
                    status=random.choice(["pending", "available", "paid"]),
                    instructor_payout=payout if random.random() < 0.3 else None,
                )
            except Exception:
                pass




print("  → Notifications...")
notif_templates = [
    ("Chào mừng!", "system", "Chào mừng bạn đến với nền tảng học trực tuyến!"),
    ("Khóa học mới", "course", "Có khóa học mới phù hợp với bạn."),
    ("Thanh toán thành công", "payment", "Thanh toán của bạn đã được xử lý."),
    ("Khuyến mãi", "promotion", "Giảm giá 30% cho tất cả khóa học!"),
    ("Nhắc học", "course", "Đã lâu bạn chưa quay lại học, hãy tiếp tục!"),
]
for student in clean_students:
    for title, ntype, msg in random.sample(notif_templates, k=random.randint(2, 5)):
        Notification.objects.create(
            title=title, sender=admin_user, receiver=student,
            message=msg, is_read=random.random() < 0.4,
            type=ntype,
        )




print("  → Supports...")
support_subjects = [
    "Không thể truy cập khóa học",
    "Yêu cầu hoàn tiền",
    "Lỗi khi thanh toán",
    "Không nhận được chứng chỉ",
    "Hỏi về gói subscription",
    "Đề xuất cải tiến giao diện",
]
supports = []
for i in range(15):
    student = random.choice(clean_students)
    s = Support.objects.create(
        user=student, name=student.full_name, email=student.email,
        subject=random.choice(support_subjects),
        message="Chi tiết vấn đề gặp phải...",
        status=random.choice(["open", "in_progress", "resolved", "closed"]),
        priority=random.choice(["low", "medium", "high"]),
        admin=admin_obj if random.random() < 0.5 else None,
    )
    supports.append(s)
    if random.random() < 0.6:
        SupportReply.objects.create(
            support=s, user=admin_user, admin=admin_obj,
            message="Chúng tôi đã ghi nhận vấn đề của bạn và đang xử lý.",
        )




print("  → System Settings...")

# UI trang chủ gốc: tái tạo đúng giá trị mà nút "Khôi phục UI gốc" ghi vào DB
# (HARDCODED_BACKUP_HOME_SCHEMA ở FE), gồm 12 section kiểu legacy_component.
# Loader FE ưu tiên key "homepage_schema_v2" đầu tiên nên seed phải ghi key này
# để giao diện không bị lỗi sau mỗi lần reset.
HOMEPAGE_LEGACY_COMPONENTS = [
    ("legacy_component_1774691118511_ik8o9y", "HeroSection"),
    ("legacy_component_1774691118511_bkmygl", "TrustedCompanies"),
    ("legacy_component_1774691118511_5w88hy", "FeaturesSection"),
    ("legacy_component_1774691118511_7ek1pl", "Categories"),
    ("legacy_component_1774691118511_a0vyrj", "FeaturedCourses"),
    ("legacy_component_1774691118511_kmgekg", "LearningGoals"),
    ("legacy_component_1774691118511_nbubal", "TrendingCourses"),
    ("legacy_component_1774691118511_qzuag5", "PopularSkills"),
    ("legacy_component_1774691118511_2chfas", "TestimonialsSection"),
    ("legacy_component_1774691118511_tnogbs", "StatsSection"),
    ("legacy_component_1774691118511_0o1qwk", "InstructorPromo"),
    ("legacy_component_1774691118511_jxcp1w", "NewsletterSection"),
]
homepage_schema_v2 = {
    "version": 2,
    "meta": {"updated_at": now.isoformat(), "updated_by": 0},
    "sections": [
        {
            "id": section_id,
            "type": "legacy_component",
            "enabled": True,
            "order": idx,
            "layout": {"container": "default", "spacing_top": "md", "spacing_bottom": "md", "background": "none"},
            "content": {},
            "data_source": {"component": component},
            "display_rules": {"devices": ["mobile", "desktop"], "audience": "all"},
        }
        for idx, (section_id, component) in enumerate(HOMEPAGE_LEGACY_COMPONENTS, 1)
    ],
}

PlatformSetting.objects.update_or_create(
    singleton_key=1,
    defaults={
        "site_name": "coursePlatform",
        "min_payout": Decimal("500000"),
        "auto_approve_instructor_application": True,
        "auto_approve_payout": True,
        "site_description": "Nen tang hoc truc tuyen hang dau Viet Nam",
        "contact_email": "support@eduplatform.vn",
        "contact_phone": "",
        "homepage_layout": [
            {"component": component, "enabled": True, "order": idx}
            for idx, (_, component) in enumerate(HOMEPAGE_LEGACY_COMPONENTS, 1)
        ],
        "homepage_config": {},
        "homepage_schema_v2": homepage_schema_v2,
        "updated_by": admin_obj,
    },
)

settings_data = []
legacy_settings_data = [
    ("homepage", "homepage_schema_v2", json.dumps(homepage_schema_v2, ensure_ascii=False), "Dynamic homepage schema v2"),
    ("general", "site_name", "coursePlatform", "Tên website"),
    ("general", "site_description", "Nền tảng học trực tuyến hàng đầu Việt Nam", "Mô tả website"),
    ("general", "contact_email", "support@eduplatform.vn", "Email liên hệ"),
    ("general", "contact_phone", "", "Số điện thoại"),
    ("payment", "vnpay_enabled", "true", "Bật thanh toán VNPay"),
    ("payment", "momo_enabled", "true", "Bật thanh toán MoMo"),
    ("payment", "min_payout", "500000", "Số tiền rút tối thiểu"),
    ("email", "smtp_host", "smtp.gmail.com", "SMTP Host"),
    ("email", "smtp_port", "587", "SMTP Port"),
    ("course", "max_upload_size", "524288000", "Dung lượng upload tối đa (bytes)"),
    ("instructor", "auto_approve_instructor_application", "true", "Tự động duyệt đơn ứng tuyển instructor"),
    ("course", "auto_approve_review", "true", "Tự động duyệt đánh giá"),
    ("payment", "auto_approve_payout", "true", "Tự động duyệt yêu cầu rút tiền"),
]
settings_data = [
    row for row in settings_data
    if row[1] not in {
        "site_name",
        "min_payout",
        "auto_approve_instructor_application",
        "auto_approve_payout",
    }
]
print("  → Activity Logs...")
log_actions = ["LOGIN", "LOGOUT", "ENROLL", "VIEW_LESSON", "PAYMENT_SUCCESS", "PROFILE_UPDATED", "COMMENT"]
for _ in range(100):
    user = random.choice(clean_all_users)
    ActivityLog.objects.create(
        user=user,
        action=random.choice(log_actions),
        description=f"Action by {user.full_name}",
        entity_type=random.choice(["Course", "Lesson", "Payment", "User"]),
        entity_id=random.randint(1, 50),
        ip_address=f"192.168.1.{random.randint(1, 254)}",
    )




print("  → Realtime chat...")
from realtime.models import ChatRoom, ChatMessage

for _ in range(10):
    stud = random.choice(clean_students)
    instr = random.choice(instructor_users)

    u1, u2 = (stud, instr) if stud.id < instr.id else (instr, stud)
    room, _ = ChatRoom.objects.get_or_create(user1=u1, user2=u2)

    for m in range(random.randint(1, 5)):
        sender = random.choice([stud, instr])
        ChatMessage.objects.create(
            room=room,
            sender=sender,
            content=f"Seed message {m+1} in room {room.id} by {sender.username}",
        )




print("  → Registration Forms & Applications...")
form, _ = RegistrationForm.objects.update_or_create(
    type="instructor_application",
    defaults={
        'title': "Đăng ký làm giảng viên",
        'description': "Form đăng ký trở thành giảng viên trên nền tảng",
        'is_active': True,
        'version': 1,
        'created_by': admin_obj,
    }
)
q1, _ = FormQuestion.objects.update_or_create(
    form=form, order=1,
    defaults={
        'label': "Lĩnh vực chuyên môn của bạn?",
        'type': "text",
        'required': True,
        'placeholder': "VD: Web Development",
    }
)
q2, _ = FormQuestion.objects.update_or_create(
    form=form, order=2,
    defaults={
        'label': "Số năm kinh nghiệm?",
        'type': "number",
        'required': True,
        'placeholder': "VD: 5",
    }
)
q3, _ = FormQuestion.objects.update_or_create(
    form=form, order=3,
    defaults={
        'label': "Tại sao bạn muốn trở thành giảng viên?",
        'type': "textarea",
        'required': True,
        'placeholder': "Chia sẻ động lực của bạn...",
    }
)
q4, _ = FormQuestion.objects.update_or_create(
    form=form, order=4,
    defaults={
        'label': "Bạn có kinh nghiệm giảng dạy không?",
        'type': "radio",
        'required': True,
        'options': ["Có", "Không", "Một chút"],
    }
)


for u in instructor_users[:5]:
    app, _ = Application.objects.update_or_create(
        user=u, form=form,
        defaults={
            'status': "approved",
            'reviewed_by': admin_obj,
            'reviewed_at': past(30),
            'admin_notes': "Đáp ứng yêu cầu.",
        }
    )

    ApplicationResponse.objects.update_or_create(application=app, question=q1, defaults={'value': "Web Development"})
    ApplicationResponse.objects.update_or_create(application=app, question=q2, defaults={'value': 5})
    ApplicationResponse.objects.update_or_create(application=app, question=q3, defaults={'value': "Muốn chia sẻ kiến thức"})
    ApplicationResponse.objects.update_or_create(application=app, question=q4, defaults={'value': "Có"})


for u in clean_students[:3]:
    app, _ = Application.objects.update_or_create(
        user=u, form=form,
        defaults={'status': "pending"}
    )
    ApplicationResponse.objects.update_or_create(application=app, question=q1, defaults={'value': "Data Science"})
    ApplicationResponse.objects.update_or_create(application=app, question=q2, defaults={'value': 2})
    ApplicationResponse.objects.update_or_create(application=app, question=q3, defaults={'value': "Muốn thử sức"})
    ApplicationResponse.objects.update_or_create(application=app, question=q4, defaults={'value': "Không"})




print("  → Subscription Consents...")
for course in courses[:30]:
    if course.instructor:
        try:
            CourseSubscriptionConsent.objects.create(
                instructor=course.instructor,
                course=course,
                consent_status=random.choice(["opted_in", "opted_in", "opted_out"]),
                note="Đồng ý tham gia gói subscription" if random.random() < 0.7 else None,
            )
        except Exception:
            pass




print("  → Subscription Usage...")
for us in user_subs:
    plan_course_ids = PlanCourse.objects.filter(plan=us.plan, status="active").values_list('course_id', flat=True)[:5]
    for cid in plan_course_ids:
        try:
            SubscriptionUsage.objects.create(
                user_subscription=us, user=us.user,
                course_id=cid,
                usage_type="course_access",
                access_count=random.randint(1, 20),
                consumed_minutes=random.randint(30, 600),
            )
        except Exception:
            pass




print("\n✅ Seed complete!")
print(f"   Users: {User.objects.count()}")
print(f"   Categories: {Category.objects.count()}")
print(f"   Courses: {Course.objects.count()}")
print(f"   Modules: {CourseModule.objects.count()}")
print(f"   Lessons: {Lesson.objects.count()}")
print(f"   Enrollments: {Enrollment.objects.count()}")
print(f"   Payments: {Payment.objects.count()}")
print(f"   Reviews: {Review.objects.count()}")
print(f"   Blog Posts: {BlogPost.objects.count()}")
print(f"   Notifications: {Notification.objects.count()}")
print(f"   Quiz Questions: {QuizQuestion.objects.count()}")
