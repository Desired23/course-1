# 📖 API Documentation - Frontend Integration Guide

> **Base URL:** `https://course-604d.onrender.com`  
> **Auth:** JWT Bearer Token (SimpleJWT) — Header: `Authorization: Bearer <access_token>`  
> **Content-Type:** `application/json` (trừ upload file dùng `multipart/form-data`)  
> **Pagination:** Mặc định `?page=1&page_size=10` cho tất cả list endpoint  
> **WebSocket:** `wss://course-604d.onrender.com/ws/notifications/?token=<access_token>`

---

## Mục lục

1. [Authentication & Users](#1-authentication--users)
2. [Courses](#2-courses)
3. [Categories](#3-categories)
4. [Instructors](#4-instructors)
5. [Course Modules](#5-course-modules)
6. [Lessons](#6-lessons)
7. [Lesson Attachments](#7-lesson-attachments)
8. [Lesson Comments](#8-lesson-comments)
9. [Enrollments](#9-enrollments)
10. [Learning Progress](#10-learning-progress)
11. [Quiz Questions & Test Cases](#11-quiz-questions--test-cases)
12. [Quiz Results](#12-quiz-results)
13. [Payments & VNPay](#13-payments--vnpay)
14. [Refunds](#14-refunds)
15. [Payment Methods](#15-payment-methods)
16. [Carts](#16-carts)
17. [Wishlists](#17-wishlists)
18. [Reviews](#18-reviews)
19. [Promotions](#19-promotions)
20. [Subscription Plans](#20-subscription-plans)
21. [User Subscriptions](#21-user-subscriptions)
22. [Notification](#22-notifications)
23. [Blog Posts](#23-blog-posts)
24. [QnA (Questions & Answers)](#24-qna-questions--answers)
25. [Forums](#25-forums)
26. [Forum Topics](#26-forum-topics)
27. [Forum Comments](#27-forum-comments)
28. [Support Tickets](#28-support-tickets)
29. [Support Replies](#29-support-replies)
30. [Certificates](#30-certificates)
31. [Registration Forms](#31-registration-forms)
32. [Applications (Instructor Application)](#32-applications)
33. [Instructor Earnings](#33-instructor-earnings)
34. [Instructor Payouts](#34-instructor-payouts)
35. [Instructor Levels](#35-instructor-levels)
36. [Admin Management](#36-admin-management)
37. [Admin Dashboard & Analytics](#37-admin-dashboard--analytics)
38. [Activity Logs](#38-activity-logs)
39. [System Settings](#39-system-settings)
40. [File Upload (Cloudinary)](#40-file-upload-cloudinary)
41. [WebSocket - Realtime Notifications](#41-websocket---realtime-notifications)

---

## Conventions

| Ký hiệu | Ý nghĩa |
|----------|---------|
| 🔓 | Public (không cần auth) |
| 🔑 | Cần JWT token |
| 👑 | Chỉ Admin |
| 🎓 | Instructor |
| 🧑‍🎓 | Student |
| 📄 | Có phân trang (pagination) |

**Pagination params cho tất cả list endpoint:**
```
?page=1&page_size=10
```

**Response format phân trang:**
```json
{
  "count": 100,
  "next": "http://...?page=2",
  "previous": null,
  "results": [...]
}
```

**Error response format:**
```json
{
  "errors": "Chi tiết lỗi" 
}
// hoặc
{
  "error": "Chi tiết lỗi"
}
```

---

## 1. Authentication & Users

### 1.1 Đăng ký tài khoản
```
POST /api/users/register
```
🔓 Public | Rate limit: 3/min

**Request Body:**
```json
{
  "username": "string (required, unique)",
  "email": "string (required, unique)",
  "password_hash": "string (required)",
  "full_name": "string (required)",
  "phone": "string (optional)",
  "avatar": "string (optional, URL)",
  "address": "string (optional)",
  "user_type": "student | instructor | admin"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "phone": null,
  "avatar": null,
  "address": null,
  "created_at": "2025-01-01T00:00:00Z",
  "last_login": null,
  "status": "active",
  "user_type": "student"
}
```

---

### 1.2 Đăng nhập
```
POST /api/users/login
```
🔓 Public | Rate limit: 5/min

**Request Body:**
```json
{
  "email": "string (required)",
  "password_hash": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "user_type": "student",
    "status": "active"
  }
}
```

---

### 1.3 Xem thông tin user
```
GET /api/users/{user_id}
```
🔑 Admin / Instructor / Student | Rate limit: 60/min

**Response:** `200 OK` — Trả về `UserSerializer` (xem cấu trúc tại 1.1 Response)

---

### 1.4 User tự cập nhật thông tin
```
PATCH /api/users/{user_id}/updateinfo
```
🔑 Chính chủ hoặc Admin | Rate limit: 60/min

> ⚠️ User chỉ được cập nhật profile của chính mình. Admin có thể update bất kỳ user.

**Request Body** (tất cả optional):
```json
{
  "username": "string",
  "email": "string",
  "full_name": "string",
  "phone": "string",
  "avatar": "string (URL)",
  "address": "string",
  "password_hash": "string"
}
```

**Read-only fields** (không thay đổi được): `id`, `created_at`, `last_login`, `status`, `user_type`

**Response:** `200 OK` — `UserUpdateBySelfSerializer`

---

### 1.5 Admin quản lý Users

#### Tạo user
```
POST /api/users/create
```
👑 Admin only | Rate limit: 60/min

**Request Body:** Giống 1.1

**Response:** `201 Created`

#### Danh sách users
```
GET /api/users/
```
👑 Admin only | 📄 Phân trang | Rate limit: 60/min

#### Cập nhật user (Admin)
```
PATCH /api/users/{user_id}/update
```
👑 Admin only | Rate limit: 60/min

#### Xóa user (soft delete)
```
DELETE /api/users/{user_id}/delete
```
👑 Admin only | Rate limit: 60/min

**Response:** `200 OK`
```json
{
  "message": "User deleted successfully."
}
```

---

## 2. Courses

### 2.1 Danh sách khóa học
```
GET /api/courses/
```
🔓 Public | 📄 Phân trang | Rate limit: 30/min

**Response:** `200 OK` — Mảng `CourseSerializer`
```json
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "title": "Python cơ bản",
      "shortdescription": "Học Python từ đầu",
      "description": "Mô tả chi tiết...",
      "instructor": 1,
      "category": 2,
      "subcategory": 5,
      "thumbnail": "https://res.cloudinary.com/...",
      "price": "500000.00",
      "discount_price": "350000.00",
      "discount_start_date": "2025-01-01T00:00:00Z",
      "discount_end_date": "2025-02-01T00:00:00Z",
      "level": "beginner | intermediate | advanced | all_levels",
      "language": "Tiếng Việt",
      "duration": 1200,
      "total_lessons": 30,
      "total_modules": 5,
      "requirements": "Không cần kiến thức trước...",
      "status": "draft | pending | published | rejected | archived",
      "is_featured": false,
      "is_public": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z",
      "published_date": "2025-01-10T00:00:00Z",
      "rating": "4.50",
      "total_reviews": 10,
      "total_students": 100,
      "certificate": true
    }
  ]
}
```

### 2.2 Chi tiết khóa học
```
GET /api/courses/{course_id}
```
🔓 Public (có thể truyền token để xem thêm enrollment info) | Rate limit: 30/min

**Response:** `200 OK` — Chi tiết đầy đủ bao gồm instructor info, modules, lessons lồng nhau

### 2.3 Tạo khóa học
```
POST /api/courses/create
```
🔑 Admin / Instructor | Rate limit: 30/min

**Request Body:**
```json
{
  "title": "string (required)",
  "shortdescription": "string",
  "description": "string",
  "instructor": "integer (instructor_id)",
  "category": "integer (category_id)",
  "subcategory": "integer (category_id)",
  "thumbnail": "string (URL)",
  "price": "decimal",
  "discount_price": "decimal",
  "discount_start_date": "datetime",
  "discount_end_date": "datetime",
  "level": "beginner | intermediate | advanced | all_levels",
  "language": "string (default: 'Tiếng Việt')",
  "requirements": "string",
  "status": "draft | pending | published",
  "is_featured": "boolean",
  "is_public": "boolean",
  "certificate": "boolean"
}
```

**Response:** `201 Created`

### 2.4 Cập nhật khóa học
```
PATCH /api/courses/{course_id}/update
```
🔑 Admin / Instructor (chủ sở hữu) | Rate limit: 30/min

**Request Body:** Giống 2.3 (chỉ gửi field cần update)

### 2.5 Xóa khóa học
```
DELETE /api/courses/{course_id}/delete
```
🔑 Admin / Instructor (chủ sở hữu) | Rate limit: 30/min

---

## 3. Categories

### 3.1 Danh sách categories (active, public)
```
GET /api/categories/active
```
🔓 Public | 📄 Phân trang | Rate limit: 30/min

### 3.2 Sub-categories
```
GET /api/categories/{category_id}/subcategories
```
🔓 Public | 📄 Phân trang | Rate limit: 30/min

### 3.3 Danh sách tất cả categories
```
GET /api/categories/
```
🔑 Admin / Instructor | 📄 Phân trang | Rate limit: 60/min

### 3.4 Chi tiết category
```
GET /api/categories/{category_id}
```
🔑 Admin / Instructor | Rate limit: 60/min

### 3.5 Tạo category
```
POST /api/categories/create
```
🔑 Admin / Instructor | Rate limit: 60/min

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "parent_category": "integer (optional, category_id cho subcategory)",
  "status": "active | inactive",
  "icon": "string (URL)"
}
```

### 3.6 Cập nhật category
```
PATCH /api/categories/{category_id}
```
🔑 Admin / Instructor

### 3.7 Xóa category
```
DELETE /api/categories/{category_id}
```
🔑 Admin / Instructor

---

## 4. Instructors

### 4.1 Danh sách instructors
```
GET /api/instructors/
```
🔓 Public | 📄 Phân trang | Rate limit: 30/min

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "user": 5,
      "bio": "Senior Developer...",
      "specialization": "Python, AI",
      "qualification": "MSc",
      "experience": 5,
      "social_links": {"github": "url", "linkedin": "url"},
      "rating": "4.80",
      "total_students": 500,
      "total_courses": 10,
      "level": 2,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 4.2 Chi tiết instructor
```
GET /api/instructors/{instructor_id}
```
🔑 Admin / Instructor | Rate limit: 60/min

### 4.3 Tạo instructor profile
```
POST /api/instructors/create
```
👑 Admin only | Rate limit: 60/min

**Request Body:**
```json
{
  "user": "integer (user_id, required)",
  "bio": "string",
  "specialization": "string",
  "qualification": "string",
  "experience": "integer (years)",
  "social_links": {"github": "url", "linkedin": "url"},
  "payment_info": {}
}
```

### 4.4 Cập nhật instructor
```
PATCH /api/instructors/{instructor_id}
```
🔑 Admin / Instructor (chủ sở hữu) | Rate limit: 60/min

### 4.5 Xóa instructor
```
DELETE /api/instructors/{instructor_id}
```
👑 Admin only | Rate limit: 60/min

### 4.6 Dashboard thống kê instructor
```
GET /api/instructor/dashboard/stats/
```
🔑 Instructor / Admin | Rate limit: 60/min

**Query Params (Admin):** `?instructor_id=<id>` — xem stats instructor khác

**Response:** `200 OK`
```json
{
  "total_courses": 10,
  "total_students": 500,
  "total_revenue": "50000000.00",
  "total_reviews": 100,
  "average_rating": "4.50",
  "monthly_revenue": [...],
  "course_breakdown": [...]
}
```

### 4.7 Analytics chi tiết khóa học
```
GET /api/instructor/courses/{course_id}/analytics/
```
🔑 Instructor (chủ khóa học) / Admin | Rate limit: 60/min

---

## 5. Course Modules

### 5.1 Danh sách modules
```
GET /api/course_modules/
```
🔓 Public | 📄 Phân trang | Rate limit: 30/min

### 5.2 Chi tiết module
```
GET /api/course_modules/{course_module_id}
```
🔑 Admin / Instructor | Rate limit: 60/min

### 5.3 Tạo module
```
POST /api/course_modules/create
```
🔑 Admin / Instructor | Rate limit: 60/min

**Request Body:**
```json
{
  "course": "integer (course_id, required)",
  "title": "string (required)",
  "description": "string",
  "order": "integer",
  "status": "string"
}
```

### 5.4 Cập nhật module
```
PATCH /api/course_modules/{course_module_id}
```
🔑 Admin / Instructor

### 5.5 Xóa module
```
DELETE /api/course_modules/{course_module_id}
```
🔑 Admin / Instructor

---

## 6. Lessons

### 6.1 Danh sách lessons
```
GET /api/lessons/
```
🔓 Public | 📄 Phân trang | Rate limit: 30/min

### 6.2 Chi tiết lesson
```
GET /api/lessons/{lesson_id}
```
🔑 Admin / Instructor / Student | Rate limit: 60/min

### 6.3 Tạo lesson
```
POST /api/lessons/create
```
🔑 Admin / Instructor | Rate limit: 60/min

**Request Body:**
```json
{
  "course_module": "integer (module_id, required)",
  "title": "string (required)",
  "content_type": "string (video | text | quiz)",
  "content_url": "string (URL)",
  "content_text": "string",
  "duration": "integer (minutes)",
  "order": "integer",
  "is_free": "boolean (default: false)",
  "status": "string"
}
```

### 6.4 Cập nhật lesson
```
PATCH /api/lessons/{lesson_id}
```
🔑 Admin / Instructor

### 6.5 Xóa lesson
```
DELETE /api/lessons/{lesson_id}
```
🔑 Admin / Instructor

---

## 7. Lesson Attachments

### 7.1 Danh sách tất cả attachments
```
GET /api/attachments/
```
🔑 Admin / Instructor | 📄 Phân trang | Rate limit: 60/min

### 7.2 Attachments theo lesson
```
GET /api/attachments/lesson/{lesson_id}/
```
🔑 Admin / Instructor | 📄 Phân trang

### 7.3 Chi tiết attachment
```
GET /api/attachments/detail/{attachment_id}/
```
🔑 Admin / Instructor

### 7.4 Tạo attachment
```
POST /api/attachments/create/
```
🔑 Admin / Instructor | Rate limit: 60/min

**Request Body:**
```json
{
  "lesson": "integer (lesson_id, required)",
  "title": "string (required)",
  "file_path": "string (URL from Cloudinary)",
  "file_type": "string (pdf, doc, zip, etc)",
  "file_size": "integer (bytes)"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "lesson": 5,
  "title": "Slides bài giảng",
  "file_path": "https://res.cloudinary.com/...",
  "file_type": "pdf",
  "file_size": 2048000,
  "download_count": 0,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### 7.5 Cập nhật attachment
```
PATCH /api/attachments/update/{attachment_id}/
```
🔑 Admin / Instructor

### 7.6 Xóa attachment
```
DELETE /api/attachments/delete/{attachment_id}/
```
🔑 Admin / Instructor

---

## 8. Lesson Comments

### 8.1 Danh sách comments (root level) theo lesson
```
GET /api/comments/lesson/{lesson_id}/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 60/min

### 8.2 Chi tiết comment hoặc replies
```
GET /api/comments/{comment_id}
```
🔑 Student / Instructor / Admin

**Query Params:** `?replies=true` — trả về danh sách replies thay vì chi tiết comment

### 8.3 Tạo comment
```
POST /api/comments/create
```
🔑 Student / Instructor / Admin | Rate limit: 60/min

**Request Body:**
```json
{
  "lesson_id": "integer (required)",
  "content": "string (required)",
  "parent_comment": "integer (optional — nếu là reply)"
}
```
> `user_id` được tự động lấy từ JWT token.

### 8.4 Cập nhật comment
```
PATCH /api/comments/{comment_id}/update
```
🔑 Student / Instructor / Admin

**Request Body:**
```json
{
  "content": "string (required)",
  "votes": "integer (optional)"
}
```

### 8.5 Xóa comment
```
DELETE /api/comments/{comment_id}/manage/
```
🔑 Instructor / Admin only

---

## 9. Enrollments

### 9.1 Danh sách enrollment của user hiện tại
```
GET /api/enrollments/
```
🔑 Admin / Instructor / Student | 📄 Phân trang | Rate limit: 60/min

> Tự động lọc theo user từ JWT token.

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "user": 5,
      "course": 10,
      "payment": 3,
      "source": "purchase | subscription",
      "subscription": null,
      "enrollment_date": "2025-01-01T00:00:00Z",
      "expiry_date": null,
      "progress": "45.50",
      "status": "active | complete | expired | cancelled | suspended",
      "last_access_date": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### 9.2 Tạo enrollment
```
POST /api/enrollments/create/
```
🔑 Admin / Instructor / Student | Rate limit: 60/min

> `user_id` tự enforced từ JWT token.

**Request Body:**
```json
{
  "course_id": "integer (required)",
  "payment_id": "integer (optional)",
  "source": "purchase | subscription"
}
```

### 9.3 Chi tiết enrollment
```
GET /api/enrollments/{enrollment_id}/
```
🔑 Admin / Instructor / Student (chỉ xem của mình)

---

## 10. Learning Progress

### 10.1 Cập nhật tiến độ học (tạo mới nếu chưa có)
```
POST /api/learning-progress/update/
```
🔑 Student / Instructor / Admin | Rate limit: 60/min

**Request Body:**
```json
{
  "lesson_id": "integer (required)",
  "progress_percentage": "decimal (0-100, default: 0)",
  "time_spent": "integer (seconds, default: 0)",
  "is_completed": "boolean (default: false)",
  "last_position": "integer (seconds, optional — vị trí video)"
}
```

### 10.2 Cập nhật tiến độ lesson cụ thể
```
PUT /api/learning-progress/{lesson_id}/
```
🔑 Student / Instructor / Admin

**Request Body:** Giống 10.1 (không cần `lesson_id` trong body)

### 10.3 Tiến độ tổng thể khóa học
```
GET /api/learning-progress/course/{course_id}/
```
🔑 Student / Instructor / Admin

**Response:** `200 OK`
```json
{
  "course_id": 10,
  "total_lessons": 30,
  "completed_lessons": 15,
  "overall_progress": "50.00",
  "lessons": [
    {
      "lesson_id": 1,
      "title": "Bài 1",
      "progress_percentage": "100.00",
      "is_completed": true,
      "time_spent": 1800
    }
  ]
}
```

### 10.4 Thống kê học viên (my stats)
```
GET /api/students/my-stats/
```
🔑 Student / Instructor / Admin

**Response:** `200 OK`
```json
{
  "total_enrolled_courses": 5,
  "completed_courses": 2,
  "in_progress_courses": 3,
  "total_time_spent": 36000,
  "average_progress": "65.00",
  "certificates_earned": 2
}
```

---

## 11. Quiz Questions & Test Cases

### 11.1 Danh sách quiz questions
```
GET /api/quiz-questions/
```
🔑 Admin / Instructor | 📄 Phân trang | Rate limit: 60/min

**Query Params:**
- `?question_id=<id>` — chi tiết 1 câu hỏi
- `?lesson_id=<id>` — danh sách theo lesson

### 11.2 Tạo quiz question
```
POST /api/quiz-questions/create/
```
🔑 Admin / Instructor

**Request Body:**
```json
{
  "lesson": "integer (lesson_id, required)",
  "question_text": "string (required)",
  "question_type": "multiple_choice | true_false | short_answer | code",
  "explanation": "string (optional)",
  "points": "integer (default: 1)",
  "order": "integer",
  "options": [
    {
      "option_text": "string",
      "is_correct": "boolean"
    }
  ]
}
```

### 11.3 Cập nhật quiz question
```
PATCH /api/quiz-questions/{question_id}/
```
🔑 Admin / Instructor

### 11.4 Xóa quiz question
```
DELETE /api/quiz-questions/{question_id}/
```
🔑 Admin / Instructor

### 11.5 Quiz cho student (bài thi)
```
GET /api/quizzes/lesson/{lesson_id}/
```
🔑 Student / Instructor / Admin | Rate limit: 60/min

> Trả về câu hỏi ẩn đáp án đúng (student-safe format)

### 11.6 Test Cases (cho câu hỏi code)

#### Danh sách test cases
```
GET /api/test-cases/?question_id={question_id}
```
🔑 Admin / Instructor | 📄 Phân trang

#### Tạo test case
```
POST /api/test-cases/create/
```
🔑 Admin / Instructor

**Request Body:**
```json
{
  "question": "integer (question_id, required)",
  "input_data": "string",
  "expected_output": "string",
  "is_hidden": "boolean (default: false)",
  "order": "integer"
}
```

#### Cập nhật test case
```
PATCH /api/test-cases/{test_case_id}/update/
```

#### Xóa test case
```
DELETE /api/test-cases/{test_case_id}/delete/
```

---

## 12. Quiz Results

### 12.1 Submit quiz (Nộp bài)
```
POST /api/quizzes/submit/
```
🔑 Student / Instructor / Admin | Rate limit: 5/min

**Request Body:**
```json
{
  "lesson_id": "integer (required)",
  "answers": [
    {
      "question_id": "integer",
      "selected_option_id": "integer (cho multiple_choice)",
      "answer_text": "string (cho short_answer)",
      "code": "string (cho code type)"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "quiz_result_id": 1,
  "total_questions": 10,
  "correct_answers": 8,
  "total_points": 10,
  "score": "80.00",
  "passed": true,
  "time_taken": 300,
  "answers": [
    {
      "question_id": 1,
      "is_correct": true,
      "points_earned": 1,
      "correct_answer": "Option A"
    }
  ]
}
```

### 12.2 Lịch sử quiz của user
```
GET /api/quiz-results/user/{user_id}/
```
🔑 Authenticated | Rate limit: 60/min

### 12.3 Chi tiết quiz result
```
GET /api/quiz-results/{quiz_result_id}/
```
🔑 Authenticated

### 12.4 CRUD Quiz Results (legacy)
```
GET  /api/quiz-results-old/          — danh sách (📄 phân trang)
POST /api/quiz-results-old/          — tạo mới
PATCH /api/quiz-results-old/{id}/    — cập nhật
DELETE /api/quiz-results-old/{id}/   — xóa
```
**Query Params (GET):** `?enrollment_id=<id>`, `?quiz_result_id=<id>`

---

## 13. Payments & VNPay

### 13.1 Tạo thanh toán VNPay
```
POST /api/vnpay/create/
```
🔑 Student / Instructor / Admin | Rate limit: 10/min

**Request Body:**
```json
{
  "amount": "decimal (required)",
  "order_info": "string",
  "course_ids": [1, 2, 3],
  "promotion_id": "integer (optional)",
  "payment_type": "course_purchase | subscription",
  "subscription_plan_id": "integer (optional)"
}
```

**Response:** `200 OK`
```json
{
  "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "payment_id": 1
}
```

### 13.2 VNPay IPN (server callback)
```
GET /api/vnpay/ipn/
```
🔓 VNPay server callback — không gọi từ FE

### 13.3 Tạo payment record thủ công
```
POST /api/payment/create/
```
🔑 Student / Instructor / Admin | Rate limit: 10/min

**Request Body:**
```json
{
  "amount": "decimal",
  "total_amount": "decimal",
  "discount_amount": "decimal",
  "payment_method": "vnpay | momo",
  "payment_type": "course_purchase | subscription",
  "promotion": "integer (optional)",
  "subscription_plan": "integer (optional)",
  "transaction_id": "string (optional)"
}
```
> `user_id` enforced từ JWT token.

### 13.4 Kiểm tra trạng thái payment
```
GET /api/payments/status/{payment_id}/
```
🔑 Student / Instructor / Admin

**Response:** `200 OK`
```json
{
  "id": 1,
  "payment_status": "pending | completed | failed | refunded | cancelled",
  "amount": "500000.00",
  "total_amount": "450000.00",
  "payment_method": "vnpay",
  "payment_date": "2025-01-01T00:00:00Z"
}
```

### 13.5 Kiểm tra enrollment theo course
```
GET /api/payments/check-enrollment/{course_id}/
```
🔑 Student / Instructor / Admin

**Response:** `200 OK`
```json
{
  "is_enrolled": true,
  "enrollment_id": 5,
  "source": "purchase"
}
```

---

## 14. Refunds

### 14.1 Danh sách refund requests của user
```
GET /api/refunds/
```
🔑 Student / Instructor / Admin | Rate limit: 10/min

**Query Params:** `?status=pending` (optional filter)

### 14.2 Yêu cầu hoàn tiền
```
POST /api/refunds/request/
```
🔑 Student / Instructor / Admin | Rate limit: 10/min

**Request Body:**
```json
{
  "payment_id": "integer (required)",
  "payment_details_ids": [1, 2],
  "reason": "string"
}
```

### 14.3 Hủy yêu cầu hoàn tiền (user)
```
PUT /api/vnpay/return/
```
🔑 Student / Instructor / Admin

**Request Body:**
```json
{
  "payment_id": "integer",
  "payment_details_ids": [1, 2]
}
```

### 14.4 Admin duyệt/từ chối refund
```
PATCH /api/payments/refund/admin/
```
👑 Admin only | Rate limit: 10/min

**Request Body:**
```json
{
  "payment_id": "integer",
  "payment_details_ids": [1, 2],
  "status": "approved | rejected",
  "response_code": "string",
  "transaction_id": "string"
}
```

---

## 15. Payment Methods

### 15.1 User Payment Methods (cho thanh toán mua khóa học)

#### Danh sách
```
GET /api/payment-methods/user/
```
🔑 Student / Instructor / Admin | Rate limit: 60/min

**Response:**
```json
[
  {
    "id": 1,
    "method_type": "bank_transfer | momo | vnpay",
    "is_default": true,
    "nickname": "Vietcombank cá nhân",
    "masked_account": "****1234",
    "bank_name": "Vietcombank",
    "bank_branch": "TP.HCM",
    "account_number": "123456789",
    "account_name": "NGUYEN VAN A",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

#### Thêm mới
```
POST /api/payment-methods/user/
```
**Request Body:**
```json
{
  "method_type": "bank_transfer | momo | vnpay (required)",
  "is_default": "boolean",
  "nickname": "string",
  "gateway_token": "string",
  "masked_account": "string",
  "bank_name": "string",
  "bank_branch": "string",
  "account_number": "string",
  "account_name": "string"
}
```

#### Cập nhật
```
PATCH /api/payment-methods/user/{method_id}/
```

#### Xóa
```
DELETE /api/payment-methods/user/{method_id}/
```

#### Đặt làm mặc định
```
POST /api/payment-methods/user/{method_id}/default/
```

### 15.2 Instructor Payout Methods (nhận thanh toán)

#### Danh sách
```
GET /api/payment-methods/instructor/
```
🔑 Instructor / Admin

#### Thêm mới
```
POST /api/payment-methods/instructor/
```
**Request Body:**
```json
{
  "method_type": "bank_transfer | momo | vnpay (required)",
  "is_default": "boolean",
  "nickname": "string",
  "bank_name": "string (required cho bank_transfer)",
  "bank_branch": "string",
  "account_number": "string (required cho bank_transfer)",
  "account_name": "string (required cho bank_transfer)",
  "wallet_phone": "string (required cho momo/vnpay)",
  "masked_account": "string"
}
```

#### Cập nhật
```
PATCH /api/payment-methods/instructor/{method_id}/
```

#### Xóa
```
DELETE /api/payment-methods/instructor/{method_id}/
```

#### Đặt làm mặc định
```
POST /api/payment-methods/instructor/{method_id}/default/
```

---

## 16. Carts

### 16.1 Danh sách giỏ hàng
```
GET /api/carts/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 60/min

**Query Params:**
- `?user_id=<id>` — lọc theo user
- `?cart_id=<id>` — chi tiết 1 cart item

### 16.2 Thêm vào giỏ hàng
```
POST /api/carts/create/
```
🔑 Student / Instructor / Admin

**Request Body:**
```json
{
  "user_id": "integer (required)",
  "course_id": "integer (required)",
  "price": "decimal"
}
```

### 16.3 Cập nhật giỏ hàng
```
PATCH /api/carts/{cart_id}/update/
```

### 16.4 Xóa khỏi giỏ hàng
```
DELETE /api/carts/{cart_id}/delete/
```

---

## 17. Wishlists

### 17.1 Danh sách wishlist
```
GET /api/wishlists/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 60/min

**Query Params:**
- `?user_id=<id>` — lọc theo user
- `?wishlist_id=<id>` — chi tiết 1 item

### 17.2 Thêm wishlist
```
POST /api/wishlists/create/
```
**Request Body:**
```json
{
  "user_id": "integer (required)",
  "course_id": "integer (required)"
}
```

### 17.3 Cập nhật wishlist
```
PATCH /api/wishlists/{wishlist_id}/update/
```

### 17.4 Xóa wishlist
```
DELETE /api/wishlists/{wishlist_id}/delete/
```

---

## 18. Reviews

### 18.1 Danh sách reviews theo khóa học
```
GET /api/reviews/
```
🔓 Public | 📄 Phân trang | Rate limit: 5/min

**Query Params:** `?course_id=<id>` (required)

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "user": 5,
      "course": 10,
      "rating": 5,
      "comment": "Khóa học tuyệt vời!",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 18.2 Tạo review
```
POST /api/reviews/create/
```
🔑 Student / Instructor / Admin | Rate limit: 5/min

> `user_id` enforced từ JWT token.

**Request Body:**
```json
{
  "course_id": "integer (required)",
  "rating": "integer (1-5, required)",
  "comment": "string"
}
```

### 18.3 Cập nhật review
```
PATCH /api/reviews/update/{review_id}/
```
🔑 Chủ review / Admin

### 18.4 Xóa review
```
DELETE /api/reviews/delete/{review_id}/
```
👑 Admin only

### 18.5 Chi tiết review
```
GET /api/reviews/{review_id}/
```
🔓 Public

---

## 19. Promotions

### 19.1 Danh sách promotions
```
GET /api/promotions/
```
🔑 Admin / Instructor | Rate limit: 60/min

**Query Params (bắt buộc 1 trong):**
- `?promotion_id=<id>` — chi tiết
- `?admin_id=<id>` — theo admin (📄 phân trang)
- `?instructor_id=<id>` — theo instructor (📄 phân trang)

### 19.2 Tạo promotion
```
POST /api/promotions/create
```
🔑 Admin / Instructor

**Request Body:**
```json
{
  "code": "string (unique)",
  "discount_type": "percentage | fixed",
  "discount_value": "decimal",
  "max_uses": "integer",
  "valid_from": "datetime",
  "valid_until": "datetime",
  "course_id": "integer (optional — áp dụng cho course cụ thể)",
  "admin_id": "integer",
  "instructor_id": "integer",
  "min_order_amount": "decimal",
  "description": "string"
}
```

### 19.3 Cập nhật promotion
```
PATCH /api/promotions/{promotion_id}/update
```

### 19.4 Xóa promotion
```
DELETE /api/promotions/{promotion_id}/delete
```

---

## 20. Subscription Plans

### 20.1 Danh sách plans (Public — chỉ active)
```
GET /api/subscription-plans/
```
🔓 Public | 📄 Phân trang | Rate limit: 30/min

**Query Params:** `?plan_id=<id>` — chi tiết 1 plan

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "Premium Monthly",
      "description": "Truy cập tất cả khóa học premium",
      "price": "299000.00",
      "discount_price": "199000.00",
      "duration_type": "monthly | quarterly | yearly | custom",
      "duration_days": 30,
      "status": "active",
      "is_featured": true,
      "thumbnail": "https://...",
      "effective_price": "199000.00",
      "course_count": 25
    }
  ]
}
```

### 20.2 Danh sách courses trong plan
```
GET /api/subscription-plans/{plan_id}/courses/
```
🔓 Public | 📄 Phân trang

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "plan": 1,
      "course": 10,
      "status": "active",
      "added_at": "2025-01-01T00:00:00Z",
      "course_title": "Python cơ bản",
      "course_thumbnail": "https://...",
      "course_instructor": "Nguyễn Văn A",
      "course_price": "500000.00",
      "course_rating": "4.50"
    }
  ]
}
```

### 20.3 Admin CRUD Plans
```
GET    /api/subscription-plans/admin/           — danh sách (bao gồm inactive)
POST   /api/subscription-plans/admin/           — tạo plan
PATCH  /api/subscription-plans/admin/{plan_id}/ — cập nhật
DELETE /api/subscription-plans/admin/{plan_id}/ — xóa
```
👑 Admin only

**Tạo/Cập nhật Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "price": "decimal (required)",
  "discount_price": "decimal",
  "duration_type": "monthly | quarterly | yearly | custom",
  "duration_days": "integer",
  "status": "active | inactive | archived",
  "is_featured": "boolean",
  "max_subscribers": "integer",
  "instructor_share_percent": "decimal",
  "thumbnail": "string (URL)"
}
```

### 20.4 Admin quản lý courses trong plan
```
POST   /api/subscription-plans/admin/{plan_id}/courses/ — thêm course
DELETE /api/subscription-plans/admin/{plan_id}/courses/ — xóa course
```
👑 Admin only

**Thêm course Body:**
```json
{
  "course_id": "integer (required)",
  "added_reason": "string (optional)"
}
```
**Xóa course Body:**
```json
{
  "course_id": "integer (required)"
}
```

### 20.5 Admin xem subscribers
```
GET /api/subscription-plans/admin/{plan_id}/subscribers/
```
👑 Admin only | 📄 Phân trang

### 20.6 Admin — gợi ý courses để thêm vào plan
```
GET /api/subscription-plans/admin/{plan_id}/candidates/
```
👑 Admin only

**Query Params:** `?limit=20`

### 20.7 Admin — Lên lịch xóa course khỏi plan
```
POST /api/subscription-plans/admin/courses/{plan_course_id}/schedule-removal/
```
👑 Admin only

**Request Body:**
```json
{
  "reason": "string (optional)"
}
```

### 20.8 Admin — Cron Jobs
```
POST /api/subscription-plans/admin/expire/              — expire hết hạn subscriptions
POST /api/subscriptions/admin/notify-expiry/             — gửi notification sắp hết hạn
POST /api/subscriptions/admin/expire-suspend/            — expire + suspend enrollments
POST /api/subscriptions/admin/process-removals/          — process scheduled course removals
```
👑 Admin only

---

## 21. User Subscriptions

### 21.1 Đăng ký subscription
```
POST /api/subscriptions/subscribe/
```
🔑 Student / Instructor / Admin | Rate limit: 10/min

**Request Body:**
```json
{
  "plan_id": "integer (required)",
  "payment_id": "integer (optional — link với payment đã tạo)"
}
```

### 21.2 Danh sách subscriptions của user
```
GET /api/subscriptions/me/
```
🔑 Student / Instructor / Admin | 📄 Phân trang

**Query Params:** `?subscription_id=<id>` — chi tiết

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "plan": 1,
      "plan_name": "Premium Monthly",
      "status": "active | expired | cancelled",
      "start_date": "2025-01-01T00:00:00Z",
      "end_date": "2025-02-01T00:00:00Z",
      "is_active": true
    }
  ]
}
```

### 21.3 Danh sách courses từ subscription
```
GET /api/subscriptions/me/courses/
```
🔑 Student / Instructor / Admin

**Response:**
```json
{
  "count": 10,
  "courses": [
    {
      "id": 5,
      "title": "Python cơ bản",
      "enrollment_status": "active",
      "enrollment_source": "subscription"
    }
  ]
}
```

### 21.4 Hủy subscription
```
POST /api/subscriptions/{subscription_id}/cancel/
```
🔑 Student / Instructor / Admin

### 21.5 Kiểm tra quyền truy cập course qua subscription
```
GET /api/subscriptions/access/
```
🔑 Student / Instructor / Admin

**Query Params:**
- `?course_id=<id>` — kiểm tra 1 course cụ thể → `{"has_access": true}`
- Không có params → trả về danh sách accessible course ids

### 21.6 Instructor đồng thuận cho phép course vào plan
```
GET  /api/subscriptions/consents/me/     — xem danh sách consent
POST /api/subscriptions/consents/me/     — tạo/cập nhật consent
```
🎓 Instructor only

**POST Body:**
```json
{
  "course_id": "integer (required)",
  "consent_status": "approved | rejected | pending (required)",
  "note": "string (optional)"
}
```

### 21.7 Tracking subscription usage
```
POST /api/subscriptions/usage/track/
```
🔑 Student / Instructor / Admin

**Request Body:**
```json
{
  "course_id": "integer (required)",
  "usage_type": "course_access | lesson_view | quiz_attempt",
  "consumed_minutes": "integer (default: 0)"
}
```

---

## 22. Notifications

### 22.1 Tạo notification
```
POST /api/notifications/create/
```
🔓 Mọi role (hoặc system) | Rate limit: 30/min

**Request Body:**
```json
{
  "receiver_id": "integer (required — user_id nhận)",
  "sender": "integer (optional — user_id gửi)",
  "title": "string (required)",
  "message": "string (required)",
  "type": "string (required — e.g., 'info', 'payment', 'course', 'system')",
  "related_id": "integer (optional — id liên quan)"
}
```

### 22.2 Danh sách notifications
```
GET /api/notifications/
```
Rate limit: 30/min | 📄 Phân trang

**Query Params:** `?user_id=<id>` (required)

### 22.3 Chi tiết notification
```
GET /api/notifications/{notification_id}/
```

### 22.4 Đánh dấu đã đọc
```
PUT /api/notifications/mark_as_read/
```
**Query Params:**
- `?notification_id=<id>` — đánh dấu 1 notification
- `?user_id=<id>` — đánh dấu TẤT CẢ

### 22.5 Admin gửi notification hàng loạt
```
POST /api/notifications/admin/create/
```
👑 Admin only

**Request Body:**
```json
{
  "notification_code": "string (optional)",
  "user_ids": [1, 2, 3],
  "title": "string (required)",
  "message": "string (required)",
  "type": "string (required)",
  "related_id": "integer (optional)"
}
```

### 22.6 Admin xóa notification
```
DELETE /api/notifications/admin/delete/{notification_code}/
```
👑 Admin only

---

## 23. Blog Posts

### 23.1 Admin/Instructor quản lý
```
GET    /api/admin/blog-posts/               — tất cả posts (📄 phân trang)
POST   /api/admin/blog-posts/create/        — tạo mới
PATCH  /api/admin/blog-posts/update/{id}/   — cập nhật
DELETE /api/admin/blog-posts/delete/{id}/   — xóa
```
🔑 Admin / Instructor | Rate limit: 60/min

**Query Params (GET):** `?blog_post_id=<id>` — chi tiết

**Tạo/Cập nhật Body:**
```json
{
  "title": "string (required)",
  "content": "string (required)",
  "thumbnail": "string (URL)",
  "summary": "string",
  "status": "draft | published",
  "tags": "string",
  "author": "integer (user_id)",
  "category": "string"
}
```

### 23.2 Client xem Blog Posts (published only)
```
GET /api/client/blog-posts/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 30/min

**Query Params:** `?blog_post_id=<id>` — chi tiết

### 23.3 Tăng views
```
PATCH /api/client/blog-posts/increase-views/{id}/
```
🔑 Student / Instructor / Admin

---

## 24. QnA (Questions & Answers)

### 24.1 Danh sách câu hỏi
```
GET /api/qnas/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 60/min

**Query Params:**
- `?user_id=<id>` — lọc theo user
- `?qna_id=<id>` — chi tiết

### 24.2 Tạo câu hỏi
```
POST /api/qnas/create/
```
**Request Body:**
```json
{
  "course": "integer (required)",
  "lesson": "integer (optional)",
  "question": "string (required)",
  "user": "integer (required)",
  "status": "open | resolved | closed"
}
```

### 24.3 Cập nhật câu hỏi
```
PATCH /api/qnas/{qna_id}/update/
```

### 24.4 Xóa câu hỏi
```
DELETE /api/qnas/{qna_id}/delete/
```

### 24.5 Danh sách câu trả lời
```
GET /api/qna_answers/
```
🔑 Student / Instructor / Admin | Rate limit: 60/min

**Query Params:**
- `?qna_id=<id>` — theo câu hỏi (📄 phân trang)
- `?answer_id=<id>` — chi tiết 1 câu trả lời

### 24.6 Tạo câu trả lời
```
POST /api/qna_answers/create/
```
**Request Body:**
```json
{
  "qna": "integer (required)",
  "user": "integer (required)",
  "answer": "string (required)",
  "is_accepted": "boolean (default: false)"
}
```

### 24.7 Cập nhật/Xóa câu trả lời
```
PATCH  /api/qna_answers/{answer_id}/update/
DELETE /api/qna_answers/{answer_id}/delete/
```

---

## 25. Forums

### 25.1 Danh sách forums
```
GET /api/forums/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 60/min

**Query Params:**
- `?course_id=<id>` — lọc theo course
- `?forum_id=<id>` — chi tiết

### 25.2 Tạo forum
```
POST /api/forums/create/
```
**Request Body:**
```json
{
  "course": "integer (required)",
  "title": "string (required)",
  "description": "string",
  "user_id": "integer (required)",
  "status": "active | inactive"
}
```

### 25.3 Cập nhật/Xóa forum
```
PATCH  /api/forums/{forum_id}/update/
DELETE /api/forums/{forum_id}/delete/
```

---

## 26. Forum Topics

### 26.1 Danh sách topics
```
GET /api/forum_topics/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 60/min

**Query Params:**
- `?forum_id=<id>` — lọc theo forum
- `?user_id=<id>` — lọc theo user
- `?topic_id=<id>` — chi tiết

### 26.2 Tạo topic
```
POST /api/forum_topics/create/
```
**Request Body:**
```json
{
  "forum": "integer (required)",
  "title": "string (required)",
  "content": "string (required)",
  "user": "integer (required)",
  "status": "active | closed"
}
```

### 26.3 Cập nhật/Xóa topic
```
PATCH  /api/forum_topics/{topic_id}/update/
DELETE /api/forum_topics/{topic_id}/delete/
```

---

## 27. Forum Comments

### 27.1 Danh sách comments
```
GET /api/forum_comments/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 60/min

**Query Params:**
- `?topic_id=<id>` — lọc theo topic
- `?user_id=<id>` — lọc theo user
- `?comment_id=<id>` — chi tiết

### 27.2 Tạo comment
```
POST /api/forum_comments/create/
```
**Request Body:**
```json
{
  "topic": "integer (required)",
  "content": "string (required)",
  "user": "integer (required)",
  "parent": "integer (optional — reply to comment)",
  "status": "active | hidden"
}
```

### 27.3 Cập nhật/Xóa comment
```
PATCH  /api/forum_comments/{comment_id}/update/
DELETE /api/forum_comments/{comment_id}/delete/
```

---

## 28. Support Tickets

### 28.1 Danh sách support tickets
```
GET /api/supports/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 5/min

**Query Params:**
- `?support_id=<id>` — chi tiết
- `?user_id=<id>` — lọc theo user

### 28.2 Tạo support ticket
```
POST /api/supports/create/
```
🔑 Student / Instructor / Admin | Rate limit: 5/min

**Request Body:**
```json
{
  "user": "integer (required)",
  "name": "string",
  "email": "string",
  "subject": "string (required)",
  "message": "string (required)",
  "status": "open | in_progress | resolved | closed",
  "priority": "low | medium | high | urgent"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "user": 5,
  "name": "Nguyễn Văn A",
  "email": "a@example.com",
  "subject": "Lỗi thanh toán",
  "message": "Tôi không thể thanh toán...",
  "status": "open",
  "priority": "medium",
  "admin": null,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### 28.3 Cập nhật ticket (user)
```
PATCH /api/supports/{support_id}/update/
```

### 28.4 Admin assign ticket
```
PUT /api/supports/{support_id}/admin_update/
```
🔑 Admin / Instructor / Student

**Request Body:**
```json
{
  "admin_id": "integer"
}
```

### 28.5 Xóa ticket
```
DELETE /api/supports/{support_id}/delete/
```

---

## 29. Support Replies

### 29.1 Danh sách replies theo ticket
```
GET /api/replies/support/{support_id}/
```
🔑 Student / Instructor / Admin | 📄 Phân trang | Rate limit: 60/min

### 29.2 Chi tiết reply
```
GET /api/replies/{reply_id}/
```

### 29.3 Tạo reply
```
POST /api/replies/
```
🔑 Student / Instructor / Admin

**Request Body:**
```json
{
  "support": "integer (support_id, required)",
  "user": "integer (optional — user reply)",
  "admin": "integer (optional — admin reply)",
  "message": "string (required)"
}
```

### 29.4 Xóa reply
```
DELETE /api/replies/{reply_id}/delete/
```

---

## 30. Certificates

### 30.1 Cấp chứng chỉ
```
POST /api/certificates/issue/
```
🔑 Student / Instructor / Admin | Rate limit: 60/min

**Request Body:**
```json
{
  "course_id": "integer (required)"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "user": 5,
  "course": 10,
  "verification_code": "CERT-ABC123",
  "certificate_url": null,
  "issued_at": "2025-01-01T00:00:00Z",
  "student_name": "Nguyễn Văn A",
  "course_title": "Python cơ bản",
  "instructor_name": "Trần Văn B"
}
```

### 30.2 Generate certificate PDF
```
POST /api/certificates/{certificate_id}/generate/
```
🔑 Student / Instructor / Admin

**Response:** `200 OK` — `certificate_url` sẽ được cập nhật

### 30.3 Download certificate
```
GET /api/certificates/{certificate_id}/download/
```
🔑 Chủ sở hữu hoặc Admin

**Response:**
```json
{
  "certificate_id": 1,
  "download_url": "https://res.cloudinary.com/...",
  "verification_code": "CERT-ABC123"
}
```

### 30.4 Xác minh chứng chỉ (Public)
```
GET /api/certificates/verify/{verification_code}/
```
🔓 Public | Rate limit: 30/min

**Response:**
```json
{
  "verification_code": "CERT-ABC123",
  "student_name": "Nguyễn Văn A",
  "course_title": "Python cơ bản",
  "instructor_name": "Trần Văn B",
  "completion_date": "2025-01-01",
  "issued_at": "2025-01-01T00:00:00Z",
  "revoked": false,
  "is_valid": true
}
```

### 30.5 Danh sách chứng chỉ của user
```
GET /api/certificates/me/
```
🔑 Student / Instructor / Admin | 📄 Phân trang

**Query Params:** `?certificate_id=<id>` — chi tiết

### 30.6 Admin quản lý certificates
```
GET    /api/certificates/admin/?course_id=<id>   — danh sách theo course
DELETE /api/certificates/admin/{certificate_id}/  — thu hồi (revoke)
```
👑 Admin only

---

## 31. Registration Forms

### 31.1 Xem form đăng ký (Public)
```
GET /api/registration-forms/active/?type=<form_type>
```
🔓 Public | Rate limit: 30/min

**Query Params:** `?type=instructor_application` (required)

### 31.2 Admin CRUD Forms
```
GET    /api/registration-forms/                — danh sách (📄 phân trang)
GET    /api/registration-forms/{form_id}/      — chi tiết
POST   /api/registration-forms/                — tạo mới
PATCH  /api/registration-forms/{form_id}/      — cập nhật
DELETE /api/registration-forms/{form_id}/      — xóa
```
👑 Admin only

**Tạo Body:**
```json
{
  "type": "instructor_application | partner_application",
  "title": "string (required)",
  "description": "string",
  "is_active": "boolean",
  "version": "integer"
}
```

### 31.3 Admin quản lý câu hỏi trong form
```
POST   /api/registration-forms/{form_id}/questions/              — thêm câu hỏi
PATCH  /api/registration-forms/questions/{question_id}/          — cập nhật
DELETE /api/registration-forms/questions/{question_id}/          — xóa
PUT    /api/registration-forms/{form_id}/questions/batch/        — batch update
```
👑 Admin only

**Thêm câu hỏi Body:**
```json
{
  "order": "integer",
  "label": "string (required)",
  "type": "text | textarea | select | radio | checkbox | file | number | date | email | phone",
  "placeholder": "string",
  "help_text": "string",
  "required": "boolean",
  "options": ["Option A", "Option B"],
  "validation_regex": "string (regex pattern)",
  "file_config": {"max_size": 5242880, "allowed_types": ["pdf", "doc"]}
}
```

**Batch Update Body:**
```json
{
  "questions": [
    {"id": 1, "order": 1, "label": "Họ tên", "type": "text", "required": true},
    {"id": 2, "order": 2, "label": "Email", "type": "email", "required": true}
  ]
}
```

---

## 32. Applications

### 32.1 Submit application (nộp đơn)
```
POST /api/applications/submit/
```
🔑 Student / Instructor / Admin | Rate limit: 60/min

**Request Body:**
```json
{
  "form_id": "integer (required)",
  "responses": [
    {"question": 1, "value": "Nguyễn Văn A"},
    {"question": 2, "value": "a@example.com"},
    {"question": 3, "value": "5 năm kinh nghiệm..."}
  ]
}
```

### 32.2 Xem applications của user
```
GET /api/applications/me/
```
🔑 Student / Instructor / Admin | 📄 Phân trang

**Query Params:** `?application_id=<id>` — chi tiết

### 32.3 Resubmit application (nộp lại đơn bị reject)
```
PUT /api/applications/{application_id}/resubmit/
```
🔑 Student / Instructor / Admin

**Request Body:** Giống 32.1

### 32.4 Admin xem tất cả applications
```
GET /api/applications/admin/
```
👑 Admin only | 📄 Phân trang

**Query Params:**
- `?application_id=<id>` — chi tiết
- `?status=pending | approved | rejected`
- `?form_id=<id>`
- `?user_id=<id>`

### 32.5 Admin review application
```
POST /api/applications/{application_id}/review/
```
👑 Admin only

**Request Body:**
```json
{
  "status": "approved | rejected (required)",
  "admin_notes": "string (optional)",
  "rejection_reason": "string (required nếu rejected)"
}
```

---

## 33. Instructor Earnings

### 33.1 Danh sách earnings
```
GET /api/instructor-earnings/
```
🔑 Admin / Instructor | Rate limit: 60/min

**Query Params:**
- `?instructor_id=<id>` — lọc theo instructor (📄 phân trang)
- `?earning_id=<id>` — chi tiết
- `?status=pending | paid | cancelled`
- `?source=retail | subscription`

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "instructor": 1,
      "instructor_name": "Nguyễn Văn A",
      "course": 10,
      "course_title": "Python cơ bản",
      "payment": 5,
      "payment_transaction_id": "VNP123456",
      "user_subscription": null,
      "plan_name": null,
      "earning_source": "retail",
      "amount": "500000.00",
      "net_amount": "350000.00",
      "status": "pending | paid | cancelled",
      "earning_date": "2025-01-01T00:00:00Z",
      "instructor_payout": null
    }
  ]
}
```

### 33.2 Cập nhật trạng thái earning
```
PATCH /api/instructor-earnings/
```
🔑 Admin / Instructor

**Request Body:**
```json
{
  "earning_id": "integer (required)",
  "status": "pending | paid | cancelled (required)"
}
```

### 33.3 Gắn earning với payout
```
PATCH /api/instructor-earnings/payout/{payout_id}/
```
Rate limit: 60/min

### 33.4 Tính earning từ subscription (admin cron)
```
POST /api/instructor-earnings/subscription-calc/
```
👑 Admin only

**Request Body:**
```json
{
  "year": 2025,
  "month": 1
}
```

### 33.5 Tổng hợp thu nhập instructor
```
GET /api/instructor-earnings/summary/?instructor_id={id}
```
🔑 Admin / Instructor

---

## 34. Instructor Payouts

### 34.1 Danh sách payouts
```
GET /api/instructor-payouts/
```
🔑 Instructor / Admin | Rate limit: 60/min

**Query Params:**
- `?payout_id=<id>` — chi tiết
- `?instructor_id=<id>` (admin xem instructor cụ thể)
- `?status=pending | processing | completed | rejected`
- `?period=YYYY-MM`
- `?processed_by=<admin_id>`

> Instructor tự động thấy chỉ payouts của mình.

### 34.2 Instructor yêu cầu rút tiền
```
POST /api/instructor/payouts/request/
```
🎓 Instructor only | Rate limit: 10/min

**Request Body:**
```json
{
  "amount": "decimal (required)",
  "payout_method_id": "integer (optional — PayoutMethod id)",
  "notes": "string (optional)",
  "period": "string (optional — e.g., '2025-01')"
}
```

### 34.3 Admin duyệt cập nhật payout
```
PATCH /api/instructor-payouts/
```
👑 Admin only

**Request Body:**
```json
{
  "payout_id": "integer (required)",
  "status": "processing | completed | rejected",
  "transaction_id": "string",
  "notes": "string",
  "fee": "decimal (default: 0)",
  "processed_date": "datetime"
}
```

### 34.4 Admin approve payout
```
PUT /api/admin/payouts/{payout_id}/approve/
```
👑 Admin only

**Request Body:**
```json
{
  "transaction_id": "string (optional)",
  "notes": "string (optional)",
  "fee": "decimal (default: 0)"
}
```

### 34.5 Admin reject payout
```
PUT /api/admin/payouts/{payout_id}/reject/
```
👑 Admin only

**Request Body:**
```json
{
  "notes": "string (optional)"
}
```

### 34.6 Xóa payout
```
DELETE /api/instructor-payouts/delete/{payout_id}/
```
👑 Admin only

---

## 35. Instructor Levels

### 35.1 Danh sách levels
```
GET /api/instructor-levels/
```
🔓 Public | Rate limit: 60/min

**Response:**
```json
[
  {
    "id": 1,
    "name": "Bronze",
    "description": "Level cơ bản",
    "min_students": 0,
    "min_revenue": "0.00",
    "commission_rate": "0.70",
    "plan_commission_rate": "0.60",
    "min_plan_minutes": 0,
    "instructor_count": 15,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

### 35.2 Chi tiết level
```
GET /api/instructor-levels/{level_id}/
```
👑 Admin only

### 35.3 Tạo level
```
POST /api/instructor-levels/
```
👑 Admin only

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "min_students": "integer",
  "min_revenue": "decimal",
  "commission_rate": "decimal (0.00 - 1.00)",
  "plan_commission_rate": "decimal",
  "min_plan_minutes": "integer"
}
```

### 35.4 Cập nhật level
```
PATCH /api/instructor-levels/{level_id}/
```
👑 Admin only

### 35.5 Xóa level
```
DELETE /api/instructor-levels/{level_id}/
```
👑 Admin only

### 35.6 Kiểm tra và nâng cấp tự động
```
POST /api/instructor-levels/upgrade-check/
```
👑 Admin only (cron job)

---

## 36. Admin Management

### 36.1 Danh sách admins
```
GET /api/admins/
```
👑 Admin only | 📄 Phân trang | Rate limit: 60/min

### 36.2 Chi tiết admin
```
GET /api/admins/{admin_id}
```
👑 Admin only

**Response:**
```json
{
  "id": 1,
  "user": 1,
  "department": "IT",
  "role": "super_admin",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T00:00:00Z"
}
```

### 36.3 Tạo admin
```
POST /api/admins/create
```
👑 Admin only

**Request Body:**
```json
{
  "user": "integer (user_id, required)",
  "department": "string",
  "role": "string"
}
```

### 36.4 Cập nhật admin
```
PATCH /api/admins/{admin_id}
```
👑 Admin only

### 36.5 Xóa admin
```
DELETE /api/admins/{admin_id}
```
👑 Admin only

---

## 37. Admin Dashboard & Analytics

### 37.1 Dashboard overview stats
```
GET /api/admin/dashboard/stats/
```
👑 Admin only | Rate limit: 60/min

**Response:**
```json
{
  "total_users": 5000,
  "total_courses": 100,
  "total_enrollments": 3000,
  "total_revenue": "500000000.00",
  "recent_enrollments": [...],
  "popular_courses": [...]
}
```

### 37.2 Revenue analytics
```
GET /api/admin/analytics/revenue/?months=6
```
👑 Admin only

**Query Params:** `?months=<integer>` (default: 6)

### 37.3 User analytics
```
GET /api/admin/analytics/users/?months=6
```
👑 Admin only

### 37.4 Course analytics
```
GET /api/admin/analytics/courses/
```
👑 Admin only

---

## 38. Activity Logs

### 38.1 Danh sách logs
```
GET /api/activity-logs/
```
🔑 Admin / Instructor / Student | 📄 Phân trang | Rate limit: 60/min

> Non-admin users chỉ thấy logs của mình.

**Query Params:**
- `?user_id=<id>` — lọc theo user (admin only)
- `?action=<string>` — lọc theo action
- `?entity_type=<string>` — lọc theo entity type
- `?entity_id=<id>` — lọc theo entity id

**Response:**
```json
{
  "results": [
    {
      "user_id": 5,
      "action": "login",
      "description": "User logged in",
      "entity_type": "user",
      "entity_id": 5,
      "ip_address": "192.168.1.1",
      "created_at": "2025-01-01T00:00:00Z",
      "user_agent": "Mozilla/5.0..."
    }
  ]
}
```

### 38.2 Xóa logs cũ (cleanup)
```
DELETE /api/activity-logs/cleanup/
```
🔑 Admin / Instructor / Student

**Query Params:** `?before=2025-01-01` (format: YYYY-MM-DD, required)

---

## 39. System Settings

### 39.1 Danh sách settings
```
GET /api/systems_settings/
```
👑 Admin only | 📄 Phân trang | Rate limit: 60/min

**Query Params:**
- `?setting_key=<key>` — tìm theo key
- `?admin_id=<id>` — lọc theo admin (📄 phân trang)

### 39.2 Tạo setting
```
POST /api/systems_settings/create/
```
👑 Admin only

**Request Body:**
```json
{
  "setting_group": "string",
  "setting_key": "string (required)",
  "setting_value": "string (required)",
  "description": "string",
  "admin": "integer (admin_id)"
}
```

### 39.3 Cập nhật setting
```
PATCH /api/systems_settings/{setting_id}/update/
```
👑 Admin only

### 39.4 Xóa setting
```
DELETE /api/systems_settings/{setting_id}/delete/
```
👑 Admin only

---

## 40. File Upload (Cloudinary)

### 40.1 Upload file(s)
```
POST /api/cloudinary/upload/
```
Rate limit: 10/min

**Content-Type:** `multipart/form-data`

**Request Body:**
```
files: File[] (required — 1 hoặc nhiều file)
```

**Response:** `201 Created`
```json
[
  {
    "public_id": "course_uploads/abc123",
    "url": "https://res.cloudinary.com/...",
    "secure_url": "https://res.cloudinary.com/...",
    "format": "pdf",
    "bytes": 2048000,
    "resource_type": "raw"
  }
]
```

### 40.2 Xóa file(s)
```
DELETE /api/cloudinary/delete/
```
Rate limit: 10/min

**Request Body:**
```json
{
  "public_ids": ["course_uploads/abc123", "course_uploads/def456"]
}
```

---

## 41. WebSocket - Realtime Notifications

### Kết nối
```
ws://localhost:8000/ws/notifications/?token=<JWT_ACCESS_TOKEN>
// Production:
wss://course-604d.onrender.com/ws/notifications/?token=<JWT_ACCESS_TOKEN>
```

### Message format nhận từ server
```json
{
  "type": "notification",
  "data": {
    "id": 1,
    "title": "Bạn có đơn đăng ký mới",
    "message": "Nguyễn Văn A đã nộp đơn ứng tuyển",
    "notification_type": "application",
    "related_id": 5,
    "created_at": "2025-01-01T00:00:00Z",
    "is_read": false
  }
}
```

---

## Appendix A: Rate Limiting

| Scope | Rate | Áp dụng cho |
|-------|------|-------------|
| `anon` | 20/min | Anonymous requests |
| `user` | 60/min | Authenticated requests |
| `login` | 5/min | Login endpoint |
| `register` | 3/min | Register endpoint |
| `password_reset` | 3/hour | Password reset |
| `payment` | 10/min | Payment/subscription |
| `quiz_submit` | 5/min | Nộp bài quiz |
| `upload` | 10/min | File upload/delete |
| `review` | 5/min | Tạo/sửa reviews |
| `support` | 5/min | Support tickets |
| `notification` | 30/min | Notifications |
| `search` | 30/min | Public search/list |
| `burst` | 60/min | CRUD operations |

**Khi vượt quá rate limit:** HTTP `429 Too Many Requests`
```json
{
  "detail": "Request was throttled. Expected available in X seconds."
}
```

---

## Appendix B: Enum Values Reference

### User
| Field | Values |
|-------|--------|
| `user_type` | `student`, `instructor`, `admin` |
| `status` | `active`, `inactive`, `banned` |

### Course
| Field | Values |
|-------|--------|
| `level` | `beginner`, `intermediate`, `advanced`, `all_levels` |
| `status` | `draft`, `pending`, `published`, `rejected`, `archived` |

### Payment
| Field | Values |
|-------|--------|
| `payment_status` | `pending`, `completed`, `failed`, `refunded`, `cancelled` |
| `payment_method` | `vnpay`, `momo` |
| `payment_type` | `course_purchase`, `subscription` |

### Enrollment
| Field | Values |
|-------|--------|
| `status` | `active`, `complete`, `expired`, `cancelled`, `suspended` |
| `source` | `purchase`, `subscription` |

### Refund (PaymentDetail)
| Field | Values |
|-------|--------|
| `refund_status` | `pending`, `approved`, `success`, `rejected`, `failed`, `cancelled` |

### Learning Progress
| Field | Values |
|-------|--------|
| `status` | `progress`, `completed`, `pending` |

### Subscription Plan
| Field | Values |
|-------|--------|
| `duration_type` | `monthly`, `quarterly`, `yearly`, `custom` |
| `status` | `active`, `inactive`, `archived` |

### User Subscription
| Field | Values |
|-------|--------|
| `status` | `active`, `expired`, `cancelled` |

### Course Subscription Consent
| Field | Values |
|-------|--------|
| `consent_status` | `approved`, `rejected`, `pending` |

### Payment Method
| Field | Values |
|-------|--------|
| `method_type` (User) | `bank_transfer`, `momo`, `vnpay` |
| `method_type` (Instructor) | `bank_transfer`, `momo`, `vnpay` |

---

## Appendix C: Authentication Headers

Tất cả endpoint có 🔑 đều cần header:
```
Authorization: Bearer <access_token>
```

Khi access token hết hạn, dùng refresh token để lấy mới:
```
POST /api/token/refresh/
```
**Request Body:**
```json
{
  "refresh": "<refresh_token>"
}
```
**Response:**
```json
{
  "access": "<new_access_token>"
}
```

Khi refresh token hết hạn, user phải login lại.

---

> **Document version:** 1.0  
> **Last updated:** 2025  
> **Backend:** Django 5.2 + DRF 3.16 + SimpleJWT + Channels + Redis  
> **Base URL:** https://course-604d.onrender.com
