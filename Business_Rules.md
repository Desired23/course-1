# Business Rules — Ràng Buộc Nghiệp Vụ Khi Tạo Dữ Liệu

> Dùng kèm với **Cây Quan Hệ DB** (plan file).  
> Cây đảm bảo FK hợp lệ. File này đảm bảo **giá trị logic đúng**.

---

## 1. USER & PROFILE

### 1.1 User type phải khớp với profile
| user_type | Profile được tạo | Profile KHÔNG được tạo |
|---|---|---|
| `ADMIN` | `Admin` | `Instructor` |
| `INSTRUCTOR` | `Instructor` | `Admin` |
| `STUDENT` | _(không có profile riêng)_ | `Admin`, `Instructor` |

### 1.2 Instructor level
- Instructor mới → `level = Bronze` (min_students=0)
- Level tăng khi `instructor.total_students` vượt ngưỡng của cấp tiếp theo
- Không được gán level cao hơn ngưỡng chưa đạt

### 1.3 Instructor counters (tính lại sau khi tạo hết)
```
instructor.total_courses  = COUNT(Course WHERE instructor=this AND is_deleted=False)
instructor.total_students = COUNT DISTINCT(Enrollment.user WHERE course.instructor=this
                            AND enrollment.status IN [Active, Complete])
instructor.rating         = AVG(Review.rating WHERE course.instructor=this
                            AND review.status=APPROVED)
```

---

## 2. CATEGORY

### 2.1 Cây danh mục
- **Parent category**: `parent_category = NULL`
- **Subcategory**: `parent_category = <parent>`, không được lồng thêm cấp 3
- Không tạo vòng tròn (A là cha của B, B là cha của A)

### 2.2 Gán vào Course
- `course.subcategory.parent_category == course.category` (bắt buộc)
- Không được gán subcategory thuộc category khác

---

## 3. COURSE

### 3.1 Status chain — PHẢI đồng bộ từ trên xuống
```
Course PUBLISHED  → CourseModule PUBLISHED → Lesson PUBLISHED
Course DRAFT      → CourseModule có thể Draft hoặc Published
Course ARCHIVED   → Không tạo enrollment mới
Course REJECTED   → Không tạo enrollment mới
```
> Lesson PUBLISHED trong Course DRAFT = dữ liệu bẩn (student không thể truy cập)

### 3.2 Course counters (tính lại sau khi tạo hết)
```
course.total_modules    = COUNT(CourseModule WHERE course=this AND is_deleted=False)
course.total_lessons    = COUNT(Lesson WHERE module.course=this AND is_deleted=False)
course.duration         = SUM(Lesson.duration WHERE module.course=this)
course.total_students   = COUNT(Enrollment WHERE course=this
                          AND status IN [Active, Complete] AND is_deleted=False)
course.total_reviews    = COUNT(Review WHERE course=this AND status=APPROVED)
course.rating           = AVG(Review.rating WHERE course=this AND status=APPROVED)
                          → làm tròn 1 chữ số thập phân
```

### 3.3 Giá
- `price >= 0` (0 = miễn phí)
- `discount_price < price` (nếu có)
- `discount_start_date < discount_end_date` (nếu có)
- Không có `discount_price` nếu không có `discount_start_date`

---

## 4. MODULE & LESSON

### 4.1 Thứ tự Module
- `order_number` trong mỗi course phải **liên tục từ 1**, không có gap
- Ví dụ đúng: 1, 2, 3, 4
- Ví dụ sai: 1, 3, 5 | 0, 1, 2 | 1, 1, 2

### 4.2 Thứ tự Lesson
- `order` trong mỗi module phải **liên tục từ 1**, không có gap
- Ví dụ đúng: 1, 2, 3
- Ví dụ sai: 1, 3, 4

### 4.3 is_free logic
```
Lesson 1 của mỗi module → is_free = True  (preview)
Lesson 2+ của module    → is_free = False (trừ khi course.price = 0)
Nếu course.price = 0   → tất cả lessons is_free = True
```

### 4.4 content_type rules
| content_type | Trường bắt buộc | Trường không cần |
|---|---|---|
| `VIDEO` | `video_url`, `duration > 0` | `content` |
| `TEXT` | `content` (không rỗng) | `video_url` |
| `QUIZ` | phải có ≥ 1 `QuizQuestion` | `video_url`, `content` |
| `CODE` | phải có ≥ 1 `QuizQuestion` type=CODE | `video_url` |
| `FILE` | `file_path` | `video_url` |
| `LINK` | `content` (chứa URL) | `video_url` |

### 4.5 Lesson duration
- VIDEO: `duration` = thời lượng thực tế (giây hoặc phút, nhất quán)
- TEXT/QUIZ: `duration` có thể = 0 hoặc ước tính đọc
- `duration` không được âm

---

## 5. QUIZ

### 5.1 QuizQuestion
- `order_number` trong mỗi lesson liên tục từ 1
- `MULTIPLE_CHOICE`: `options` phải là JSON array ≥ 2 phần tử, `correct_answer` phải thuộc `options`
- `TRUE_FALSE`: `options = ["True", "False"]`, `correct_answer` ∈ `["True", "False"]`
- `CODE`: phải có ít nhất 1 `QuizTestCase`
- `points > 0`

### 5.2 QuizResult
```
score           = ROUND((correct_answers / total_questions) * 100, 2)
passed          = score >= 70   ← ngưỡng mặc định
total_points    = SUM(QuizQuestion.points WHERE lesson=this)
submit_time     > start_time
time_taken      = (submit_time - start_time).seconds
attempt         = số lần đã làm (bắt đầu từ 1)
```
- `[UNIQUE: (enrollment, lesson)]` — chỉ lưu lần làm **gần nhất** hoặc tốt nhất

---

## 6. PAYMENT & COMMERCE

### 6.1 Payment tổng quát
```
payment.amount          = SUM(payment_details.price)          ← giá gốc
payment.discount_amount = SUM(payment_details.discount)       ← tổng giảm giá
payment.total_amount    = SUM(payment_details.final_price)    ← thực trả
```
- `total_amount > 0` (payment 0đ không xử lý qua gateway)
- `transaction_id` phải unique, format: `TXN_<timestamp>_<random>`

### 6.2 Payment_Details (mỗi course trong đơn hàng)
```
final_price = price - discount
discount    = tính từ promotion (nếu có):
              PERCENTAGE → discount = price * discount_value / 100
              FIXED_AMOUNT → discount = MIN(discount_value, price)
discount    >= 0, final_price >= 0
```
- `[UNIQUE: (payment, course)]` — 1 course chỉ xuất hiện 1 lần trong 1 payment

### 6.3 Payment type routing
| payment_type | subscription_plan | Payment_Details | Enrollment source |
|---|---|---|---|
| `COURSE_PURCHASE` | NULL | bắt buộc (1 per course) | `PURCHASE` |
| `SUBSCRIPTION` | bắt buộc | không tạo | `SUBSCRIPTION` |

### 6.4 Promotion
- `start_date < end_date`
- `discount_value > 0`
- `PERCENTAGE`: `discount_value <= 100`
- `used_count <= usage_limit` (nếu `usage_limit` không null)
- Promotion `EXPIRED` khi `end_date < now`
- Promotion chỉ áp dụng khi `status = ACTIVE` và `now` trong `[start_date, end_date]`

---

## 7. ENROLLMENT

### 7.1 Điều kiện tạo Enrollment
- Course phải có `status = PUBLISHED`
- User chưa có enrollment cho course này (UNIQUE constraint)
- `source = PURCHASE` → Payment phải `status = COMPLETED`
- `source = SUBSCRIPTION` → UserSubscription phải `status = ACTIVE`

### 7.2 Progress nhất quán
```
enrollment.progress = ROUND(
    COUNT(LearningProgress WHERE enrollment=this AND is_completed=True)
    / course.total_lessons * 100
, 2)

enrollment.status:
  progress = 0                → Active (chưa học)
  0 < progress < 100          → Active (đang học)
  progress = 100              → Complete
  hết hạn (expiry_date < now) → Expired
```

### 7.3 Không được tạo đồng thời
- User không thể có 2 enrollment ACTIVE cho cùng 1 course

---

## 8. LEARNING PROGRESS

### 8.1 Ràng buộc
- `user` phải có enrollment cho `course` chứa `lesson`
- `enrollment.course == lesson.coursemodule.course`
- `[UNIQUE: (user, lesson)]`

### 8.2 Trạng thái nhất quán
```
is_completed = True   ↔   status = COMPLETED
is_completed = False  ↔   status ∈ [IN_PROGRESS, PENDING]
completion_date       phải có khi is_completed = True
last_accessed         phải có (không để null nếu đã truy cập)
time_spent            >= 0 (giây)
last_position         >= 0 (giây, vị trí video cuối cùng xem)
```

---

## 9. CERTIFICATE

### 9.1 Điều kiện tạo Certificate
```
enrollment.status   = Complete
enrollment.progress = 100
course.certificate  = True   ← course có bật tính năng cấp chứng chỉ
```

### 9.2 Giá trị phải copy chính xác từ nguồn
```
student_name    = enrollment.user.full_name
course_title    = enrollment.course.title
instructor_name = enrollment.course.instructor.user.full_name
completion_date = enrollment.completion_date
issued_at       = completion_date (hoặc ngay sau đó)
verification_code = UUID4 unique
```
- `[UNIQUE: (user, course)]` — 1 chứng chỉ per (user, course)
- `enrollment ⇒ Certificate` — 1 enrollment chỉ có đúng 1 certificate

---

## 10. SUBSCRIPTION

### 10.1 UserSubscription
```
end_date = start_date + plan.duration_days
```
- **Tại mỗi thời điểm**: 1 user chỉ có TỐI ĐA 1 subscription `ACTIVE`
- Subscription cũ phải `EXPIRED` hoặc `CANCELLED` trước khi tạo mới `ACTIVE`

### 10.2 Enrollment qua subscription
- Enrollment `source = SUBSCRIPTION` → `expiry_date = user_subscription.end_date`
- Khi subscription hết hạn → enrollment tương ứng chuyển sang `Expired`

### 10.3 PlanCourse
- Course phải có `CourseSubscriptionConsent.consent_status = OPTED_IN` trước khi thêm vào plan
- `[UNIQUE: (plan, course)]`

---

## 11. INSTRUCTOR EARNINGS & PAYOUTS

### 11.1 InstructorEarning
```
Tạo 1 earning cho mỗi enrollment thành công:

PURCHASE:
  amount     = payment_detail.final_price
  net_amount = amount * instructor.level.commission_rate / 100

SUBSCRIPTION:
  amount     = (consumed_minutes / total_plan_minutes) * plan.price * instructor_share
  net_amount = amount * instructor.level.plan_commission_rate / 100

status ban đầu = PENDING → AVAILABLE (sau N ngày) → PAID (sau payout)
```
- `[UNIQUE: (payment, course, instructor)]` nếu là PURCHASE

### 11.2 InstructorPayout
- Chỉ tạo payout khi có earnings `status = AVAILABLE`
- `amount = SUM(InstructorEarning.net_amount WHERE status=AVAILABLE)`
- Sau khi payout PROCESSED → earnings liên quan chuyển sang `PAID`
- `net_amount = amount - fee`

---

## 12. REVIEW

### 12.1 Điều kiện
- User phải có `Enrollment` cho course với `status ∈ [Active, Complete]`
- `[UNIQUE: (user, course)]` — 1 review per (user, course)
- `rating` ∈ [1, 2, 3, 4, 5] (integer)

### 12.2 Instructor response
- `instructor_response` chỉ được điền bởi instructor của course đó
- `response_at` phải có khi `instructor_response` không null
- `response_at > review.created_at`

---

## 13. BLOG

### 13.1 BlogPost
- `slug` phải unique, format: `tieu-de-bai-viet-<id>` (kebab-case)
- `published_at` phải có khi `status = PUBLISHED`
- `published_at <= now`

### 13.2 BlogComment
- `parent` phải thuộc cùng `blog_post` (không reply cross-post)
- Không lồng comment quá 2 cấp (comment → reply, không có reply của reply)
- `status = deleted` khi `is_deleted = True`

---

## 14. Q&A

### 14.1 Question
- `status = closed` khi có answer `is_accepted = True`
- `answer_count` phải khớp COUNT(Answer WHERE question=this AND status=active)

### 14.2 Answer
- Chỉ 1 answer `is_accepted = True` per question
- Khi accept answer → `question.status = closed`
- `score = COUNT(AnswerVote WHERE vote=up) - COUNT(AnswerVote WHERE vote=down)`

### 14.3 Votes
- `[UNIQUE: (user, question)]` và `[UNIQUE: (user, answer)]`
- User không được vote cho câu hỏi/câu trả lời của chính mình

---

## 15. SUPPORT

### 15.1 Status flow
```
open → in_progress → resolved → closed
              ↑______________|  (có thể reopen)
```
- `admin` phải được gán khi status chuyển sang `in_progress`
- Không skip từ `open` thẳng sang `closed`

### 15.2 SupportReply
- Reply của admin: `admin` phải có, `user` = user đang login (admin user)
- Reply của user: `admin = null`

---

## 16. REALTIME CHAT

### 16.1 Conversation
- `type = DIRECT`: đúng 2 ConversationParticipant, không có thêm
- `type = GROUP`: ≥ 2 participant, phải có đúng 1 participant `role = OWNER`
- `last_message` chỉ set sau khi đã có Message

### 16.2 ChatRoom (legacy)
- `user1.id < user2.id` — luôn sắp xếp để tránh duplicate (user1=A,user2=B) và (user1=B,user2=A)

### 16.3 Message
- Sender phải là ConversationParticipant `is_active = True` của conversation đó
- `reply_to_message` phải thuộc cùng conversation
- `status = REVOKED` khi xóa: giữ record, xóa `text_content`

---

## 17. NOTIFICATION

### 17.1 Loại và related_id
| type | notification_code | related_id |
|---|---|---|
| `COURSE` | `COURSE_ENROLLED`, `COURSE_COMPLETED` | course.id |
| `PAYMENT` | `PAYMENT_SUCCESS`, `PAYMENT_FAILED` | payment.id |
| `PROMOTION` | `NEW_PROMOTION` | promotion.id |
| `SYSTEM` | `SYSTEM_ANNOUNCEMENT` | null |

- `is_read = False` khi mới tạo
- `sender = null` cho thông báo hệ thống tự động

---

## 18. ACTIVITY LOG

### 18.1 action phải khớp với thực tế
| action | Khi nào tạo |
|---|---|
| `LOGIN` | User login thành công |
| `LOGOUT` | User logout |
| `REGISTER` | User đăng ký mới |
| `PAYMENT_SUCCESS` | Payment status → COMPLETED |
| `PAYMENT_FAILED` | Payment status → FAILED |
| `ENROLL` | Enrollment được tạo |
| `COMPLETE_COURSE` | enrollment.status → Complete |

- `entity_type` + `entity_id`: chỉ rõ bản ghi liên quan (vd: `entity_type="Course"`, `entity_id=5`)
- `ip_address`: format IPv4 hợp lệ (vd: `"127.0.0.1"` cho dev data)

---

## Checklist Tạo Dữ Liệu Mới

Sau khi tạo xong toàn bộ records, chạy lại các bước sau:

```
[ ] Recalculate course.total_lessons, total_modules, duration, total_students, rating, total_reviews
[ ] Recalculate instructor.total_courses, total_students, rating
[ ] Recalculate enrollment.progress từ LearningProgress
[ ] Gán enrollment.status dựa trên progress
[ ] Tạo Certificate cho enrollment status=Complete + progress=100
[ ] Recalculate Question.answer_count
[ ] Verify lesson order liên tục trong từng module
[ ] Verify module order_number liên tục trong từng course
[ ] Verify UserSubscription: không có 2 ACTIVE cùng user
[ ] Verify Review: user phải có Enrollment cho course
[ ] Verify Payment.total_amount = SUM(payment_details.final_price)
```
