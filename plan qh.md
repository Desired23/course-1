# Cây Quan Hệ Dữ Liệu (DB Dependency Tree)

## Context

Đây là tài liệu tham chiếu để tạo dữ liệu thực tế, tránh vi phạm FK, dữ liệu bẩn, hoặc logic không nhất quán.
Mỗi bảng phải được tạo SAU các bảng mà nó phụ thuộc vào.

---

## Quy ước ký hiệu

- `→ X` = ForeignKey đến bảng X (phải tồn tại trước)
- `⇒ X` = OneToOneField đến bảng X
- `⇔ X` = ManyToManyField với bảng X
- `[NULL]` = nullable, không bắt buộc phải có
- `[UNIQUE]` = ràng buộc unique
- `[CASCADE]` = xóa theo
- `*` = trường bắt buộc (required)

---

## LEVEL 0 — Bảng gốc (không phụ thuộc bảng nào)

### `Users`
- `id`, `username`* [UNIQUE], `email`* [UNIQUE], `password_hash`*
- `full_name`, `phone`, `avatar` [NULL], `address` [NULL]
- `user_type`: `STUDENT` | `INSTRUCTOR` | `ADMIN`
- `status`: `ACTIVE` | `INACTIVE` | `BANNED`
- `is_deleted`, `created_at`, `updated_at`, `last_login`
- **Thực tế:** Tạo user trước tiên. `deleted_by → User [NULL]` tự tham chiếu, bỏ qua khi tạo mới.

### `Categories`
- `id`, `name`* [UNIQUE], `description`, `icon` [NULL]
- `parent_category → Category [NULL]` (self-reference cho subcategory)
- `status`: `ACTIVE` | `INACTIVE`
- **Thực tế:** Tạo danh mục cha trước, sau đó danh mục con với `parent_category`.
  ```
  Ví dụ:
  "Lập trình" (parent=null)
    └─ "Python" (parent=Lập trình)
    └─ "JavaScript" (parent=Lập trình)
  ```

### `InstructorLevels`
- `id`, `name`* [UNIQUE], `description`
- `min_students`, `min_revenue` (Decimal), `commission_rate` (Decimal)
- `plan_commission_rate` (Decimal), `min_plan_minutes`
- **Thực tế:** Bronze → Silver → Gold → Platinum theo thứ tự tăng dần.

### `SubscriptionPlans`
- `id`, `name`*, `description`, `price` (Decimal)*, `discount_price`
- `duration_type`: `MONTHLY` | `QUARTERLY` | `SEMI_ANNUAL` | `ANNUAL` | `LIFETIME`
- `duration_days`, `status`: `ACTIVE` | `INACTIVE` | `ARCHIVED`
- `instructor_share_percent` (Decimal), `features` (JSON), `not_included` (JSON)
- `created_by → Admin [NULL]` *(phụ thuộc Admin — tạo null hoặc sau Level 1)*

### `RegistrationForms`
- `id`, `type`: `INSTRUCTOR_APPLICATION` | `USER_REGISTRATION`
- `title`*, `description`, `is_active`, `version`
- `created_by → Admin [NULL]` *(nullable)*

---

## LEVEL 1 — Phụ thuộc Users

### `RefreshTokens`
- `id`, `user → User [CASCADE]`*, `jti` [UNIQUE]
- `created_at`, `expires_at`, `revoked_at` [NULL]
- `replaced_by → RefreshToken [NULL]` (self)

### `UserSettings`
- `id`, `user ⇒ User [CASCADE]`* [UNIQUE]
- `account_preferences` (JSON), `notification_preferences` (JSON), `privacy_preferences` (JSON)

### `Admin`
- `id`, `user ⇒ User [CASCADE]`* [UNIQUE]
- `department`, `role`, `is_deleted`
- **Thực tế:** Một User chỉ có 1 Admin profile. User phải có `user_type=ADMIN`.

### `Instructor`
- `id`, `user ⇒ User [CASCADE]`* [UNIQUE]
- `level → InstructorLevel [NULL]`
- `bio`, `specialization`, `qualification`, `experience`
- `rating` (Decimal), `total_students`, `total_courses`
- `social_links` (JSON), `payment_info` (JSON)
- **Thực tế:** User phải có `user_type=INSTRUCTOR`. Level nên là Bronze khi mới tạo.

### `BlogPosts`
- `id`, `author → User [NULL]`*, `category → Category [NULL]`
- `title`*, `content`*, `slug` [UNIQUE], `summary`
- `status`: `DRAFT` | `PUBLISHED` | `ARCHIVED`
- `tags` (JSON), `views`, `likes`, `allow_comments`, `is_featured`

### `Questions` (Q&A cộng đồng)
- `id`, `author → User [CASCADE]`*
- `title`*, `content`*, `tags` (JSON)
- `status`: `open` | `closed` | `duplicate`
- `views`, `score`, `answer_count`

### `Notifications`
- `id`, `sender → User [NULL]`, `receiver → User [CASCADE]`*
- `title`*, `message`*, `type`: `SYSTEM` | `COURSE` | `PAYMENT` | `PROMOTION` | `OTHER`
- `is_read`, `notification_code`, `related_id`

### `UserPaymentMethods`
- `id`, `user → User [CASCADE]`*
- `method_type`: `VNPAY` | `MOMO` | `BANK_TRANSFER` | `CREDIT_CARD`
- `is_default`, `nickname`, `masked_account`, `bank_name`, `account_number`

### `Wishlist`
- `id`, `user → User [CASCADE]`*, `course → Course [CASCADE]`* *(phụ thuộc Course — Level 2)*
- [UNIQUE: (user, course)]

### `LearningPaths`
- `id`, `user → User [CASCADE]`*
- `goal_text`*, `summary`, `estimated_weeks`, `is_archived`

### `ActivityLogs`
- `id`, `user → User [NULL]`
- `action` (choices), `description`, `entity_type`, `entity_id`
- `ip_address`, `trace_id`, `user_agent`

### `SearchEvents`
- `id`, `user → User [NULL]`
- `raw_query`, `normalized_query`, `source`: `GLOBAL_SEARCH`

### `ChatRooms` (legacy)
- `id`, `user1 → User [CASCADE]`*, `user2 → User [CASCADE]`*
- [UNIQUE: (user1, user2)], **Thực tế:** user1.id < user2.id để tránh trùng.

### `Conversations` (realtime chat)
- `id`, `type`: `DIRECT` | `GROUP` | `SYSTEM`
- `created_by → User [NULL]`, `owner → User [NULL]`
- `last_message → Message [NULL]` *(circular — set sau khi có Message)*
- `title`, `is_public`, `is_archived`

### `UserChatPrivacy`
- `id`, `user ⇒ User [CASCADE]`* [UNIQUE]
- `allow_direct_messages`, `show_online_status`, `last_seen_visibility`

### `UserChatBlock`
- `id`, `blocker → User [CASCADE]`*, `blocked → User [CASCADE]`*
- [UNIQUE: (blocker, blocked)]

### `Supports`
- `id`, `user → User [NULL]`, `admin → Admin [NULL]`
- `name`*, `email`*, `subject`*, `message`*
- `status`: `open` | `in_progress` | `resolved` | `closed`
- `priority`: `low` | `medium` | `high` | `urgent`

---

## LEVEL 2 — Phụ thuộc Instructor + Category

### `Courses`
- `id`, `instructor → Instructor [NULL]`*, `category → Category [NULL]`
- `subcategory → Category [NULL]` *(phải là con của category)*
- `title`*, `shortdescription`, `description`, `price` (Decimal)*
- `discount_price`, `thumbnail`, `language`, `duration`
- `level`: `BEGINNER` | `INTERMEDIATE` | `ADVANCED` | `ALL_LEVELS`
- `status`: `DRAFT` | `PENDING` | `PUBLISHED` | `REJECTED` | `ARCHIVED`
- `learning_objectives` (JSON), `target_audience` (JSON), `skills_taught` (JSON)
- `prerequisites` (JSON), `tags` (JSON)
- `is_featured`, `is_public`, `certificate` (bool)
- `rating`, `total_reviews`, `total_students`
- **Thực tế:** Chỉ `PUBLISHED` courses mới có thể mua/enroll. subcategory phải thuộc category đã chọn.

### `Promotions`
- `id`, `code` [UNIQUE]*, `discount_type`: `PERCENTAGE` | `FIXED_AMOUNT`
- `discount_value` (Decimal)*, `start_date`, `end_date`
- `usage_limit`, `used_count`, `min_purchase` (Decimal)
- `admin → Admin [NULL]`, `instructor → Instructor [NULL]`
- `applicable_courses ⇔ Course`, `applicable_categories ⇔ Category`
- `status`: `ACTIVE` | `INACTIVE` | `EXPIRED`
- **Thực tế:** `end_date > start_date`. Nếu `applicable_courses` rỗng → áp dụng cho tất cả.

### `InstructorPayoutMethods`
- `id`, `instructor → Instructor [CASCADE]`*
- `method_type`: `BANK_TRANSFER` | `MOMO` | `VNPAY`
- `is_default`, `bank_name`, `account_number`, `account_name`

---

## LEVEL 3 — Phụ thuộc Course

### `CourseModules`
- `id`, `course → Course [NULL]`*
- `title`*, `description`, `order_number`*, `duration`
- `status`: `Draft` | `Published`
- **Thực tế:** `order_number` bắt đầu từ 1, tăng dần trong mỗi course. Không được trùng trong cùng course.

### `CourseSubscriptionConsent`
- `id`, `instructor → Instructor [CASCADE]`*, `course ⇒ Course [CASCADE]`* [UNIQUE]
- `consent_status`: `OPTED_IN` | `OPTED_OUT`
- `note`, `consented_at`

### `PlanCourses` (khóa học nào thuộc subscription plan)
- `id`, `plan → SubscriptionPlan [CASCADE]`*, `course → Course [CASCADE]`*
- `added_by → Admin [NULL]`, `removed_by → Admin [NULL]`
- `status`: `ACTIVE` | `REMOVED`
- [UNIQUE: (plan, course)]

### `Carts`
- `id`, `user → User [CASCADE]`*, `course → Course [NULL]`*
- `promotion → Promotion [NULL]`
- [UNIQUE: (user, course)]
- **Thực tế:** User không thể thêm course đã enrolled vào cart.

### `Wishlists`
- `id`, `user → User [CASCADE]`*, `course → Course [CASCADE]`*
- [UNIQUE: (user, course)]

### `Reviews`
- `id`, `course → Course [CASCADE]`*, `user → User [CASCADE]`*
- `rating` (1-5)*, `comment`, `status`: `PENDING` | `APPROVED` | `REJECTED`
- `likes`, `instructor_response`, `response_at`
- **Thực tế:** User phải đã enrolled khóa học mới được review. 1 user/1 review per course.

### `FormQuestions`
- `id`, `form → RegistrationForm [CASCADE]`*
- `order`*, `label`*, `type`: `TEXT` | `TEXTAREA` | `NUMBER` | `SELECT` | `RADIO` | `CHECKBOX` | `FILE` | `URL`
- `placeholder`, `help_text`, `required`, `options` (JSON)

---

## LEVEL 4 — Phụ thuộc CourseModule

### `Lessons`
- `id`, `coursemodule → CourseModule [CASCADE]`*
- `title`*, `description`
- `content_type`: `VIDEO` | `TEXT` | `QUIZ` | `CODE` | `ASSIGNMENT` | `FILE` | `LINK`
- `content`, `video_url`, `video_public_id`, `file_path`
- `duration`, `is_free`, `order`*, `status`: `DRAFT` | `PUBLISHED`
- **Thực tế:** `order` tăng dần trong module. VIDEO lessons cần `video_url`. QUIZ lessons cần `QuizQuestions`.

---

## LEVEL 5 — Phụ thuộc User + SubscriptionPlan + Promotion

### `Payments`
- `id`, `user → User [CASCADE]`*
- `subscription_plan → SubscriptionPlan [NULL]` *(nếu payment_type=SUBSCRIPTION)*
- `promotion → Promotion [NULL]`
- `payment_type`: `COURSE_PURCHASE` | `SUBSCRIPTION`
- `amount`, `discount_amount`, `total_amount` (Decimal)*
- `transaction_id` [UNIQUE]*, `payment_date`
- `payment_status`: `PENDING` | `COMPLETED` | `FAILED` | `REFUNDED` | `CANCELLED`
- `payment_method`: `VNPAY` | `MOMO`
- **Thực tế:**
  - `COURSE_PURCHASE`: `subscription_plan=null`, liên kết với Payment_Details (courses mua)
  - `SUBSCRIPTION`: `subscription_plan` phải có, không cần Payment_Details

---

## LEVEL 6 — Phụ thuộc Lesson + Payment

### `QuizQuestions`
- `id`, `lesson → Lesson [CASCADE]`* *(lesson phải có content_type=QUIZ hoặc CODE)*
- `question_text`*, `question_type`: `MULTIPLE_CHOICE` | `TRUE_FALSE` | `SHORT_ANSWER` | `ESSAY` | `CODE`
- `difficulty`: `EASY` | `MEDIUM` | `HARD`
- `options` (JSON — cho MULTIPLE_CHOICE), `correct_answer`*, `points`, `explanation`
- `order_number`*, `time_limit`

### `LessonAttachments`
- `id`, `lesson → Lesson [CASCADE]`*
- `title`*, `file_path`*, `file_type`, `file_size`, `download_count`

### `LessonComments`
- `id`, `user → User [CASCADE]`*, `lesson → Lesson [CASCADE]`*
- `parent_comment → LessonComment [NULL]` (self, replies)
- `content`*, `votes`

### `TranscriptJobs`
- `id`, `lesson → Lesson [CASCADE]`*
- `status`: `QUEUED` | `PROCESSING` | `COMPLETED` | `FAILED`
- `trigger_source`, `provider`: `LOCAL_WHISPER`, `language_code`

### `Payment_Details` (chi tiết từng course trong payment)
- `id`, `payment → Payment [CASCADE]`*, `course → Course [CASCADE]`*
- `promotion → Promotion [NULL]`
- `price` (Decimal)*, `discount` (Decimal), `final_price` (Decimal)*
- `refund_status`: `PENDING` | `PROCESSING` | `APPROVED` | `SUCCESS` | `REJECTED` | `FAILED`
- [UNIQUE: (payment, course)]
- **Thực tế:** Mỗi course trong đơn hàng là 1 Payment_Detail. `final_price = price - discount`.

### `UserSubscriptions`
- `id`, `user → User [CASCADE]`*, `plan → SubscriptionPlan [CASCADE]`*
- `payment → Payment [NULL]`
- `status`: `ACTIVE` | `EXPIRED` | `CANCELLED`
- `start_date`*, `end_date`*, `auto_renew`
- **Thực tế:** `end_date = start_date + plan.duration_days`. Chỉ 1 subscription ACTIVE per user tại một thời điểm.

### `Enrollments`
- `id`, `user → User [CASCADE]`*, `course → Course [NULL]`*
- `payment → Payment [NULL]`, `subscription → UserSubscription [NULL]`
- `status`: `Active` | `Complete` | `Expired` | `Cancelled` | `SUSPENDED`
- `source`: `PURCHASE` | `SUBSCRIPTION`
- `enrollment_date`*, `expiry_date` [NULL], `progress` (Decimal)
- [UNIQUE: (user, course)]
- **Thực tế:**
  - `source=PURCHASE`: `payment` phải có, có Payment_Detail cho course này
  - `source=SUBSCRIPTION`: `subscription` phải có, subscription đang ACTIVE
  - `progress` từ 0.00 đến 100.00

### `Applications`
- `id`, `user → User [CASCADE]`*, `form → RegistrationForm [CASCADE]`*
- `reviewed_by → Admin [NULL]`
- `status`: `PENDING` | `APPROVED` | `REJECTED` | `CHANGES_REQUESTED`
- `submitted_at`, `reviewed_at`, `admin_notes`, `rejection_reason`

---

## LEVEL 7 — Phụ thuộc Enrollment + Lesson

### `QuizTestCases`
- `id`, `question → QuizQuestion [CASCADE]`*
- `input_data`*, `expected_output`*, `is_hidden`, `points`, `order_number`
- [UNIQUE: (question, chunk_index)]

### `LessonTranscripts`
- `id`, `lesson → Lesson [CASCADE]`*
- `published_by → User [NULL]`
- `language_code`*, `status`: `DRAFT` | `REVIEWED` | `PUBLISHED` | `STALE`
- `origin`: `ASR` | `MANUAL` | `REGENERATED`
- `version`*, [UNIQUE: (lesson, language_code, version)]

### `LearningProgress`
- `id`, `user → User [CASCADE]`*, `enrollment → Enrollment [CASCADE]`*
- `course → Course [CASCADE]`*, `lesson → Lesson [CASCADE]`*
- `progress_percentage` (Decimal), `status`: `IN_PROGRESS` | `COMPLETED` | `PENDING`
- `last_accessed`, `time_spent`, `last_position`, `is_completed`
- [UNIQUE: (user, lesson)]
- **Thực tế:** user phải enrolled course chứa lesson này. `enrollment.course == lesson.module.course`.

### `QuizResults`
- `id`, `enrollment → Enrollment [CASCADE]`*, `lesson → Lesson [CASCADE]`*
- `start_time`*, `submit_time`*, `time_taken`
- `total_questions`, `correct_answers`, `total_points`, `score` (Decimal)
- `answers` (JSON), `passed` (bool), `attempt`
- [UNIQUE: (enrollment, lesson)]
- **Thực tế:** lesson phải có `content_type=QUIZ`. Score = correct_answers/total_questions * 100.

### `InstructorEarnings`
- `id`, `instructor → Instructor [CASCADE]`*, `course → Course [CASCADE]`*
- `payment → Payment [NULL]`, `user_subscription → UserSubscription [NULL]`
- `instructor_payout → InstructorPayout [NULL]` *(set sau khi payout)*
- `amount` (Decimal)*, `net_amount` (Decimal)*, `status`: `PENDING` | `AVAILABLE` | `PAID` | `CANCELLED`
- [UNIQUE: (payment, course, instructor) nếu có payment]
- **Thực tế:** Mỗi enrollment tạo ra 1 earning cho instructor. `net_amount = amount * commission_rate`.

### `SubscriptionUsages`
- `id`, `user_subscription → UserSubscription [CASCADE]`*, `user → User [CASCADE]`*
- `course → Course [CASCADE]`*, `enrollment → Enrollment [NULL]`
- `usage_type`: `COURSE_ACCESS` | `LESSON_ACCESS`
- `usage_date`*, `access_count`, `consumed_minutes`, `last_accessed_at`
- [UNIQUE: (user_subscription, user, course, usage_type, usage_date)]

### `ApplicationResponses`
- `id`, `application → Application [CASCADE]`*, `question → FormQuestion [CASCADE]`*
- `value` (JSON)*
- [UNIQUE: (application, question)]

### `ConversationParticipants`
- `id`, `conversation → Conversation [CASCADE]`*, `user → User [CASCADE]`*
- `role`: `OWNER` | `ADMIN` | `MEMBER`
- `joined_at`*, `is_active`
- [UNIQUE: (conversation, user)]

### `Messages` (realtime chat)
- `id`, `conversation → Conversation [CASCADE]`*, `sender → User [CASCADE]`*
- `reply_to_message → Message [NULL]` (self)
- `type`: `TEXT` | `IMAGE` | `VIDEO` | `FILE` | `SYSTEM`
- `status`: `ACTIVE` | `EDITED` | `REVOKED` | `DELETED`
- `text_content`, `metadata` (JSON)

### `SupportReplies`
- `id`, `support → Support [CASCADE]`*, `user → User [CASCADE]`*
- `admin → Admin [NULL]`
- `message`*

### `Answers` (Q&A)
- `id`, `question → Question [CASCADE]`*, `author → User [CASCADE]`*
- `content`*, `is_accepted` (bool), `score`
- `status`: `active` | `deleted`

### `BlogComments`
- `id`, `blog_post → BlogPost [CASCADE]`*, `user → User [CASCADE]`*
- `parent → BlogComment [NULL]` (self, replies)
- `content`*, `likes`, `status`: `active` | `deleted`

---

## LEVEL 8 — Phụ thuộc Enrollment + InstructorEarning

### `Certificates`
- `id`, `user → User [CASCADE]`*, `course → Course [CASCADE]`*
- `enrollment ⇒ Enrollment [CASCADE]`* [UNIQUE]
- `verification_code` [UNIQUE]*, `certificate_url`
- `issued_at`*, `student_name`*, `course_title`*, `instructor_name`*, `completion_date`*
- [UNIQUE: (user, course)]
- **Thực tế:** Chỉ tạo khi `enrollment.status=Complete` và `enrollment.progress=100`.

### `InstructorPayouts`
- `id`, `instructor → Instructor [CASCADE]`*
- `processed_by → Admin [NULL]`
- `amount` (Decimal)*, `fee` (Decimal), `net_amount` (Decimal)*
- `payment_method`, `transaction_id`, `status`: `PENDING` | `PROCESSED` | `CANCELLED` | `FAILED`
- `request_date`*, `processed_date` [NULL], `period`

---

## LEVEL 9 — Phụ thuộc LearningPath, Message, TranscriptSegment

### `LearningPathItems`
- `id`, `path → LearningPath [CASCADE]`*, `course → Course [CASCADE]`*
- `order`*, `reason`, `is_skippable`, `skippable_reason`
- [UNIQUE: (path, order)], [UNIQUE: (path, course)]

### `PathConversations`
- `id`, `path ⇒ LearningPath [CASCADE]`* [UNIQUE]
- `messages` (JSON)*, `advisor_meta` (JSON)

### `MessageAttachments`
- `id`, `message → Message [CASCADE]`*
- `kind`: `IMAGE` | `VIDEO` | `FILE`
- `file_url`*, `file_name`, `mime_type`, `file_size`

### `MessageReactions`
- `id`, `message → Message [CASCADE]`*, `user → User [CASCADE]`*
- `reaction`*
- [UNIQUE: (message, user, reaction)]

### `PinnedMessages`
- `id`, `conversation → Conversation [CASCADE]`*, `message → Message [CASCADE]`*
- `pinned_by → User [CASCADE]`*, `note`, `is_active`

### `MessageDeliveryStates`
- `id`, `message → Message [CASCADE]`*, `user → User [CASCADE]`*
- `delivered_at`, `read_at`
- [UNIQUE: (message, user)]

### `ChatSystemEvents`
- `id`, `conversation → Conversation [CASCADE]`*, `actor → User [NULL]`
- `event_type`, `payload` (JSON)

### `TranscriptSegments`
- `id`, `transcript → LessonTranscript [CASCADE]`*
- `segment_index`*, `start_ms`, `end_ms`, `text`*, `confidence`
- [UNIQUE: (transcript, segment_index)]

### `KnowledgeDocuments`
- `id`, `course → Course [CASCADE]`*, `lesson → Lesson [NULL]`
- `source_type`: `TRANSCRIPT` | `ATTACHMENT`
- `status`: `PENDING` | `PROCESSING` | `READY` | `FAILED` | `STALE`
- `visibility`: `PUBLISHED` | `INSTRUCTOR_PREVIEW`
- `title`, `language_code`, `version`, `checksum`

### `AssistantConversations`
- `id`, `user → User [CASCADE]`*, `course → Course [CASCADE]`*
- `lesson → Lesson [NULL]`
- `title`, `status`: `ACTIVE` | `ARCHIVED`

### `QuestionVotes`
- `id`, `user → User [CASCADE]`*, `question → Question [CASCADE]`*
- `vote_type`: `up` | `down`
- [UNIQUE: (user, question)]

### `AnswerVotes`
- `id`, `user → User [CASCADE]`*, `answer → Answer [CASCADE]`*
- `vote_type`: `up` | `down`
- [UNIQUE: (user, answer)]

---

## LEVEL 10 — Phụ thuộc TranscriptSegment, KnowledgeDocument, AssistantConversation

### `TranscriptWords`
- `id`, `segment → TranscriptSegment [CASCADE]`*
- `word_index`*, `start_ms`, `end_ms`, `text`*, `confidence`
- [UNIQUE: (segment, word_index)]

### `TranscriptChunks`
- `id`, `transcript → LessonTranscript [CASCADE]`*
- `chunk_index`*, `start_ms`, `end_ms`, `text`*, `token_count`
- [UNIQUE: (transcript, chunk_index)]

### `KnowledgeChunks`
- `id`, `document → KnowledgeDocument [CASCADE]`*
- `chunk_index`*, `text`*, `token_count`, `embedding_vector` (JSON)
- [UNIQUE: (document, chunk_index)]

### `KnowledgeIngestJobs`
- `id`, `course → Course [NULL]`, `lesson → Lesson [NULL]`
- `document → KnowledgeDocument [NULL]`
- `status`: `QUEUED` | `PROCESSING` | `COMPLETED` | `FAILED`

### `AssistantMessages`
- `id`, `conversation → AssistantConversation [CASCADE]`*
- `role`: `SYSTEM` | `USER` | `ASSISTANT`
- `content`*, `citations_json` (JSON), `token_usage` (JSON)

### `ChatMessages` (legacy)
- `id`, `room → ChatRoom [CASCADE]`*, `sender → User [CASCADE]`*
- `content`*, `is_read`

---

## LEVEL 11 — SystemsSettings (cần Admin)

### `SystemsSettings`
- `id`, `admin → Admin [NULL]`
- `setting_group`*, `setting_key` [UNIQUE]*, `setting_value`*, `description`

---

## Thứ tự Tạo Dữ Liệu Chuẩn

```
1. Users (admin, instructor, student)
2. InstructorLevels
3. Categories (cha → con)
4. Admin (← User)
5. Instructor (← User, InstructorLevel)
6. RegistrationForms + FormQuestions
7. SubscriptionPlans (← Admin)
8. Courses (← Instructor, Category)
9. Promotions (← Admin/Instructor, ⇔ Course/Category)
10. CourseModules (← Course)
11. Lessons (← CourseModule)
12. QuizQuestions (← Lesson)
13. QuizTestCases (← QuizQuestion)
14. LessonAttachments (← Lesson)
15. Payments (← User, SubscriptionPlan, Promotion)
16. Payment_Details (← Payment, Course)
17. UserSubscriptions (← User, SubscriptionPlan, Payment)
18. Enrollments (← User, Course, Payment/Subscription)
19. LearningProgress (← User, Enrollment, Course, Lesson)
20. QuizResults (← Enrollment, Lesson)
21. Certificates (← User, Course, Enrollment)
22. InstructorEarnings (← Instructor, Course, Payment)
23. InstructorPayouts (← Instructor, Admin)
24. Reviews (← Course, User)
25. BlogPosts → BlogComments
26. Questions → Answers → Votes
27. LearningPaths → LearningPathItems
28. Notifications, ActivityLogs
29. Supports → SupportReplies
30. Carts, Wishlists
31. SystemsSettings
```

---

## Các Ràng Buộc Thực Tế Quan Trọng

| Quy tắc | Mô tả |
|---|---|
| Chỉ `PUBLISHED` course mới có thể mua/enroll | `course.status = PUBLISHED` |
| Review phải có enrollment trước | `Review.user` phải có `Enrollment(user, course)` |
| Certificate chỉ tạo khi hoàn thành | `enrollment.status=Complete` và `progress=100` |
| Enrollment source=PURCHASE cần Payment | `payment` không null và `payment_type=COURSE_PURCHASE` |
| Enrollment source=SUBSCRIPTION cần UserSubscription | `subscription` không null và `status=ACTIVE` |
| Payment_Detail per course | Mỗi course trong giỏ hàng tạo 1 Payment_Detail |
| Subcategory phải thuộc category | `course.subcategory.parent = course.category` |
| InstructorEarning per enrollment | Mỗi enrollment tạo 1 earning cho instructor của course |
| Quiz lesson cần QuizQuestions | Lesson `content_type=QUIZ` phải có ít nhất 1 QuizQuestion |
| UserSubscription 1 ACTIVE | Không có 2 subscription ACTIVE cùng lúc cho 1 user |
