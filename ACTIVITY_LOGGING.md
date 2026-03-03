# Activity Logging - Tóm tắt các chức năng đã thêm log

## 📊 Tổng quan
Hệ thống đã tích hợp activity logging cho các chức năng quan trọng nhằm:
- Theo dõi hành vi người dùng
- Audit trail cho bảo mật
- Phân tích và troubleshooting
- Compliance và báo cáo

## ✅ Các chức năng đã có logging

### 👤 **User Management** (users/services.py)

1. **REGISTER** - Đăng ký tài khoản
   - Action: `REGISTER`
   - Trigger: Khi người dùng đăng ký thành công
   - Thông tin: User ID, email

2. **LOGIN** - Đăng nhập
   - Action: `LOGIN`
   - Trigger: Đăng nhập thành công
   - Thông tin: User ID, thời gian đăng nhập

3. **PROFILE_UPDATED** - Cập nhật thông tin cá nhân
   - Action: `PROFILE_UPDATED`
   - Trigger: User tự cập nhật profile
   - Thông tin: User ID đã thay đổi gì

4. **PASSWORD_CHANGED** - Đặt lại mật khẩu
   - Action: `PASSWORD_CHANGED`
   - Trigger: Reset password thành công
   - Thông tin: User ID

5. **EMAIL_VERIFIED** - Xác minh email
   - Action: `EMAIL_VERIFIED`
   - Trigger: Khi user confirm email thành công
   - Thông tin: User ID, email

6. **DELETE_USER** - Xóa tài khoản
   - Action: `DELETE_USER`
   - Trigger: Admin xóa user
   - Thông tin: Admin ID, User bị xóa

7. **USER_BANNED** - Khóa tài khoản
   - Action: `USER_BANNED`
   - Trigger: Admin ban user
   - Thông tin: Admin ID, User bị ban, lý do

8. **USER_UNBANNED** - Mở khóa tài khoản
   - Action: `USER_UNBANNED`
   - Trigger: Admin unban user
   - Thông tin: Admin ID, User được unban

---

### 📚 **Course Management** (courses/services.py)

9. **CREATE** (Course) - Tạo khóa học
   - Action: `CREATE`
   - Entity: `Course`
   - Trigger: Instructor tạo khóa học mới
   - Thông tin: Course ID, title, instructor

10. **UPDATE** (Course) - Cập nhật khóa học
    - Action: `UPDATE`
    - Entity: `Course`
    - Trigger: Instructor sửa thông tin khóa học
    - Thông tin: Course ID, những field thay đổi

11. **DELETE** (Course) - Xóa khóa học
    - Action: `DELETE`
    - Entity: `Course`
    - Trigger: Instructor/Admin xóa khóa học
    - Thông tin: Course ID, title

---

### 🎓 **Enrollment** (enrollments/services.py)

12. **ENROLL** - Đăng ký học
    - Action: `ENROLL`
    - Entity: `Enrollment`
    - Trigger: User đăng ký khóa học
    - Thông tin: User ID, Course ID, Enrollment ID

---

### 💳 **Payment** (payments/services.py, vnpay_services.py)

13. **PAYMENT_INITIATED** - Khởi tạo thanh toán
    - Action: `PAYMENT_INITIATED`
    - Entity: `Payment`
    - Trigger: User tạo payment record
    - Thông tin: Payment ID, method, amount

14. **PAYMENT_SUCCESS** - Thanh toán thành công
    - Action: `PAYMENT_SUCCESS`
    - Entity: `Payment`
    - Trigger: VNPay IPN confirm success
    - Thông tin: Payment ID, transaction ID, amount

15. **PAYMENT_FAILED** (Cần thêm)
    - Action: `PAYMENT_FAILED`
    - Entity: `Payment`
    - Trigger: Thanh toán thất bại
    - Thông tin: Payment ID, error code

---

## 🔧 Cách sử dụng

### Import function:
```python
from activity_logs.services import log_activity
```

### Cú pháp:
```python
log_activity(
    user_id=user.id,           # ID người thực hiện (optional)
    action="ACTION_NAME",      # Tên action (required)
    entity_type="EntityName",  # Loại entity (optional)
    entity_id=entity.id,       # ID entity (optional)
    description="Mô tả chi tiết",  # Mô tả (optional)
    request=request            # Request object nếu có (optional)
)
```

### Ví dụ:
```python
# User đăng ký khóa học
log_activity(
    user_id=request.user.id,
    action="ENROLL",
    entity_type="Enrollment",
    entity_id=enrollment.id,
    description=f"Đăng ký khóa học: {course.title}"
)
```

---

## 📋 Danh sách Actions hiện có

Từ `activity_logs/models.py`:

```
LOGIN, LOGOUT, FAILED_LOGIN
REGISTER, EMAIL_VERIFIED, PASSWORD_CHANGED, PROFILE_UPDATED
CREATE, UPDATE, DELETE
PAYMENT_INITIATED, PAYMENT_SUCCESS, PAYMENT_FAILED
REFUND_REQUESTED, REFUND_APPROVED, REFUND_REJECTED
ENROLL, VIEW_LESSON
COMMENT, REPLY, LIKE_COMMENT, DISLIKE_COMMENT, REPORT_COMMENT
COURSE_APPROVED, COURSE_REJECTED
USER_BANNED, USER_UNBANNED
EMAIL_SENT, SYSTEM_CONFIGURED
OTHER
```

---

## 🔜 Chức năng cần bổ sung logging

### Ưu tiên cao:
- [ ] **PAYMENT_FAILED** - Thanh toán thất bại
- [ ] **REFUND_REQUESTED** - Yêu cầu hoàn tiền (refund_services.py)
- [ ] **REFUND_APPROVED** - Duyệt hoàn tiền
- [ ] **REFUND_REJECTED** - Từ chối hoàn tiền
- [ ] **COURSE_APPROVED** - Admin duyệt khóa học
- [ ] **COURSE_REJECTED** - Admin từ chối khóa học
- [ ] **LOGOUT** - Đăng xuất
- [ ] **FAILED_LOGIN** - Đăng nhập thất bại

### Ưu tiên trung bình:
- [ ] **VIEW_LESSON** - Xem bài học (learning_progress)
- [ ] **COMMENT** - Bình luận (lesson_comments, forum_comments)
- [ ] **REPLY** - Trả lời bình luận
- [ ] **LIKE_COMMENT** / **DISLIKE_COMMENT**
- [ ] **REPORT_COMMENT** - Báo cáo vi phạm

### Ưu tiên thấp:
- [ ] **EMAIL_SENT** - Gửi email thành công
- [ ] **SYSTEM_CONFIGURED** - Thay đổi cấu hình hệ thống

---

## 📊 Truy vấn logs

### Xem logs của một user:
```python
from activity_logs.models import ActivityLog

logs = ActivityLog.objects.filter(user=user_id).order_by('-created_at')
```

### Xem logs theo action:
```python
login_logs = ActivityLog.objects.filter(action='LOGIN')
```

### Xem logs theo entity:
```python
course_logs = ActivityLog.objects.filter(
    entity_type='Course',
    entity_id=course_id
)
```

### Logs trong khoảng thời gian:
```python
from django.utils import timezone
from datetime import timedelta

last_7_days = timezone.now() - timedelta(days=7)
recent_logs = ActivityLog.objects.filter(created_at__gte=last_7_days)
```

---

## 🔐 Bảo mật

- Logs **không lưu mật khẩu** hoặc token
- IP address và User Agent được lưu tự động
- Logs có index trên `user`, `action`, `entity_type`, `created_at` để truy vấn nhanh
- Hỗ trợ soft delete với `deleted_at`, `deleted_by`

---

## 📈 Thống kê hiện tại

- ✅ **15/25 chức năng** đã có logging (60%)
- 🔧 **10 chức năng** còn thiếu
- 📁 **5 files** đã được cập nhật

---

**Last Updated:** February 4, 2026
