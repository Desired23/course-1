# Audit Khop FE/BE Theo Role

## Pham vi

Da doi chieu theo feature-level, khong chi theo route:

- User pages
- Instructor pages
- Admin pages
- Shared dialogs/forms co hanh vi nghiep vu
- FE services va BE urls/views tuong ung

Quy uoc:

- `OK`: da khop FE/BE o muc can thiet
- `Partial`: da co flow that, nhung van con khoang trong UX/edge cases
- `Legacy`: man cu, da thay the hoac chi nen giu de canh bao

## User

| Man hinh | Trang thai | Ghi chu | Pri |
|---|---|---|---|
| `MyLearning` | OK | Khong thay gap lon | P3 |
| `CoursePlayer - progress` | OK | Progress da gan dung `enrollment` khi create/update | P3 |
| `CoursePlayer - notes` | OK | Notes da sync qua `learning_progress.notes` | P3 |
| `CoursePlayer - comments/replies` | OK | Dang dung lesson comments API | P3 |
| `CoursePlayer - video bookmarks` | OK | Bookmark da sync chung persistence lesson data | P3 |
| `Cart` | OK | Khong thay gap lon | P3 |
| `Checkout` | OK | Flow payment chinh da co | P3 |
| `SubscriptionCheckout` | OK | Khong thay gap lon | P3 |
| `PaymentResult` | OK | Khong thay gap lon | P3 |
| `Wishlist` | OK | Khong thay gap lon | P3 |
| `Profile` | OK | Khong thay gap lon | P3 |
| `AccountSettings` | OK | Khong thay gap lon | P3 |
| `Notifications` | OK | Khong thay gap lon | P3 |
| `Support - tickets` | OK | Da noi list/create/reply thread ticket that | P3 |
| `Support - quick contact` | OK | Da don UI gia, chuyen ve luong ticket that | P3 |
| `UserPaymentMethods` | OK | CRUD + set default da co | P3 |
| `UserSubscriptions` | OK | Khong thay gap lon | P3 |
| `MyReviews` | OK | Review API da khop | P3 |
| `TransactionHistory` | OK | Refund/request/cancel da co API | P3 |

## Instructor

| Man hinh | Trang thai | Ghi chu | Pri |
|---|---|---|---|
| `InstructorDashboard` | OK | Khong thay gap lon | P3 |
| `InstructorCourses` | OK | Khong thay gap lon | P3 |
| `InstructorCreateCourse` | OK | Khong thay gap lon | P3 |
| `InstructorCourseLanding` | OK | Khong thay gap lon | P3 |
| `InstructorCourseDetail` | OK | Khong thay gap lon | P3 |
| `InstructorLessonsPageNew - add/delete/reorder` | OK | Day la man active chinh | P3 |
| `InstructorLessonsPageNew - edit section` | OK | Da co dialog edit section + update module that | P3 |
| `InstructorLessonEditor` | OK | Khong thay gap lon | P3 |
| `InstructorQuizzes` | OK | CRUD quiz/question da noi | P3 |
| `InstructorResources` | OK | CRUD attachment da noi | P3 |
| `InstructorCommunication - announcements` | OK | Da noi create/update/revoke | P3 |
| `InstructorCommunication - Q&A/messages` | OK | Q&A reply da goi API that, messages di qua chat context/realtime hien co | P3 |
| `InstructorAnalytics` | OK | Charts + API da khop | P3 |
| `InstructorDiscounts` | OK | Khong thay gap lon | P3 |
| `InstructorEarnings` | OK | Khong thay gap lon | P3 |
| `InstructorSubscriptionRevenue` | OK | Khong thay gap lon | P3 |
| `InstructorPayouts` | OK | Khong thay gap lon | P3 |
| `InstructorProfile` | OK | Khong thay gap lon | P3 |
| `InstructorStudents` | OK | Da co student list/detail/export CSV that | P3 |
| `InstructorOnboarding` | OK | Khong thay gap lon | P3 |
| `InstructorLessonsPage.tsx` cu | Legacy | Da duoc danh dau deprecated, khong nen mo rong tiep | P3 |

## Admin

| Man hinh | Trang thai | Ghi chu | Pri |
|---|---|---|---|
| `AdminDashboard` | OK | Du lieu that, nhung van nen doi ten state `mock*` cho ro hon | P3 |
| `AdminUsers` | OK | Khong thay gap lon | P3 |
| `CreateUser / EditUser` | OK | Khong thay gap lon | P3 |
| `AdminCourses` | OK | Khong thay gap lon | P3 |
| `AdminCourseDetail` | OK | Khong thay gap lon | P3 |
| `AdminBlogPosts` | OK | Da gui `category` dung vao payload create/update | P3 |
| `AdminCategories` | OK | CRUD chinh da co | P3 |
| `AdminDiscounts` | OK | Khong thay gap lon | P3 |
| `AdminAnalytics` | OK | Dung charts/API that | P3 |
| `Statistics` | OK | Khong thay gap lon | P3 |
| `Permissions` | OK | Khong thay gap lon | P3 |
| `ActivityLog` | OK | Khong thay gap lon | P3 |
| `AdminInstructorApplications` | OK | Khong thay gap lon | P3 |
| `ReviewManagement` | OK | Da moderate flagged review theo review report lifecycle that | P3 |
| `AdminForum - create topic` | OK | Da dung `forum id` that | P3 |
| `AdminForum - moderation` | OK | Da moderate topic/report qua endpoint that; action chua co domain da duoc an/bo | P3 |
| `PaymentManagement - payments` | OK | Flow payment chinh van dung API that | P3 |
| `PaymentManagement - refunds` | OK | Da co refund queue/action admin that | P3 |
| `PaymentManagement - policies/rates/discount rules` | OK | Da chuyen sang payments admin config endpoints thay vi local/settings gia | P3 |
| `AdminSubscriptionPage - create plan` | OK | Da bind form vao payload that | P3 |
| `AdminSubscriptionPage - extend/cancel subscription` | OK | Da noi endpoint admin lifecycle that | P3 |
| `AdminSubscriptionPage - revenue pool settings` | OK | Da luu settings that | P3 |
| `PaymentMethodsPage` | OK | Settings-backed, khong thay gap lon | P3 |
| `PaymentGatewaySettingsPage` | OK | Settings-backed, khong thay gap lon | P3 |
| `PlatformSettingsPage` | OK | Settings-backed, khong thay gap lon | P3 |
| `AdminWebsiteSettingsPage` | OK | Settings-backed, khong thay gap lon | P3 |
| `WebsiteManagementPage` | OK | Da co upload image that | P3 |
| `AdminHomeLayoutPage` | OK | Public homepage da doc `homepage_layout` that | P3 |
| `HomepageConfigPage` | Legacy | Da duoc danh dau deprecated, khong nen mo rong tiep | P3 |
| `ReportManagementPage` | OK | Da la report hub that cho `forum_post + review` | P2 |

## Backlog con lai de lam tiep

| Epic | Task | Loai | Owner | Pri |
|---|---|---|---|---|
| `Reports Phase 2` | Mo rong report hub sang `Q&A`, `user`, `course`, `message` neu can business | FE+BE | FE+BE | P2 |
| `Instructor Communication` | Ra UX/chat state, loading/error cho Q&A/messages | FE | FE | P3 |
| `Admin Dashboard` | Doi ten cac state `mock*` sang ten domain that | FE | FE | P3 |
| `Review Management` | Neu can, hien thi ly do report chi tiet hon cho review flagged | FE | FE | P3 |
| `Cleanup` | Tiep tuc don cac man legacy/deprecated con sot neu muon clean codebase hon | FE | FE | P3 |

## Tong ket

Nhung nhom da dong trong dot nay:

1. `learning_progress`, notes, bookmarks
2. `Support tickets + replies`
3. `AdminForum`, `AdminSubscriptionPage`, `PaymentManagement refunds`
4. `WebsiteManagement upload`, `Homepage layout -> public homepage`
5. `Instructor lessons edit section`, `InstructorStudents`
6. `ReportManagement` domain V1 cho `forum_post + review`

Backlog con lai chu yeu la mo rong scope report va cleanup/UX, khong con la cac mismatch FE/BE P1 lon nhu ban audit ban dau.
