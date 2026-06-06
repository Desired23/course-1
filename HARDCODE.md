# HARDCODE — Dữ liệu sai / giả không đúng thực tế ứng dụng

> Báo cáo này **chỉ liệt kê những chỗ text/dữ liệu mô tả SAI thông tin** (số liệu bịa, tên người/công ty không có thật, ảnh placeholder, URL sai, email giả, dữ liệu mock hiển thị như thật).
> **KHÔNG bao gồm** lỗi chưa dịch i18n (text chưa wrap `t()`) — đó là vấn đề khác.
>
> Phạm vi quét: `course_fe/` (frontend) + `course/` (backend Django).
> Ngày quét: 2026-06-05. — **Cập nhật khắc phục: 2026-06-06** (xem mục dưới).

---

## ✅ TRẠNG THÁI KHẮC PHỤC (2026-06-06)

> Phạm vi sửa: **chỉ code backend + frontend** (KHÔNG đụng file cấu hình: `settings.py`, `.env`, `render.yaml`, `package.json`, `index.html`, `vite.config`). Các secret trong `settings.py` được giữ nguyên theo yêu cầu — vẫn cần **revoke/rotate** thủ công (ngoài phạm vi code).

| Hạng mục | Việc đã làm | Trạng thái |
|----------|-------------|------------|
| Số liệu bịa public (mục 1, 10, 11, 18) | `PopularSkillsSection`, `HeroSection`, **`TeachOnUdemyPage`**, **`UdemyBusinessPage`** → nối `getPublicStats()`; tile không có nguồn (languages/enrollments/companies/24-7) bị **gỡ**. `TopicPage` & `EnhancedSearchPage` → nối `getCourses()`/`getInstructors()`/blog thật | ✅ Done |
| ⚠️ Đính chính tên file | Trang thật là **`TeachOnUdemyPage.tsx`** / **`UdemyBusinessPage.tsx`** (routed `/teach`), KHÔNG phải `*Utc*` như scan ban đầu ghi. Đã sửa đúng file thật; file `*Utc*` phantom đã gỡ khỏi index. | ✅ Done |
| Testimonial bịa (mục 2, 9) | `TestimonialsSection` → nối `getHomepageReviews()` (ẩn khi rỗng); section testimonial bịa ở `TeachOnUtcPage`/`UtcBusinessPage` đã **gỡ** | ✅ Done |
| Blog/comment giả (mục 16) | `BlogPostPage` → `getPublishedBlogPost()` + `getBlogComments()` | ✅ Done |
| Công ty giả Netflix/Volkswagen (mục 2) | `TrustedCompanies` → trả `null` (ẩn, không có nguồn thật) | ✅ Done |
| `$10K+` avg earnings (mục 1) | Gỡ card khỏi `InstructorPromo` | ✅ Done |
| Mock notifications/tasks (mục 17) | `NotificationPopup`/`PendingTasks` → empty state (bỏ mock) | ✅ Done |
| Dev test users `example.com` (mục 5) | `FloatingNavigation` → gate sau `import.meta.env.DEV` | ✅ Done |
| Dev note "Mock save"/"Phase 1" (mục 6) | `AiLearningPathPage` → thay bằng message trung thực | ✅ Done |
| VideoPlayer rickroll (mục 22) | Default `url` → rỗng (bỏ `dQw4w9WgXcQ`) | ✅ Done |
| Brand loạn → UTC (mục 13, 19) | `useSiteBranding` default = "UTC"; `mailer.py` đọc `site_name`/`contact_email` từ `systems_settings` (bỏ "MyCourse"/`support@example.com`); Footer social bỏ link Udemy sai | ✅ Done |
| PDF "seeded demo data" (mục 20) | `lesson_attachments/views.py` → trả 404 thay vì PDF demo | ✅ Done |
| Secret hardcode (mục 8, 15, 20) | **Giữ nguyên** trong `settings.py`/FE theo yêu cầu không sửa config | ⏸️ Cần revoke thủ công |
| commission 30% / refund 50% / passing_score 70 (mục 14, 20) | Đánh giá là **default hợp lý** (cấu hình được qua DB/level), không phải "dữ liệu sai hiển thị" → giữ | ⏸️ Optional |
| VNPay IP `127.0.0.1` (mục 20) | Refund là **server-initiated** (không có request client) → IP server hợp lệ → giữ | ⏸️ Acceptable |
| Lý do AI fallback (mục 20) | Là câu giải thích generic hợp lý (không bịa dữ liệu app) → giữ | ⏸️ Acceptable |
| Ảnh Unsplash/pravatar fallback (mục 4) | Còn lại ở 1 số fallback trang trí; ưu tiên thấp, chưa thay | 🔶 Còn lại |
| Dead data testimonial/earnings trong `locales` (mục 9, 18) | Không còn render (đã chuyển sang API) → còn nằm trong file dạng dead data, có thể dọn sau | 🔶 Optional |

**Kiểm chứng:** `tsc --noEmit` — các lỗi còn lại đều **pre-existing** (motion `Variants` ease-array, alias `@/`, `Comment` import trùng, `.toLocaleString()`); không phát sinh lỗi mới từ thay đổi. Cú pháp Python OK.

---

## ⚠️ Mức độ nghiêm trọng

| Mức | Ý nghĩa |
|-----|---------|
| 🔴 Cao | Hiển thị cho end-user / public, gây hiểu lầm về quy mô & uy tín app (số liệu bịa, tên/logo công ty giả) |
| 🟠 Trung bình | Ảnh/URL placeholder, email/URL giả, dữ liệu mock thay vì gọi API |
| 🟡 Thấp | Note dev / mock message lọt ra UbI, placeholder kỹ thuật |

---

## 1. 🔴 Số liệu thống kê BỊA (fake statistics) hiển thị public

Đây là vấn đề nghiêm trọng nhất: app hiển thị các con số "hoành tráng" không có thật, không lấy từ DB/API.

### `course_fe/src/components/PopularSkillsSection.tsx`
| Dòng | Giá trị bịa | Vấn đề |
|------|-------------|--------|
| ~46 | `"5,000+"` (khóa học) | Số khóa học bịa, phải lấy từ `getPublicStats()` |
| ~51 | `"800K+"` (học viên) | Số học viên bịa |
| ~56 | `"1,200+"` (giảng viên) | Số giảng viên bịa |
| ~5 | `POPULAR_SKILLS = ["Web Development","Python","Data Science","UI/UX Design","Digital Marketing"]` | Danh sách kỹ năng "phổ biến" hardcode, không phản ánh dữ liệu thật |

### `course_fe/src/pages/public/TeachOnUtcPage.tsx`
| Dòng | Giá trị bịa | Vấn đề |
|------|-------------|--------|
| ~11 | `"73M"` (students) | Sao chép số liệu Udemy, app không có 73 triệu học viên |
| ~12 | `"219K"` (courses) | Số khóa học bịa |
| ~13 | `"75"` (languages) | Số ngôn ngữ bịa |
| ~14 | `"1B+"` (enrollments) | 1 tỉ lượt ghi danh — hoàn toàn bịa |

### `course_fe/src/pages/public/UtcBusinessPage.tsx`
| Dòng | Giá trị bịa | Vấn đề |
|------|-------------|--------|
| ~29 | `"15,000+"` companies | Số doanh nghiệp bịa |
| ~30 | `"1M+"` learners | 1 triệu học viên bịa |
| ~31 | `"4.5"` rating | Điểm đánh giá nền tảng bịa |
| ~32 | `"24/7"` support | Tuyên bố hỗ trợ 24/7 — không phải số liệu thật/đo được |

### `course_fe/src/components/InstructorPromo.tsx`
| Dòng | Giá trị bịa | Vấn đề |
|------|-------------|--------|
| ~87 | `"$10K+"` | Thu nhập trung bình giảng viên bịa, gây hiểu lầm |

---

## 2. 🔴 Tên người / công ty / testimonial GIẢ (sao chép Udemy)

Các tên này là **giảng viên & công ty thật của Udemy**, bị copy nguyên vào app → sai sự thật, có rủi ro pháp lý.

### `course_fe/src/pages/public/TeachOnUtcPage.tsx`
| Dòng | Giá trị giả | Vấn đề |
|------|-------------|--------|
| ~55 | `name: "Paulo Dichone"` | Giảng viên Udemy thật, testimonial bịa |
| ~62 | `name: "Angela Yu"` | Giảng viên Udemy nổi tiếng, không thuộc app |
| ~69 | `name: "Jose Marcial Portilla"` | Giảng viên Udemy thật |

### `course_fe/src/pages/public/UtcBusinessPage.tsx`
| Dòng | Giá trị giả | Vấn đề |
|------|-------------|--------|
| ~74 | `instructor: "Jose Portilla"`, `students: "1.2M+"` | Giảng viên + số học viên bịa cho khóa học mock |
| ~81 | `instructor: "Stephane Maarek"`, `students: "800K+"` | Giảng viên AWS nổi tiếng của Udemy, bịa |
| ~88 | `instructor: "Rob Percival"`, `students: "650K+"` | Giảng viên Udemy thật, bịa |
| ~95 | `instructor: "Maximilian Schwarzmüller"`, `students: "900K+"` | Giảng viên Udemy thật, bịa |
| ~37 | `name: "Sarah Johnson", company: "TechCorp"` | Testimonial doanh nghiệp giả |
| ~43 | `name: "Michael Chen", company: "InnovateInc"` | Testimonial doanh nghiệp giả |
| ~49 | `name: "Emma Davis", company: "GlobalSoft"` | Testimonial doanh nghiệp giả |

### `course_fe/src/components/TrustedCompanies.tsx`
| Dòng | Giá trị giả | Vấn đề |
|------|-------------|--------|
| ~6 | `["Netflix","Volkswagen","Box","NetApp","Eventbrite"]` | Logo/tên "công ty tin dùng" — sao chép từ Udemy, app không có khách hàng này |

---

## 3. 🟠 URL mạng xã hội SAI / trỏ nhầm công ty

### `course_fe/src/components/Footer.tsx`
| Dòng | Giá trị | Vấn đề |
|------|---------|--------|
| ~78 | `"https://facebook.com/utc"` | URL không tồn tại / chưa xác thực |
| ~79 | `"https://twitter.com/utc"` | URL không tồn tại |
| ~80 | `"https://youtube.com/utc"` | URL không tồn tại |
| ~81 | `"https://linkedin.com/company/udemy"` | ❌ **Trỏ NHẦM sang công ty Udemy** — sai hoàn toàn |
| ~82 | `"https://instagram.com/utc"` | URL không tồn tại |

---

## 4. 🟠 Ảnh placeholder (Unsplash / Pravatar / /api/placeholder) hiển thị như nội dung thật

### Ảnh Unsplash hardcode (ảnh stock, không phải nội dung app)
| File | Dòng | Mô tả |
|------|------|-------|
| `course_fe/src/components/HeroSection.tsx` | ~134 | Ảnh "cộng đồng học online" stock |
| `course_fe/src/components/LearningGoals.tsx` | ~48 | Ảnh stock kèm tham số tracking figma |
| `course_fe/src/components/auth/AuthLayout.tsx` | ~22 | Ảnh nền stock trang auth |
| `course_fe/src/pages/public/TeachOnUtcPage.tsx` | ~59,66,73,130 | Ảnh avatar giảng viên giả + ảnh hero |
| `course_fe/src/pages/public/UtcBusinessPage.tsx` | ~77,84,91,98,161,243 | Ảnh khóa học/team/dashboard stock |
| `course_fe/src/pages/user/MyLearningPage.tsx` | ~354,439,494 | Fallback thumbnail khóa học = ảnh stock cố định |
| `course_fe/src/pages/user/WishlistPage.tsx` | ~279 | Fallback thumbnail = ảnh stock |
| `course_fe/src/pages/user/TransactionHistoryPage.tsx` | ~554 | Fallback thumbnail = ảnh stock |

### Avatar Pravatar giả (trong locale — đi kèm testimonial bịa)
| File | Dòng | Mô tả |
|------|------|-------|
| `course_fe/src/locales/en.ts` | ~1147,1156,1165,1174,1183,1192 | 6 avatar `i.pravatar.cc` giả cho testimonial |
| `course_fe/src/locales/vi.ts` | ~1147,1156,1165,1174,1183,1192 | 6 avatar giả (trùng bản EN) |

### URL `/api/placeholder/...` (endpoint không tồn tại → ảnh vỡ)
| File | Dòng | Mô tả |
|------|------|-------|
| `course_fe/src/pages/instructor/InstructorProfilePage.tsx` | ~151,166 | `/api/placeholder/300/200`, `/api/placeholder/40/40` |
| `course_fe/src/pages/public/BlogPage.tsx` | ~103,126 | `/api/placeholder/40/40`, `/api/placeholder/32/32` |
| `course_fe/src/pages/public/BlogPostDetailPage.tsx` | ~141 | `/api/placeholder/60/60` |

### Video demo hardcode 1 tài khoản Cloudinary cụ thể
| File | Dòng | Mô tả |
|------|------|-------|
| `course_fe/src/components/PreviewDemo.tsx` | ~25 | `https://res.cloudinary.com/dqzopvk2t/.../course_sample_lesson.mp4` — video mẫu cứng |

---

## 5. 🟠 Dữ liệu mock / test giả hiển thị như thật

### `course_fe/src/components/FloatingNavigation.tsx`
| Dòng | Giá trị | Vấn đề |
|------|---------|--------|
| ~161-164 | `john@example.com / Jane Smith / admin@example.com / multi@example.com` | Danh sách user test giả (quick-login dev) lọt vào UI |

### `course_fe/src/pages/instructor/InstructorLessonsPage.tsx`
| Dòng | Giá trị | Vấn đề |
|------|---------|--------|
| ~46-120 | Toàn bộ cấu trúc curriculum mock (sections/lessons giả) | Dữ liệu giả thay vì gọi API thật |

### `course_fe/src/pages/instructor/InstructorCreateCoursePage.tsx`
| Dòng | Giá trị | Vấn đề |
|------|---------|--------|
| ~344 | `placeholder="499000"` | Giá gợi ý cứng, dễ bị hiểu là giá mặc định |

---

## 6. 🟡 Note dev / mock message lọt ra UI người dùng

### `course_fe/src/pages/user/AiLearningPathPage.tsx`
| Dòng | Giá trị | Vấn đề |
|------|---------|--------|
| ~366 | `'Mock save thành công. Bước tiếp theo là nối vào bảng learning_paths và learning_path_items.'` | ❌ Message mock + note kỹ thuật hiển thị cho học viên |
| ~375 | `'Phase 1 cần màn hình quản trị metadata catalog. Với tài khoản học viên, điểm này nên mở read-only catalog health view.'` | ❌ Ghi chú thiết kế nội bộ lọt ra UI |
| ~133,140,157,308,309,349 | Các đoạn lộ trình/“AI response” viết cứng | Dữ liệu lộ trình demo cứng, không phải kết quả AI thật |

---

## 7. 🟠/🔴 Backend — dữ liệu giả & thông tin sai trong code (không phải seed)

### Email / URL giả trong template mail
| File | Dòng | Giá trị | Vấn đề |
|------|------|---------|--------|
| `course/utils/mailer/mailer.py` | ~56 | `"support@example.com"` | Email support giả trong PDF hóa đơn |
| `course/utils/mailer/mailer.py` | ~113 | `"support@example.com"` | Email support giả trong context hóa đơn |
| `course/utils/mailer/mailer.py` | ~150 | `"https://example.com/promo"` | URL khuyến mãi giả trong mail |
| `course/utils/mailer/mailer.py` | ~182 | `"support@mycourse.vn"` | Email support cứng dùng cho 8 template — nên lấy từ settings/env |

### Thông tin nhận diện / cấu hình lộ trong settings (đặt làm default)
| File | Dòng | Giá trị | Vấn đề |
|------|------|---------|--------|
| `course/config/settings.py` | ~124 | `"dukolc78@gmail.com"` | Gmail cá nhân làm default `EMAIL_HOST_USER` |
| `course/config/settings.py` | ~129 | `"http://localhost:3000"` | FRONTEND_URL default sai (FE chạy 5173) |
| `course/config/settings.py` | ~146 | `"https://course-1-zelz.onrender.com"` | URL deploy Render cụ thể nhúng cứng trong source |

> ⚠️ Trong `settings.py` còn nhiều **secret/key bị hardcode làm default** (Django SECRET_KEY, Cloudinary, VNPAY, MOMO, mật khẩu Gmail). Đây là vấn đề **bảo mật** chứ không hẳn “text sai”, nhưng cần xử lý gấp — xem mục dưới.

### Fake URL trong seed (ngoại lệ — chấp nhận được)
`course/config/curated_seed.py`, `course/seed_data.py`, `course/users/management/commands/seed_data.py` chứa `*.example.com`, ảnh CDN Udemy, tên `Nguyen Van A`… → **đây là seed data, được kỳ vọng là giả**, KHÔNG cần sửa (chỉ liệt kê để phân biệt với dữ liệu giả lọt vào code chạy thật).

---

## 8. 🔴 (Bảo mật — ghi nhận kèm) Secret/key bị hardcode

Không phải “text sai” nhưng phát hiện trong lúc quét, mức độ nghiêm trọng cao:

| File | Dòng | Loại |
|------|------|------|
| `course_fe/src/utils/judge0.ts` | ~9 | RapidAPI key lộ trong source FE: `ecec505edbmsh...` |
| `course/config/settings.py` | ~48 | Django `SECRET_KEY` default |
| `course/config/settings.py` | ~100-101 | Cloudinary API key + secret |
| `course/config/settings.py` | ~109 | VNPAY_HASH_SECRET_KEY |
| `course/config/settings.py` | ~125 | Mật khẩu app Gmail |
| `course/config/settings.py` | ~174,177 | MOMO_ACCESS_KEY / MOMO_SECRET_KEY |

➡️ Tất cả phải chuyển sang đọc từ `.env`, xóa giá trị default trong source.

---

---

# 🔁 PHẦN MỞ RỘNG (đợt quét 2)

Quét sâu thêm `features/`, `locales/`, các trang còn lại, template email backend và services. Dưới đây là phát hiện MỚI (không trùng phần trên).

## 9. 🔴 Thu nhập giảng viên BỊA trong testimonial (locale)

### `course_fe/src/locales/en.ts` & `vi.ts`
| Dòng (≈) | Giá trị bịa | Vấn đề |
|----------|-------------|--------|
| en ~4703 / vi ~4704 | `earnings: "$70,000+ earned"` / `"Kiếm được hơn $70.000"` (Paulo) | Thu nhập GV bịa đặt cùng tên GV Udemy thật |
| en ~4708 / vi ~4709 | `earnings: "$250,000+ earned"` (Angela) | Thu nhập bịa |
| en ~4714 / vi ~4715 | `earnings: "$500,000+ earned"` (Jose) | Thu nhập bịa |
| en ~1176 | `"...saw a 40% increase in engagement within 3 months!"` | Số liệu thành công bịa trong testimonial |

> 6 testimonial học viên (Sarah Johnson, Michael Chen, Emily Rodriguez, David Kim, Lisa Patel, James Wilson) tại `locales` dòng ~1142–1197 đều là **tên + nội dung + rating bịa**, kèm avatar `i.pravatar.cc` (đã nêu ở mục 4).

## 10. 🔴 "Course database" giả với số học viên/giảng viên bịa

### `course_fe/src/pages/public/TopicPage.tsx`
| Dòng (≈) | Giá trị bịa | Vấn đề |
|----------|-------------|--------|
| ~43-189 | Cả mảng khóa học hardcode | Tên GV giả + số học viên `650K+`, `420K+`, `780K+`, `1.2M+` | Toàn bộ "DB khóa học theo chủ đề" là giả, không gọi API |

### `course_fe/src/pages/public/EnhancedSearchPage.tsx`
| Dòng (≈) | Giá trị bịa | Vấn đề |
|----------|-------------|--------|
| ~71,90,109 | `"Jonas Schmedtmann"`, `"Maximilian Schwarzmüller"`, `"Jose Portilla"` | Tên GV Udemy thật bịa vào kết quả tìm kiếm |
| ~133-150 | `students: 892456 / 564123 / 423789`, `courses: 12/8/15` | Số liệu engagement bịa cho GV |

### `course_fe/src/pages/public/UtcBusinessPage.tsx`
| Dòng (≈) | Giá trị bịa | Vấn đề |
|----------|-------------|--------|
| ~273 | `reviews={15000}` | Số lượt đánh giá bịa cho khóa demo |

## 11. 🔴 Metric hệ thống & doanh thu BỊA ở trang Subscription

### `course_fe/src/pages/admin/AdminSubscriptionPage.tsx`
| Dòng (≈) | Giá trị bịa | Vấn đề |
|----------|-------------|--------|
| ~551 | `const TOTAL_SYSTEM_MINUTES = 250000` | Tổng phút học toàn hệ thống bịa → dùng tính chia doanh thu |
| ~825 | `formatCurrency(245000)` (ARPU) | ARPU bịa hiển thị trên dashboard admin |

### `course_fe/src/pages/instructor/InstructorSubscriptionRevenuePage.tsx`
| Dòng (≈) | Giá trị bịa | Vấn đề |
|----------|-------------|--------|
| ~59 | `const TOTAL_SYSTEM_MINUTES = 5000000` | Pool phút học bịa (lại còn KHÁC giá trị bên admin = 250000) → chia doanh thu GV sai |

> ⚠️ Hai giá trị `TOTAL_SYSTEM_MINUTES` ở admin (250.000) và instructor (5.000.000) **mâu thuẫn nhau** → cùng một phép chia doanh thu cho ra kết quả khác nhau giữa 2 màn hình.

## 12. 🟠 Placeholder URL `https://example.com` trong ô nhập

| File | Dòng (≈) | Vấn đề |
|------|----------|--------|
| `course_fe/src/components/ContentTab.tsx` | ~248 | `placeholder="https://example.com"` |
| `course_fe/src/components/ResourcesTab.tsx` | ~228 | `placeholder="https://example.com"` |

## 13. 🔴 Tên thương hiệu MÂU THUẪN giữa các nơi

Đây là lỗi "mô tả sai thông tin" rõ rệt: app dùng **3 tên thương hiệu khác nhau**.

| Nơi | Tên dùng | Nguồn |
|-----|----------|-------|
| Frontend (trang public) | **UTC** (`TeachOnUtcPage`, `UtcBusinessPage`, social `.../utc`) | code FE |
| Backend mailer | **MyCourse** (`_SITE_NAME = "MyCourse"`, `support@mycourse.vn`) | `course/utils/mailer/mailer.py` ~55,112,182-183 |
| Seed settings | **eduplatform.vn** (`support@eduplatform.vn`) | `curated_seed.py` ~1260, `seed_data.py` ~1080 |

➡️ Cần thống nhất 1 tên thương hiệu + 1 email support, lấy từ settings/site-branding.

## 14. 🟠/🔴 Backend — giá trị nghiệp vụ hardcode trong code chạy thật

### `course/utils/mailer/mailer.py` (bổ sung cho mục 7)
| Dòng (≈) | Giá trị | Vấn đề |
|----------|---------|--------|
| ~55,112 | `"MyCourse"` (lời cảm ơn / `site_name`) | Brand cứng trong PDF & context mail |
| ~182-183 | `_SUPPORT_EMAIL = "support@mycourse.vn"`, `_SITE_NAME = "MyCourse"` | Nên đọc từ settings, không hardcode |

### Template email (copyright/brand qua biến nhưng nguồn cứng)
| File | Dòng (≈) | Ghi chú |
|------|----------|---------|
| `course/utils/mailer/templates/promotion.html` | ~30 | `© {{ site_name }}` — site_name cứng từ mailer |
| `course/utils/mailer/templates/payment_invoice.html` | ~103 | `{{ support_email }}` — nhận `support@example.com` từ mailer.py:113 |
| `course/utils/mailer/templates/refund.html` | ~89 | `© {{ current_year }} {{ site_name }}. All rights reserved.` |

### `course/instructor_earnings/services.py` — commission fallback 30%
| Dòng (≈) | Giá trị | Vấn đề |
|----------|---------|--------|
| ~29-31 | `commission_rate = Decimal("30.00")` khi GV chưa có level | 🔴 Tỉ lệ ăn chia 30% hardcode → tính sai/hiểu lầm thu nhập GV |
| ~254-255 | `commission_rate = Decimal('30.00')` (subscription) | Lặp lại cùng vấn đề, nên đưa vào cấu hình |

### `course/subscription_plans/services.py` — trọng số gợi ý hardcode
| Dòng (≈) | Giá trị | Vấn đề |
|----------|---------|--------|
| ~546-548 | `rating*10.0 + total_students*0.1 + total_reviews*0.2` | Magic numbers trong thuật toán gợi ý, không có giải thích/cấu hình |

### `course/admins/import_services.py` — mẫu import
| Dòng (≈) | Giá trị | Vấn đề |
|----------|---------|--------|
| ~218,228,238 | `user@example.com`, ngày `2026-01-01` | Email/ngày mẫu trong file template import (chấp nhận được nếu chỉ là ví dụ, nhưng nên dùng giá trị rõ ràng là "ví dụ") |

## 15. 🔴 (Bảo mật) RapidAPI key lộ — bản sao thứ 2

| File | Dòng (≈) | Vấn đề |
|------|----------|--------|
| `course_fe/src/utils/judge0-mock.ts` | ~169 | `'X-RapidAPI-Key': 'ecec505edbmsh875f227dbb9bbeap1221c1jsn547ff02bf628'` | Cùng key đã lộ ở `judge0.ts` (mục 8) — lộ ở 2 file |

---

# 🔁 PHẦN MỞ RỘNG (đợt quét 3 — phủ 100% dự án)

Quét `src/mocks/`, `src/data/`, toàn bộ `locales` (9000+ dòng), `routes/`, `config/`, `index.html`, `.env`, và **toàn bộ ~45 app backend**. Phát hiện MỚI:

## 16. 🔴 Blog & comment GIẢ render thẳng ra production

### `course_fe/src/pages/public/BlogPostPage.tsx` (route `/blog/:slug`)
| Dòng (≈) | Giá trị bịa | Vấn đề |
|----------|-------------|--------|
| ~111-139 | Bài blog mock: `views: 12840, likes: 456, comments: 89`, tác giả `Jane Smith` | Bài viết + chỉ số bịa hiển thị như thật |
| ~141-240 | `mockComments` (Mike Johnson, Sarah Wilson, Alex Chen) | Toàn bộ comment giả render thẳng UI |
| ~119,148,179,206 | avatar `images.unsplash.com/...` | Avatar placeholder |

## 17. 🟠 Mock notifications / tasks / search-result render ra UI

| File | Dòng (≈) | Vấn đề |
|------|----------|--------|
| `course_fe/src/components/NotificationPopup.tsx` | ~61-66 | Thông báo mock với timestamp/nội dung giả |
| `course_fe/src/components/PendingTasks.tsx` | ~64-181 | Danh sách "việc cần làm" hardcode cho admin/instructor/user |
| `course_fe/src/pages/public/EnhancedSearchPage.tsx` | ~68-225 | Kết quả tìm kiếm giả: courses `students: 45230/23167/67890`, instructors `892456/564123/423789`, articles `views: 12450/8750/15230` |
| `course_fe/src/components/PreviewDemo.tsx` | ~16-48, ~50+ | `mockLesson`, `mockCourseModules` (ngữ cảnh demo — mức thấp hơn) |

> **Lưu ý phân loại:** `src/mocks/`, `src/features/home/hardcodedBackupSchema.ts` (`HARDCODED_BACKUP_HOME_SCHEMA`) là fallback/backup được thiết kế có chủ đích — chỉ là rủi ro nếu bị "Restore original UI"; còn các mock ở mục 16/17 đang **import & render thẳng** vào trang thật → đây mới là lỗi cần sửa.

## 18. 🔴 Số liệu & sample bịa nằm trong CHÍNH locale (ngoài testimonial)

### `course_fe/src/locales/en.ts` & `vi.ts` (giá trị copy giống nhau 2 file)
| Dòng (≈) | Key / Giá trị | Vấn đề |
|----------|---------------|--------|
| ~1077 | `hero.students_joined: "500K+ Students"` | Số học viên bịa ngay hero |
| ~1082 | `"Trusted by over 15,000 companies and millions of learners..."` | Quy mô bịa |
| ~7675 | `"Trusted by 15,000+ companies worldwide"` | Lặp lại quy mô bịa (B2B) |
| ~8360 | `instructor_landing.students: "1M+ Students"` | Số học viên bịa |
| ~8099 | `instructor_landing.instructor: "Jonas Schmedtmann"` | Tên GV Udemy thật trong locale |
| ~452 | `notifications.new_review_message: "John Doe left a 5-star review..."` | Mẫu thông báo bịa |
| ~1324 | `onboarding.default_name: "John Doe"` | Tên mặc định bịa |
| ~2893-2897 | `audit_log.audit_sample_*`: "Jane Smith", "John Doe", "Mike Johnson" | Log kiểm toán mẫu bịa |
| ~142,143,145,196,486 | nav/title gắn nhãn `"(Demo)"`: "Pro checkout (Demo)", "Course player (Demo)", "Quiz (Demo)"... | Tính năng thật bị gắn nhãn Demo → giảm độ tin cậy |
| ~2346,5645,5772 | `support@example.com`, `student@example.com`, `john@example.com` | Email mẫu (placeholder ô nhập — mức thấp) |

## 19. 🔴 TÊN THƯƠNG HIỆU loạn — có tới 5 tên khác nhau

Cập nhật mục 13: thực tế dự án dùng **5 brand khác nhau** ở 5 nơi.

| Nơi | Tên | File |
|-----|-----|------|
| Trang public FE | **UTC** | `TeachOnUtcPage`, `UtcBusinessPage`, social `.../utc` |
| Tiêu đề trình duyệt | **"Course Online Platform"** | `course_fe/index.html` ~7 |
| Fallback site branding | **"EduCourse"** | `course_fe/src/hooks/useSiteBranding.ts` ~6 |
| Mailer backend | **MyCourse** (`support@mycourse.vn`) | `course/utils/mailer/mailer.py` |
| Seed settings | **eduplatform.vn** | `curated_seed.py`, `seed_data.py` |

➡️ Phải chốt 1 brand duy nhất + 1 email/logo, đọc từ `systems_settings`.

## 20. 🔴 Backend — giá trị nghiệp vụ & nội dung giả (đợt 3)

### Nguồn gốc của commission 30% & passing-score 70
| File | Dòng (≈) | Giá trị | Vấn đề |
|------|----------|---------|--------|
| `course/instructor_levels/models.py` | ~10,12 | `commission_rate` & `plan_commission_rate` default `Decimal('30.00')` | 🔴 **Nguồn gốc** mức 30% ở mục 14 — rate tài chính lõi không nên có default |
| `course/quiz_questions/services.py` | ~145,203 | `'passing_score': 70` | Điểm đạt 70 hardcode (không cấu hình theo quiz) |
| `course/quiz_questions/services.py` | ~143 | `lesson.description or "Test your knowledge"` | Mô tả placeholder trả cho user |
| `course/quiz_questions/serializers.py` | ~164 | `obj.get('passing_score', 70)` | Lặp lại 70 |
| `course/quiz_results/services.py` | ~45,321,483 | `passing_score = 70` (3 nơi) | Lặp lại 70 → chấm đạt/rớt theo số cứng |

### Nội dung/giá trị placeholder trả ra cho user
| File | Dòng (≈) | Giá trị | Vấn đề |
|------|----------|---------|--------|
| `course/lesson_attachments/views.py` | ~62-68 | PDF sinh ra chứa `'This PDF is generated for seeded demo data.'` | 🔴 Text "seed demo" lọt vào file tải về của user thật |
| `course/certificates/services.py` | ~143 | `"CERTIFICATE OF COMPLETION"` cứng (chỉ EN) | Tiêu đề chứng chỉ cứng, không theo brand/ngôn ngữ |
| `course/learning_paths/services.py` | ~211 | fallback `'Khóa học này được chọn vì phù hợp với mục tiêu hiện tại.'` | "Lý do AI" giả khi Gemini fail → đánh lừa là AI sinh |
| `course/courses/models.py` | ~56 | `language` default `'Tiếng Việt'` | Ngôn ngữ khóa học mặc định cứng |

### Nghiệp vụ thanh toán hardcode
| File | Dòng (≈) | Giá trị | Vấn đề |
|------|----------|---------|--------|
| `course/payments/vnpay_services.py` | ~468 | `"vnp_IpAddr": "127.0.0.1"` | 🔴 Gửi IP localhost cho VNPay trong refund → sai log/chống gian lận |
| `course/payments/refund_services.py` | ~21 | `REFUND_PROGRESS_LIMIT = 50` | Ngưỡng hoàn tiền 50% cứng, nên cấu hình |
| `course/payments/views.py` | ~558 | `enrollment.progress > 50` | Lặp lại ngưỡng 50% trong view |

### Settings — định danh dịch vụ cứng (bổ sung mục 8)
| File | Dòng (≈) | Giá trị | Vấn đề |
|------|----------|---------|--------|
| `course/config/settings.py` | ~99 | `CLOUDINARY_CLOUD_NAME` default `"dqzopvk2t"` | Tài khoản Cloudinary thật làm default |
| `course/config/settings.py` | ~118 | `VNPAY_TMN_CODE` default `"BDF9QK1Y"` | Mã merchant thật |
| `course/config/settings.py` | ~172,190,191 | `MOMO_PARTNER_CODE="MOMO"`, `MOMO_STORE_ID="MoMoTestStore"`, `MOMO_PARTNER_NAME="Course Platform Test"` | Thông tin merchant TEST làm default |
| `course_fe/src/config/googleOAuth.ts` | ~10 | Google OAuth client ID `769246063466-...apps.googleusercontent.com` | Client ID thật hardcode fallback ở FE |
| `course_fe/.env` | ~2 | `VITE_API_BASE_URL=https://...ngrok-free.dev/api` | URL ngrok tạm commit vào repo |

## 21. ✅ Bản đồ phủ — các vùng đã quét SẠCH (không có dữ liệu giả)

Backend (chỉ còn default constant hợp lệ / message lỗi, KHÔNG phải dữ liệu giả):
`coursemodules`, `lessons`, `lesson_comments`, `categories`, `transcripts`, `knowledge`, `learning_progress`, `search`, `payment_methods`, `payment_details`, `carts`, `promotions`, `wishlists`, `enrollments`, `instructor_payouts`, `reviews`, `questions`, `answers`, `qa_votes`, `blog_posts`, `blog_comments`, `reports`, `supports`, `support_replies`, `users`, `instructors`, `applications`, `registration_forms`, `activity_logs`, `systems_settings` (đọc đúng từ DB), `realtime`.

Frontend: `src/mocks/` + `hardcodedBackupSchema.ts` là fallback có chủ đích (không render trực tiếp); shadcn `ui/` primitives sạch.

> Như vậy toàn bộ ~45 app backend + toàn bộ `src/` frontend đã được rà soát → **đạt 100% phạm vi dự án**.

---

# 🔁 PHẦN MỞ RỘNG (đợt quét 4 — đóng các vùng rìa)

Quét nốt `course/utils/` (trừ mailer), `course/admins/` còn lại, `course/config/` còn lại, script chẩn đoán/seed, `render.yaml`, `.env.example`, build config FE.

## 22. 🟠 Phát hiện mới ở vùng rìa

| File | Dòng (≈) | Giá trị | Vấn đề |
|------|----------|---------|--------|
| `course_fe/src/components/VideoPlayer.tsx` | ~63 | `url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'` | 🟠 Default video là **rickroll** (`dQw4w9WgXcQ`) — phát video troll khi thiếu URL |
| `course_fe/package.json` | ~2 | `"name": "UTC Website"` | Tên dự án thứ **6** — bổ sung vào danh sách brand loạn (mục 19) |
| `course/.env.example` | ~ | `FRONTEND_URL=http://localhost:3000` | Mẫu env trỏ cổng 3000 trong khi FE chạy 5173 (lệch, nhưng là file mẫu — mức thấp) |

> Cập nhật mục 19: thực tế là **6 tên thương hiệu** — UTC / "Course Online Platform" (title) / "UTC Website" (package.json) / EduCourse / MyCourse / eduplatform.vn.

## 23. ✅ Các vùng rìa đã quét — SẠCH

- **Backend sạch:** `utils/email.py`, `export_helpers.py`, `admin_actors.py`, `course_access.py`, `decorators.py`, `permissions.py`, `roles.py`, `input_validators.py`, `pagination.py`, `jwt_auth_middleware.py`, `exception_handler.py`, `list_params.py`, `utils/upload/*`; `admins/models.py`·`serializers.py`·`services.py`·`urls.py`; `config/admin.py`·`cloudinary_config.py`·`seed_view.py`·`urls.py`; script `diag_*`·`run_seed`·`seed_instructor_form` (chỉ chứa id/sample dev — chấp nhận được).
- **`render.yaml` sạch:** dùng `generateValue`/`sync:false`, không nhúng secret/URL cứng.
- **FE build config sạch:** `vite.config.ts`, `public/_redirects` không có secret/URL sai.

## 24. ⏭️ Cố ý KHÔNG quét (không phải data ứng dụng)

`dbml_grouped/*.dbml` (schema doc), `AGENTS.md`, `Business_Rules.md`, `CLASS_DIAGRAM_INFO.md`, `CLAUDE.md`, `plan qh.md` (tài liệu), test files (`*.test.tsx`, `tests.py` — mock test là bình thường), `staticfiles/` (file build), `__pycache__`, migrations.

> ✅ Đến đây **toàn bộ code ứng dụng + config + vùng rìa đã được rà soát**. Chỉ còn lại tài liệu/test/build-artifact cố ý bỏ qua.

---

## Tổng kết & ưu tiên xử lý

| Ưu tiên | Hạng mục | Hướng xử lý |
|---------|----------|-------------|
| 1 🔴 | Số liệu bịa public (mục 1, 10, 11, 18) | Lấy thật từ `getPublicStats()` / API thống kê; nếu chưa có thì ẩn block số liệu |
| 2 🔴 | Tên/công ty/testimonial/blog/comment giả + earnings bịa (mục 2, 9, 16) | Xóa hoặc thay bằng dữ liệu thật từ DB |
| 3 🔴 | Giá trị tài chính cứng: commission 30% (`instructor_levels/models.py`), `TOTAL_SYSTEM_MINUTES` mâu thuẫn, refund 50%, passing_score 70 (mục 11, 14, 20) | Đưa về `systems_settings`/DB; tính từ dữ liệu thật |
| 4 🔴 | Tên thương hiệu loạn — 5 tên khác nhau (mục 19) | Thống nhất 1 brand + 1 email/logo, đọc từ `systems_settings` |
| 5 🔴 | Secret/credential hardcode (mục 8, 15, 20): RapidAPI×2, Cloudinary, VNPAY, MOMO, Google OAuth, ngrok .env | Đưa về `.env`, **revoke** các key đã lộ |
| 6 🔴 | Nội dung giả trả cho user: PDF "seed demo", lý do AI giả (mục 20) | Sửa generator PDF; ẩn/đánh dấu rõ khi AI fallback |
| 7 🟠 | URL MXH sai, đặc biệt LinkedIn trỏ Udemy (mục 3) | Sửa đúng / lấy từ cấu hình site branding |
| 8 🟠 | Ảnh & video placeholder (mục 4) | Dùng ảnh thật từ API; fallback bằng asset nội bộ |
| 9 🟠 | Mock notifications/tasks/search + note dev lọt UI (mục 5, 6, 17) | Thay bằng gọi API; xóa note dev/mock message |
| 10 🟠 | Email/URL giả + brand trong mail/cert (mục 7, 14, 20) | Chuyển `support@...`, FRONTEND_URL, site_name, tiêu đề chứng chỉ sang settings/env |

**Lưu ý vị trí dòng:** số dòng là gần đúng tại thời điểm quét; nên dùng search theo chuỗi literal (vd `"73M"`, `"linkedin.com/company/udemy"`, `support@example.com`) để định vị chính xác trước khi sửa.
