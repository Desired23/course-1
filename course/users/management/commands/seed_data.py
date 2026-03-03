"""
Django management command to populate the database with realistic fake data.
Usage:  python manage.py seed_data
        python manage.py seed_data --clear   (wipe then re-seed)
"""
import random
from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from users.models import User
from categories.models import Category
from instructor_levels.models import InstructorLevel
from instructors.models import Instructor
from courses.models import Course
from coursemodules.models import CourseModule
from lessons.models import Lesson
from enrollments.models import Enrollment
from reviews.models import Review
from notifications.models import Notification
from wishlists.models import Wishlist

# ── Image URLs provided ──────────────────────────────────────────────

COURSE_THUMBNAILS = {
    "javascript": "https://img-c.udemycdn.com/course/750x422/851712_fc61_6.jpg",
    "react": "https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg",
    "python": "https://img-c.udemycdn.com/course/750x422/567828_67d0.jpg",
    "web_bootcamp": "https://img-c.udemycdn.com/course/750x422/625204_436a_3.jpg",
    "data_science": "https://img-c.udemycdn.com/course/750x422/903744_8eb2.jpg",
    "finance": "https://img-c.udemycdn.com/course/750x422/648826_f0e5_4.jpg",
    "ml": "https://img-c.udemycdn.com/course/750x422/950390_270f_3.jpg",
    "uiux": "https://img-c.udemycdn.com/course/750x422/1601108_4347_6.jpg",
    "nodejs": "https://img-c.udemycdn.com/course/750x422/1879018_95b6_3.jpg",
    "typescript": "https://img-c.udemycdn.com/course/750x422/947098_02ec_2.jpg",
    "react_advanced": "https://img-c.udemycdn.com/course/750x422/4298574_078e.jpg",
    "fullstack": "https://img-c.udemycdn.com/course/750x422/2776760_f176_10.jpg",
    "tailwind": "https://img-c.udemycdn.com/course/750x422/3584340_8ed6_2.jpg",
    "mobile_dev": "https://img-c.udemycdn.com/course/750x422/959700_8bd2_12.jpg",
    "flutter": "https://img-c.udemycdn.com/course/750x422/1708340_7108_5.jpg",
    "game_dev": "https://img-c.udemycdn.com/course/750x422/258316_2b37_12.jpg",
    "data_viz": "https://img-c.udemycdn.com/course/750x422/396876_cc92_7.jpg",
    "ai": "https://img-c.udemycdn.com/course/750x422/5566382_5d19.jpg",
    "graphic_design": "https://img-c.udemycdn.com/course/750x422/1643044_e281.jpg",
    "ios": "https://img-c.udemycdn.com/course/750x422/1778502_f4b9_12.jpg",
    "devops": "https://img-c.udemycdn.com/course/750x422/3490000_be35_2.jpg",
}

AVATARS = [
    "https://img-c.udemycdn.com/user/200_H/31926668_94e7_6.jpg",   # male 1
    "https://img-c.udemycdn.com/user/200_H/38516954_b11c_3.jpg",   # male 2
    "https://img-c.udemycdn.com/user/200_H/13952972_e853.jpg",     # male 3
    "https://img-c.udemycdn.com/user/200_H/9685726_67e7_4.jpg",    # male 4
    "https://img-c.udemycdn.com/user/200_H/199907082_3148_2.jpg",  # female 1
    "https://img-c.udemycdn.com/user/200_H/35906398_7c0c_3.jpg",   # female 2
    "https://img-c.udemycdn.com/user/200_H/51770164_07e5_2.jpg",   # female 3
    "https://img-c.udemycdn.com/user/200_H/6014906_bceb_5.jpg",    # female 4
]

DEFAULT_PASSWORD = make_password("password123")


class Command(BaseCommand):
    help = "Seed the database with realistic fake data for UI testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all seeded data before re-seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing data …")
            Review.objects.all().delete()
            Notification.objects.all().delete()
            Wishlist.objects.all().delete()
            Enrollment.objects.all().delete()
            Lesson.objects.all().delete()
            CourseModule.objects.all().delete()
            Course.objects.all().delete()
            Instructor.objects.all().delete()
            InstructorLevel.objects.all().delete()
            Category.objects.filter(parent_category__isnull=False).delete()
            Category.objects.all().delete()
            User.objects.exclude(user_type="admin").delete()
            self.stdout.write(self.style.SUCCESS("Cleared."))

        self._seed()
        self.stdout.write(self.style.SUCCESS("✓ Seed data created successfully!"))

    # ──────────────────────────────────────────────────────────────────
    def _seed(self):
        now = timezone.now()

        # 1. Instructor level (required FK)
        level, _ = InstructorLevel.objects.get_or_create(
            name="Silver",
            defaults={
                "description": "Mid-tier instructor level",
                "min_students": 50,
                "min_revenue": Decimal("5000.00"),
                "commission_rate": Decimal("25.00"),
            },
        )
        self.stdout.write(f"  InstructorLevel: {level}")

        # 2. Categories (parent + sub)
        cats_data = [
            ("Lập trình", "Các khóa học về lập trình và phát triển phần mềm", [
                "JavaScript", "Python", "Java", "C++", "TypeScript",
            ]),
            ("Phát triển Web", "Front-end, Back-end và Full-stack", [
                "React", "Node.js", "Fullstack", "Tailwind CSS",
            ]),
            ("Khoa học dữ liệu", "Phân tích, trực quan hóa và AI", [
                "Machine Learning", "Data Visualization", "AI",
            ]),
            ("Thiết kế", "UI/UX và Graphic Design", [
                "UI/UX Design", "Graphic Design",
            ]),
            ("Di động", "Phát triển ứng dụng mobile", [
                "Flutter", "iOS Development",
            ]),
            ("DevOps & Cloud", "CI/CD, Docker, Kubernetes", [
                "DevOps", "Cloud Computing",
            ]),
        ]

        parent_cats = {}
        sub_cats = {}
        for pname, pdesc, subs in cats_data:
            parent, _ = Category.objects.get_or_create(
                name=pname,
                defaults={"description": pdesc, "status": "active"},
            )
            parent_cats[pname] = parent
            for sname in subs:
                sub, _ = Category.objects.get_or_create(
                    name=sname,
                    defaults={
                        "description": f"Khóa học {sname}",
                        "parent_category": parent,
                        "status": "active",
                    },
                )
                sub_cats[sname] = sub
        self.stdout.write(f"  Categories: {len(parent_cats)} parents, {len(sub_cats)} subs")

        # 3. Admin user
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "full_name": "Quản trị viên",
                "email": "admin@example.com",
                "password_hash": DEFAULT_PASSWORD,
                "avatar": AVATARS[0],
                "user_type": "admin",
                "status": "active",
            },
        )
        self.stdout.write(f"  Admin user: {admin_user.username}")

        # 4. Users — instructors
        instructor_users_data = [
            ("nguyenvana", "Nguyễn Văn A", "nguyenvana@example.com", AVATARS[0]),
            ("tranthib", "Trần Thị B", "tranthib@example.com", AVATARS[4]),
            ("levanc", "Lê Văn C", "levanc@example.com", AVATARS[1]),
            ("phamthid", "Phạm Thị D", "phamthid@example.com", AVATARS[5]),
        ]
        instructor_users = []
        for uname, fname, email, avatar in instructor_users_data:
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults={
                    "full_name": fname,
                    "email": email,
                    "password_hash": DEFAULT_PASSWORD,
                    "avatar": avatar,
                    "user_type": "instructor",
                    "status": "active",
                },
            )
            instructor_users.append(u)
        self.stdout.write(f"  Instructor users: {len(instructor_users)}")

        # 4. Users — students
        student_users_data = [
            ("student01", "Hoàng Minh", "student01@example.com", AVATARS[2]),
            ("student02", "Lý Thị Mai", "student02@example.com", AVATARS[6]),
            ("student03", "Đỗ Quốc Hưng", "student03@example.com", AVATARS[3]),
            ("student04", "Vũ Thị Lan", "student04@example.com", AVATARS[7]),
            ("student05", "Bùi Đức Anh", "student05@example.com", AVATARS[0]),
        ]
        student_users = []
        for uname, fname, email, avatar in student_users_data:
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults={
                    "full_name": fname,
                    "email": email,
                    "password_hash": DEFAULT_PASSWORD,
                    "avatar": avatar,
                    "user_type": "student",
                    "status": "active",
                },
            )
            student_users.append(u)
        self.stdout.write(f"  Student users: {len(student_users)}")

        # 5. Instructor profiles
        instructor_profiles_data = [
            {
                "user": instructor_users[0],
                "bio": "Chuyên gia JavaScript & React với 10+ năm kinh nghiệm. Đã đào tạo hơn 50,000 học viên trên toàn thế giới.",
                "specialization": "Web Development",
                "qualification": "Thạc sĩ Khoa học Máy tính",
                "experience": 10,
                "rating": Decimal("4.85"),
                "total_students": 52340,
                "total_courses": 5,
            },
            {
                "user": instructor_users[1],
                "bio": "Kỹ sư AI/ML tại một công ty công nghệ hàng đầu. Đam mê chia sẻ kiến thức về khoa học dữ liệu và trí tuệ nhân tạo.",
                "specialization": "Data Science & AI",
                "qualification": "Tiến sĩ Trí tuệ nhân tạo",
                "experience": 8,
                "rating": Decimal("4.72"),
                "total_students": 38200,
                "total_courses": 4,
            },
            {
                "user": instructor_users[2],
                "bio": "Full-stack developer với kinh nghiệm tại nhiều startup. Chuyên gia Node.js, TypeScript và DevOps.",
                "specialization": "Full-stack & DevOps",
                "qualification": "Cử nhân Công nghệ thông tin",
                "experience": 7,
                "rating": Decimal("4.65"),
                "total_students": 28500,
                "total_courses": 4,
            },
            {
                "user": instructor_users[3],
                "bio": "Nhà thiết kế UX/UI với hơn 6 năm kinh nghiệm. Chuyên thiết kế giao diện người dùng cho ứng dụng web và mobile.",
                "specialization": "UI/UX & Mobile Design",
                "qualification": "Cử nhân Thiết kế đồ họa",
                "experience": 6,
                "rating": Decimal("4.58"),
                "total_students": 15800,
                "total_courses": 3,
            },
        ]

        instructors = []
        for data in instructor_profiles_data:
            inst, _ = Instructor.objects.get_or_create(
                user=data["user"],
                defaults={
                    "bio": data["bio"],
                    "specialization": data["specialization"],
                    "qualification": data["qualification"],
                    "experience": data["experience"],
                    "rating": data["rating"],
                    "total_students": data["total_students"],
                    "total_courses": data["total_courses"],
                    "level": level,
                    "social_links": {
                        "website": "https://example.com",
                        "youtube": "https://youtube.com/@example",
                    },
                },
            )
            instructors.append(inst)
        self.stdout.write(f"  Instructors: {len(instructors)}")

        # 6. Courses
        thumb_keys = list(COURSE_THUMBNAILS.keys())
        courses_data = [
            # instructor_idx, title, short_desc, cat_parent, cat_sub, thumb_key, price, level, duration, total_lessons, total_modules, is_featured
            (0, "Khóa học JavaScript từ cơ bản đến nâng cao",
             "Học JavaScript toàn diện: cú pháp, DOM, Async, ES6+ và xây dựng dự án thực tế.",
             "Lập trình", "JavaScript", "javascript", 799000, "beginner", 1800, 85, 12, True),

            (0, "React - Xây dựng ứng dụng web hiện đại",
             "Thành thạo React 18, Hooks, Context API, Router và triển khai dự án thực tế.",
             "Phát triển Web", "React", "react", 999000, "intermediate", 2400, 120, 15, True),

            (0, "TypeScript cho lập trình viên JavaScript",
             "Nâng cao kỹ năng JS với TypeScript: generics, decorators, advanced types.",
             "Lập trình", "TypeScript", "typescript", 599000, "intermediate", 900, 45, 8, False),

            (0, "React Advanced Patterns & Performance",
             "Kỹ thuật nâng cao: HOC, render props, compound components, memoization.",
             "Phát triển Web", "React", "react_advanced", 1299000, "advanced", 1500, 65, 10, True),

            (0, "Tailwind CSS - Thiết kế web nhanh chóng",
             "Xây dựng giao diện đẹp mắt và responsive với Tailwind CSS v4.",
             "Phát triển Web", "Tailwind CSS", "tailwind", 499000, "beginner", 600, 35, 6, False),

            (1, "Python cho người mới bắt đầu",
             "Hành trình từ zero đến hero với Python: cú pháp, OOP, file I/O.",
             "Lập trình", "Python", "python", 699000, "beginner", 1500, 75, 10, True),

            (1, "Khoa học dữ liệu với Python",
             "NumPy, Pandas, Matplotlib, Scikit-learn và phân tích dữ liệu thực tế.",
             "Khoa học dữ liệu", "Data Visualization", "data_science", 1199000, "intermediate", 2100, 95, 14, True),

            (1, "Machine Learning A-Z",
             "Từ hồi quy tuyến tính đến mạng neural: toàn diện về Machine Learning.",
             "Khoa học dữ liệu", "Machine Learning", "ml", 1499000, "advanced", 2700, 130, 18, True),

            (1, "Trí tuệ nhân tạo - ChatGPT & Generative AI",
             "Hiểu và ứng dụng AI tổng quát: prompt engineering, LLM, AI agents.",
             "Khoa học dữ liệu", "AI", "ai", 899000, "beginner", 800, 40, 7, False),

            (2, "Node.js & Express - Backend Development",
             "Xây dựng RESTful API với Node.js, Express, MongoDB và Authentication.",
             "Phát triển Web", "Node.js", "nodejs", 899000, "intermediate", 1800, 80, 12, False),

            (2, "Full-stack Web Bootcamp 2025",
             "HTML, CSS, JavaScript, React, Node.js, PostgreSQL - Tất cả trong một.",
             "Phát triển Web", "Fullstack", "web_bootcamp", 1599000, "beginner", 3600, 180, 25, True),

            (2, "DevOps từ cơ bản đến thực chiến",
             "Docker, Kubernetes, CI/CD, AWS và tự động hóa quy trình.",
             "DevOps & Cloud", "DevOps", "devops", 1199000, "intermediate", 2000, 90, 13, False),

            (2, "Fullstack JavaScript với MERN Stack",
             "MongoDB, Express, React, Node.js - Xây dựng ứng dụng full-stack hoàn chỉnh.",
             "Phát triển Web", "Fullstack", "fullstack", 1099000, "intermediate", 2200, 100, 16, False),

            (3, "UI/UX Design - Thiết kế trải nghiệm người dùng",
             "Figma, wireframing, prototyping và nguyên tắc thiết kế UX chuyên nghiệp.",
             "Thiết kế", "UI/UX Design", "uiux", 799000, "beginner", 1200, 55, 9, True),

            (3, "Flutter - Phát triển ứng dụng đa nền tảng",
             "Xây dựng ứng dụng iOS & Android chỉ với một codebase duy nhất.",
             "Di động", "Flutter", "flutter", 999000, "intermediate", 1800, 85, 12, False),

            (3, "Graphic Design Masterclass",
             "Illustrator, Photoshop, thiết kế logo, branding và portfolio chuyên nghiệp.",
             "Thiết kế", "Graphic Design", "graphic_design", 699000, "beginner", 1000, 50, 8, False),
        ]

        courses = []
        for idx, (inst_idx, title, short_desc, cat_p, cat_s, thumb_k, price, lvl, dur, tl, tm, featured) in enumerate(courses_data):
            discount = None
            discount_start = None
            discount_end = None
            if random.random() < 0.4:
                discount = Decimal(str(int(price * 0.6)))
                discount_start = now - timedelta(days=3)
                discount_end = now + timedelta(days=14)

            c, _ = Course.objects.get_or_create(
                title=title,
                defaults={
                    "shortdescription": short_desc,
                    "description": f"<p>{short_desc}</p><p>Khóa học này cung cấp kiến thức từ cơ bản đến nâng cao, kèm bài tập thực hành và dự án thực tế.</p>",
                    "instructor": instructors[inst_idx],
                    "category": parent_cats[cat_p],
                    "subcategory": sub_cats[cat_s],
                    "thumbnail": COURSE_THUMBNAILS[thumb_k],
                    "price": Decimal(str(price)),
                    "discount_price": discount,
                    "discount_start_date": discount_start,
                    "discount_end_date": discount_end,
                    "level": lvl,
                    "language": "Vietnamese",
                    "duration": dur,
                    "total_lessons": tl,
                    "total_modules": tm,
                    "requirements": "Không cần kinh nghiệm trước. Chỉ cần máy tính và sẵn sàng học.",
                    "status": "published",
                    "is_featured": featured,
                    "is_public": True,
                    "rating": Decimal(str(round(random.uniform(3.8, 5.0), 2))),
                    "total_reviews": random.randint(50, 800),
                    "total_students": random.randint(500, 15000),
                },
            )
            courses.append(c)
        self.stdout.write(f"  Courses: {len(courses)}")

        # 7. Course Modules + Lessons
        module_titles_pool = [
            "Giới thiệu", "Cơ bản", "Cấu trúc dữ liệu", "Hàm và Modules",
            "OOP", "Xử lý lỗi", "Async Programming", "APIs & HTTP",
            "Testing", "Deployment", "Bài tập thực hành", "Dự án cuối khóa",
            "Nâng cao", "Best Practices", "Performance",
        ]
        lesson_count = 0
        module_count = 0
        for course in courses:
            if CourseModule.objects.filter(course=course).exists():
                continue
            num_modules = random.randint(4, 8)
            for m_idx in range(num_modules):
                mod_title = module_titles_pool[m_idx % len(module_titles_pool)]
                mod = CourseModule.objects.create(
                    course=course,
                    title=f"{mod_title} - {course.title[:30]}",
                    description=f"Module {m_idx + 1}: {mod_title}",
                    order_number=m_idx + 1,
                    duration=random.randint(30, 120),
                    status="active",
                )
                module_count += 1
                # Lessons per module
                num_lessons = random.randint(3, 7)
                for l_idx in range(num_lessons):
                    content_type = random.choice(["video", "video", "video", "text", "quiz"])
                    Lesson.objects.create(
                        coursemodule=mod,
                        title=f"Bài {l_idx + 1}: Nội dung {mod_title.lower()}",
                        description=f"Lesson về {mod_title}",
                        content_type=content_type,
                        content=f"<p>Nội dung bài học {l_idx + 1}</p>" if content_type == "text" else "",
                        video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" if content_type == "video" else "",
                        duration=random.randint(5, 30),
                        is_free=(l_idx == 0),  # first lesson free
                        order=l_idx + 1,
                        status="published",
                    )
                    lesson_count += 1
        self.stdout.write(f"  Modules: {module_count}, Lessons: {lesson_count}")

        # 8. Enrollments
        enrollment_count = 0
        for student in student_users:
            # Each student enrolls in 3-6 random courses
            enrolled_courses = random.sample(courses, min(random.randint(3, 6), len(courses)))
            for course in enrolled_courses:
                _, created = Enrollment.objects.get_or_create(
                    user=student,
                    course=course,
                    defaults={
                        "enrollment_date": now - timedelta(days=random.randint(5, 90)),
                        "progress": Decimal(str(round(random.uniform(0, 100), 2))),
                        "status": random.choice(["active", "active", "active", "complete"]),
                    },
                )
                if created:
                    enrollment_count += 1
        self.stdout.write(f"  Enrollments: {enrollment_count}")

        # 9. Reviews
        review_comments = [
            "Khóa học rất hay và dễ hiểu! Giảng viên giải thích rõ ràng từng bước.",
            "Nội dung phong phú, nhiều bài tập thực hành. Rất đáng tiền!",
            "Tuyệt vời! Đã học được rất nhiều kiến thức mới.",
            "Giảng viên nhiệt tình, hỗ trợ nhanh chóng khi có thắc mắc.",
            "Khóa học cơ bản nhưng đầy đủ. Phù hợp cho người mới bắt đầu.",
            "Chất lượng video tốt, slide đẹp, ví dụ thực tế.",
            "Một số phần hơi nhanh, nhưng nhìn chung rất tốt.",
            "Đã hoàn thành khóa học. Tự tin áp dụng vào dự án thực tế.",
            "Giảng viên rất am hiểu và chia sẻ nhiều kinh nghiệm thực tế.",
            "Nên bổ sung thêm bài tập, nhưng nội dung lý thuyết rất chắc.",
            "Khóa học xứng đáng 5 sao. Sẽ giới thiệu cho bạn bè.",
            "Học xong khóa này đã tìm được việc mới. Cảm ơn giảng viên!",
        ]
        instructor_responses = [
            "Cảm ơn bạn đã đánh giá! Rất vui khi khóa học giúp ích cho bạn.",
            "Cảm ơn feedback! Mình sẽ cập nhật thêm bài tập trong thời gian tới.",
            "Chúc bạn thành công với kiến thức đã học! 🎉",
            None, None, None,  # some reviews have no response
        ]
        review_count = 0
        for student in student_users:
            enrollments = Enrollment.objects.filter(user=student)
            for enrollment in enrollments:
                if random.random() < 0.75:
                    rating = random.choices([5, 4, 3, 4, 5], weights=[35, 30, 10, 15, 10])[0]
                    resp = random.choice(instructor_responses)
                    _, created = Review.objects.get_or_create(
                        course=enrollment.course,
                        user=student,
                        defaults={
                            "rating": rating,
                            "comment": random.choice(review_comments),
                            "status": "approved",
                            "likes": random.randint(0, 25),
                            "instructor_response": resp,
                            "response_at": now - timedelta(days=random.randint(1, 5)) if resp else None,
                        },
                    )
                    if created:
                        review_count += 1
        self.stdout.write(f"  Reviews: {review_count}")

        # 10. Notifications
        notif_templates = [
            ("system", "Chào mừng bạn đến với hệ thống!", "Hãy bắt đầu hành trình học tập của bạn ngay hôm nay."),
            ("course", "Khóa học mới đã được cập nhật", "Khóa học bạn đăng ký vừa có nội dung mới. Hãy kiểm tra ngay!"),
            ("payment", "Thanh toán thành công", "Bạn đã thanh toán thành công. Chúc bạn học tập vui vẻ!"),
            ("promotion", "Ưu đãi đặc biệt!", "Giảm 40% cho tất cả khóa học trong tuần này. Đừng bỏ lỡ!"),
            ("course", "Bạn đã hoàn thành 50% khóa học", "Tiếp tục phát huy! Bạn đã hoàn thành 50% khóa học."),
            ("system", "Cập nhật hệ thống", "Hệ thống đã được nâng cấp để mang lại trải nghiệm tốt hơn."),
            ("promotion", "Flash Sale cuối tuần", "Chỉ còn 2 ngày! Giảm giá đến 60% nhiều khóa học."),
            ("course", "Giảng viên đã phản hồi đánh giá của bạn", "Xem phản hồi từ giảng viên về đánh giá mới nhất."),
        ]
        notif_count = 0
        for student in student_users:
            for ntype, ntitle, nmsg in random.sample(notif_templates, min(5, len(notif_templates))):
                Notification.objects.create(
                    title=ntitle,
                    sender=None,
                    receiver=student,
                    message=nmsg,
                    is_read=random.random() < 0.3,
                    type=ntype,
                )
                notif_count += 1
        self.stdout.write(f"  Notifications: {notif_count}")

        # 11. Wishlists (each student wishlists 1-3 non-enrolled courses)
        wishlist_count = 0
        for student in student_users:
            enrolled_ids = set(Enrollment.objects.filter(user=student).values_list("course_id", flat=True))
            available = [c for c in courses if c.id not in enrolled_ids]
            if available:
                wished = random.sample(available, min(random.randint(1, 3), len(available)))
                for course in wished:
                    _, created = Wishlist.objects.get_or_create(
                        user=student,
                        course=course,
                    )
                    if created:
                        wishlist_count += 1
        self.stdout.write(f"  Wishlists: {wishlist_count}")

        # Summary
        self.stdout.write("")
        self.stdout.write("  ─── Summary ───")
        self.stdout.write(f"  Users:        {User.objects.count()}")
        self.stdout.write(f"  Instructors:  {Instructor.objects.count()}")
        self.stdout.write(f"  Categories:   {Category.objects.count()}")
        self.stdout.write(f"  Courses:      {Course.objects.count()}")
        self.stdout.write(f"  Modules:      {CourseModule.objects.count()}")
        self.stdout.write(f"  Lessons:      {Lesson.objects.count()}")
        self.stdout.write(f"  Enrollments:  {Enrollment.objects.count()}")
        self.stdout.write(f"  Reviews:      {Review.objects.count()}")
        self.stdout.write(f"  Notifications:{Notification.objects.count()}")
        self.stdout.write(f"  Wishlists:    {Wishlist.objects.count()}")
        self.stdout.write(f"  Login:  username='admin', password='password123' (admin)")
        self.stdout.write(f"  Login:  username='nguyenvana', password='password123' (instructor)")
        self.stdout.write(f"  Login:  username='student01', password='password123' (student)")
