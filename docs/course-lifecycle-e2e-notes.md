# Course Lifecycle E2E Notes

Ngay tao: 2026-06-15

Muc dich: giu ngu canh end-to-end cho cac nghiep vu nam giua "ngung ban", "archive", "xoa", "copyright takedown", "hard block", "forced refund" va "3-strike policy".

## Pham vi dieu tra

Da doc cac vung code chinh:

- Backend course lifecycle:
  - `course/courses/models.py`
  - `course/courses/services.py`
  - `course/courses/views.py`
  - `course/courses/urls.py`
  - `course/courses/serializers.py`
- Backend access:
  - `course/utils/course_access.py`
  - `course/lessons/services.py`
  - `course/lessons/views.py`
  - `course/lessons/serializers.py`
- Backend interaction:
  - `course/questions/services.py`
  - `course/questions/views.py`
  - `course/answers/services.py`
  - `course/lesson_comments/services.py`
  - `course/lesson_comments/views.py`
  - `course/reviews/services.py`
  - `course/quiz_results/services.py`
- Backend report/copyright:
  - `course/reports/models.py`
  - `course/reports/services.py`
  - `course/reports/copyright_services.py`
  - `course/reports/views.py`
  - `course/reports/serializers.py`
  - `course/reports/adapters.py`
- Backend payment/refund:
  - `course/payments/models.py`
  - `course/payment_details/models.py`
  - `course/payments/refund_services.py`
  - `course/enrollments/models.py`
- Backend support:
  - `course/supports/models.py`
  - `course/supports/services.py`
  - `course/supports/views.py`
- Frontend course/admin/instructor/student:
  - `course_fe/src/services/course.api.ts`
  - `course_fe/src/pages/instructor/InstructorCoursesPage.tsx`
  - `course_fe/src/pages/instructor/InstructorCourseDetailPage.tsx`
  - `course_fe/src/pages/admin/AdminCoursesPage.tsx`
  - `course_fe/src/pages/admin/AdminCourseDetailPage.tsx`
  - `course_fe/src/pages/public/CourseDetailPage.tsx`
  - `course_fe/src/pages/user/CoursePlayerPage.tsx`
  - `course_fe/src/services/report.api.ts`
  - `course_fe/src/pages/admin/ReportManagementPage.tsx`

## Course model hien tai

`Course.Status` hien co:

- `draft`
- `pending`
- `published`
- `rejected`
- `archived`

Ngoai `status`, course co 2 co moderation quan trong:

- `admin_hidden`: an khoi marketplace / ngung ban.
- `is_hard_blocked`: chan truy cap hoc vien cu.

Y nghia thuc te hien tai:

- Public listing chi hien course `published`, `is_public=True`, `admin_hidden=False`, `is_hard_blocked=False`.
- `course_not_buyable_reason()` chan mua moi neu course deleted, hard blocked, admin hidden, khong published, khong public, instructor inactive/deleted.
- `check_course_access()` cho admin, owner instructor, enrollment purchase/subscription hop le; nhung chan neu `is_hard_blocked=True`.

## Luong course lifecycle hien tai

### Instructor update course status

Frontend:

- Instructor list/detail goi `updateCourse(course.id, { status })`.
- API frontend: `PATCH /courses/:id/update`.

Backend:

- `CourseListView.patch()`
- `update_course(course_id, data, requesting_user=request.user)`
- Instructor chi duoc di theo `INSTRUCTOR_ALLOWED_STATUS_TRANSITIONS`.

Status transition hien tai cho instructor:

- `draft -> pending`
- `pending -> draft`
- `rejected -> draft | pending`
- `archived -> draft | pending`
- `published -> archived | draft`

Luu y lech nghiep vu:

- Backend dang chan instructor archive neu course co enrollment active/complete.
- Frontend cung an nut archive neu `total_students > 0`.
- Nghiep vu moi lai can archive chinh cac khoa da co hoc vien cu de bien thanh read-only/no support.

### Admin moderate course

Frontend:

- Admin course pages goi `moderateCourse(courseId, action, reason?)`.
- API frontend: `POST /courses/:id/moderate`.

Backend:

- `CourseModerationView.post()`
- `moderate_course(course_id, action, reason)`

Actions hien tai:

- `approve`: set `status=published`, `admin_hidden=False`, `is_hard_blocked=False`.
- `reject`: set `status=rejected`.
- `archive`: set `status=archived`, `admin_hidden=True`.
- `hide`: set `admin_hidden=True`.
- `hard_block`: set `is_hard_blocked=True`, `admin_hidden=True`.
- `unblock`: set `is_hard_blocked=False`, `admin_hidden=False`; neu archived thi set published.
- `delete`: chi cho xoa neu course khong co bound data.

Luu y:

- Backend co `archive` action cho admin, nhung admin UI detail/list hien chu yeu expose hide/hard_block/unblock/delete/approve/reject; khong thay luong archive ro rang.
- `delete` khong hard-delete DB, ma soft-delete `is_deleted=True`.

## Luong access hoc vien

### Course detail / player

Frontend:

- `CourseDetailPage` goi `getCourseById(courseId)` va dung `access_info`.
- `CoursePlayerPage` goi `getCourseById(courseId)`, neu `access_info.has_access=False` thi bao not enrolled.

Backend:

- `CourseDetailView.get()`
- `get_course_by_id(course_id, user)`
- `CourseDetailSerializer.get_access_info()`
- `get_course_access_info(user, course)`

Media:

- `CourseDetailSerializer.get_modules()` set `media_allowed=True` neu `has_existing_course_access(user, course)`.
- `LessonSummarySerializer` chi tra `video_url`, `video_public_id`, `signed_video_url` neu media allowed hoac lesson is free.

Luu y bao mat:

- `LessonDetailView.get()` hien goi `get_lesson_by_id()` va `LessonSerializer` truc tiep.
- `LessonSerializer` luon build `signed_video_url`.
- Endpoint `GET /lessons/:id` co role permission, nhung khong goi `check_lesson_access`.
- Can xem lai neu user co role student nhung chua mua course co lay signed video URL qua endpoint lesson detail duoc khong.

### Hard block

Backend:

- `check_course_access()` chan ngay neu `course.is_hard_blocked=True`.
- `get_course_access_info()` tra `has_access=False, hard_blocked=True`.
- `get_course_by_id()` an course hard blocked voi user khong phai admin/owner.

Ket luan:

- Hard block dang la co dung cho "dong bang vinh vien / chan truy cap".
- Chua tu dong forced refund khi hard block/takedown.

## Archive nghiep vu moi

Yeu cau nghiep vu:

- Course archived khong ban moi.
- Hoc vien cu van xem video.
- Khoa toan bo interaction:
  - Q&A / question
  - answer
  - lesson comment
  - quiz submit
  - review create/update
  - assignment submit neu sau nay co app assignment
- UI player/course detail hien banner: "Khoa hoc nay da duoc luu tru va khong con nhan ho tro tu giang vien."

Hien trang:

- `Course.Status.ARCHIVED` da co.
- `get_course_by_id()` cho hoc vien co existing access xem course archived.
- `course_not_buyable_reason()` chan mua moi vi course status khong published.
- Nhung cac interaction chua check archived:
  - `create_question()` khong check course.
  - `create_answer()` chi check question open.
  - `create_lesson_comment()` khong check course archived.
  - `submit_quiz()` goi `check_lesson_access()`, ma archived van cho access.
  - `create_review()` chi check enrollment/progress.

Diem can them:

- Them helper tap trung trong `utils/course_access.py`, vi du:
  - `is_course_archived(course)`
  - `course_interaction_not_allowed_reason(course, feature)`
  - `ensure_course_interaction_allowed(course, feature)`
- Goi helper nay tai cac service ghi du lieu interaction.
- Frontend CourseDetail/Player can doc `course.status === 'archived'` de hien banner va disable form/nut.

## Unpublish / Ngung ban

Hien tai co the dat bang:

- `admin_hidden=True`; hoac
- course khong con `published`; hoac
- `is_public=False`.

Khuyen nghi:

- Khong can them status moi neu muon toi thieu migration.
- Nen chuan hoa service/action nghiep vu:
  - `hide` = ngung ban/admin hidden, hoc vien cu van hoc.
  - `archive` = ngung ban + read-only/no interaction.
  - `hard_block` = chan truy cap + can refund policy.

## Deletion request / support ticket

Hien tai:

- Co app `supports` voi `Support` chung.
- Fields: `user`, `name`, `email`, `subject`, `message`, `status`, `priority`, `admin`.
- Chua co `ticket_type`, `course`, `resolution`, `metadata`.

Nghiep vu can:

- Instructor khong duoc tu xoa course da co enrollment/payment/review/earning.
- Instructor gui deletion request cho admin.
- Admin tham dinh va quyet dinh:
  - reject
  - archive
  - hide
  - hard block
  - force delete/soft delete
  - refund required/manual compensation

Huong thiet ke:

- Nhanh: mo rong `Support` them `ticket_type`, `course`, `metadata`, `resolution`.
- Sach hon: tao `CourseDeletionRequest` rieng de co lifecycle ro.

Khuyen nghi:

- Dung model rieng neu nghiep vu se co admin decision/refund/audit.
- Van co the tao support ticket lien ket de user/admin trao doi.

## Copyright report / takedown

Hien tai da kha day du.

Frontend:

- `report.api.ts` co report/copyright case APIs.
- `ReportManagementPage` co action:
  - `suspend_sale_hold`
  - `hide_lesson_hold`
  - `suspend_access_hold`
  - `confirm_takedown`
  - `reject_restore`
  - `restore_release`
  - `request_reporter_info`
  - `request_instructor_response`

Backend:

- `create_report(... reason=copyright ...)` tao/cap nhat `CopyrightCase`.
- `CopyrightCase` co status, severity, content_action, financial_action.
- `admin_action()` dieu phoi cac action.

Effects hien tai:

- `suspend_sale_hold`: `course.admin_hidden=True`, hold pending/available earning.
- `suspend_access_hold`: `course.admin_hidden=True`, `course.is_hard_blocked=True`, hold earning.
- `confirm_takedown`: set case `TAKEDOWN`, apply course hard block, cancel unpaid earning, mark paid earning for manual follow-up.
- `reject_restore`/`restore_release`: restore course and release holds.

Thieu so voi nghiep vu moi:

- Chua co `Course.Status.UNDER_REVIEW`; dang dung `CopyrightCase.status` + `admin_hidden`.
- Khi tao report copyright, course khong tu dong sale-suspended ngay; admin phai action.
- `confirm_takedown` chua tao forced refund cho toan bo hoc vien da mua course.
- Chua co strike model.

Can quyet dinh:

- Co them `Course.Status.UNDER_REVIEW` khong?
- Hay giu course status cu, expose active copyright case/moderation badge ra UI?

Huong it dung migration:

- Khong them status course.
- Khi copyright case open va admin action sale suspend, dung `admin_hidden=True`.
- UI hien "Under Review" dua tren active copyright case/content_action.

## Report analytics / thong ke moderation

Yeu cau bo sung:

- Admin can dashboard/thong ke report cu the, khong chi xu ly tung case.
- Can thong ke theo:
  - thoi gian: ngay/tuan/thang, date range tuy chon.
  - target type: course, lesson, review, question, answer, blog, comment, message.
  - reason: copyright, spam, offensive, harassment, misinformation, other.
  - status: pending, reviewing, resolved, dismissed.
  - priority: low, medium, high, critical.
  - copyright case status: under_review, awaiting_instructor_response, takedown, restored, escalated_legal, etc.
  - severity: low, medium, high, confirmed, legal.
  - action_taken/content_action/financial_action.
  - overdue/SLA: reporter overdue, instructor overdue, admin unresolved over threshold.
  - owner/instructor, course/category neu target la course/lesson.

Hien trang:

- Backend `get_report_cases()` da co filter:
  - `type`
  - `status`
  - `priority`
  - `search`
  - `date_from`
  - `date_to`
- API hien tai: `GET /api/reports/admin/`.
- Response hien co case-level fields:
  - `report_count`
  - `priority`
  - `top_reason`
  - `reason_breakdown`
  - `last_reported_at`
  - `copyright_case_id`
  - `copyright_overdue`
- `ReportManagementPage` dang tinh `criticalCount`, `highCount`, `overdueCount` tren danh sach case hien dang load, khong phai aggregate toan bo du lieu.
- Chua thay endpoint thong ke rieng cho report dashboard.

Khoang trong:

- Chua co endpoint aggregate cho admin dashboard, vi du:
  - total reports/cases by status.
  - trend theo ngay/tuan/thang.
  - breakdown by target_type/reason/priority/severity.
  - top reported courses/instructors.
  - average resolution time.
  - overdue count/SLA breach.
  - copyright financial exposure: held amount, manual follow-up count.
- Chua co export CSV/Excel cho report/copyright cases.
- Chua co saved filters hoac preset date range tren frontend.

De xuat backend:

- Them service `get_report_statistics(filters)` trong `reports/services.py`.
- Them endpoint admin, vi du:
  - `GET /api/reports/admin/stats/`
- Query params nen reuse filter hien co:
  - `type`
  - `status`
  - `reason`
  - `priority`
  - `date_from`
  - `date_to`
  - `group_by=day|week|month`
  - `instructor_id`
  - `course_id`
  - `copyright_status`
  - `severity`
- Response de xuat:
  - `summary`: total_reports, open_cases, resolved_cases, dismissed_cases, overdue_cases, critical_cases.
  - `by_status`
  - `by_target_type`
  - `by_reason`
  - `by_priority`
  - `by_severity`
  - `trend`
  - `top_targets`
  - `top_instructors`
  - `resolution_time`
  - `copyright_financials`

De xuat frontend:

- ReportManagementPage them dashboard cards dung aggregate endpoint thay vi dem current page.
- Them chart:
  - reports over time.
  - breakdown by type/reason/status.
  - copyright SLA overdue.
- Them filter bar date range + type + status + reason + priority.
- Them export cho admin.

Luu y thiet ke:

- Can tach "individual report" va "case/grouped report":
  - Report table hien grouping theo `target_type + target_id`.
  - Thong ke co the can ca raw report count va grouped case count.
- Nen dinh nghia ro metric:
  - `total_reports`: so dong `Report`.
  - `open_cases`: so target groups co pending/reviewing report.
  - `copyright_cases`: so dong `CopyrightCase`.
  - `overdue_cases`: copyright case qua deadline hoac open qua SLA.

## Forced refund khi hard block/takedown

Hien tai:

- Refund model nam o `Payment_Details`.
- `admin_create_refund(payment_id, payment_details_ids, admin_user, reason)` da co.
- Success side effect:
  - update payment refund amount/status
  - enrollment -> cancelled
  - earning -> cancelled
  - revoke certificate
  - hide review
  - recalc course students/rating

Khoang trong:

- Chua co service batch refund theo `course_id`.
- `admin_create_refund` ap dung rule `_ensure_earning_not_paid_out()`.
- Nghiep vu forced refund co the can refund ca khi earning da PAID, luc do phai manual follow-up thay vi block toan bo.

De xuat service:

- `force_refund_course_purchases(course, admin_user_or_admin, reason, source_case=None)`
- Quet `Payment_Details` theo course:
  - payment type course purchase
  - payment completed/refunded partial
  - detail not deleted
  - not already in refund lifecycle / not success
- Tao refund cho tung detail.
- Neu earning da paid/processed payout:
  - ghi manual follow-up item
  - khong lam fail toan bo batch.
- Tra ve summary:
  - created_count
  - skipped_count
  - manual_follow_up_count
  - errors

Noi vao:

- `reports.copyright_services.admin_action(... confirm_takedown ...)`
- course admin hard_block action neu policy bat forced refund.

## 3-strike policy

Hien tai:

- `User.StatusChoices` co `banned`.
- Co admin ban/unban user.
- Chua co `InstructorStrike`.

Can them:

- Model `InstructorStrike`:
  - instructor
  - source_case
  - reason/category
  - severity
  - created_by
  - created_at
  - revoked_at/revoked_by optional
- Khi `confirm_takedown` copyright:
  - tao strike neu chua co strike cho case do.
  - dem active strikes.
  - neu >= 3:
    - set instructor.user.status = banned
    - hide/hard block tat ca course cua instructor theo policy
    - notify admin/instructor
    - khong hard-delete data giao dich.

Can can nhac:

- "Xoa tat ca course khoi marketplace" nen la `admin_hidden=True`, khong nen `is_deleted=True`.
- Co nen hard block tat ca course khac hay chi hide marketplace? Nghiep vu noi "xoa khoi marketplace", nen mac dinh chi hide sale, khong chan hoc vien cu tru khi vi pham lien quan.

## UI gaps

Instructor:

- `InstructorCoursesPage` va `InstructorCourseDetailPage` dang an archive neu course co hoc vien.
- Can doi neu chap nhan archive read-only.
- Can hien canh bao archive co nghia la no-support/no-interaction.

Admin:

- Admin list/detail expose hide/hard_block/unblock/delete.
- Admin UI chua co archive action ro.
- Admin report UI co copyright action kha day du.
- Can them summary forced refund/manual follow-up neu confirm takedown.

Student:

- `CourseDetailPage` dung `access_info` va cho review neu progress > 50.
- Chua disable review khi archived.
- `CoursePlayerPage` chua co banner archived.
- `CoursePlayerPage` comments tab van cho comment neu backend cho.
- Quiz UI van cho submit vi backend `submit_quiz()` van cho course archived.

## Suggested implementation order

1. Archive read-only:
   - Backend helper in `course_access.py`.
   - Remove backend block "cannot archive course with active student access".
   - Update instructor UI to allow archive with students.
   - Add student banner and disable interaction forms.
   - Add tests for Q&A/comment/quiz/review blocked on archived course.

2. Deletion request:
   - Add `CourseDeletionRequest` or extend `Support`.
   - Instructor creates request, admin resolves.
   - Keep existing delete guard for bound data.

3. Forced refund batch:
   - Add course-level refund service.
   - Wire to copyright `confirm_takedown`.
   - Add manual follow-up path for paid earnings.

4. 3-strike:
   - Add `InstructorStrike`.
   - Wire to copyright confirmed takedown.
   - Auto-ban user at 3 active strikes.

5. Under review display:
   - Prefer active copyright case badge instead of new course status unless product wants status-level filtering.

## Open questions

- Archive co cho hoc vien tao note/bookmark ca nhan khong? Current user note/bookmark nam trong player learning data, khong phai tuong tac voi instructor. Nghiep vu noi khoa tuong tac, co the van cho personal notes.
- Under review co tu dong ngung ban ngay khi report copyright duoc tao khong, hay chi khi admin bam `suspend_sale_hold`?
- Hard block co luon forced refund khong, hay chi forced refund voi reason copyright/takedown/permanent freeze?
- Khi instructor bi 3 strikes, course khac nen:
  - chi hide marketplace, hoc vien cu van hoc; hay
  - hard block tat ca course va refund?
- Forced refund co bo qua gioi han progress 50% khong? Nghiep vu "cuong che hoan tien toan bo" co ve la co.

## Important current mismatch

Ten `archived` hien dang duoc code xem nhu "khong nen co hoc vien", nhung nghiep vu moi xem `archived` la "hoc vien cu van xem, khong con support/interaction".

Day la diem can sua dau tien neu trien khai.
