# 🔍 FIELD NAMING INCONSISTENCY AUDIT REPORT

## 📋 Vấn đề tìm thấy

### 1. **User Model - String Representation**
**File:** `users/models.py` line 48
```python
return f"{self.username} ({self.user_type} - User_id = {self.user_id})"
# ❌ self.user_id không tồn tại (model dùng `id`)
```
**Fix:** Thay `self.user_id` → `self.id`

---

### 2. **WebSocket Consumer**
**File:** `realtime/consumers.py` line 11
```python
self.group_name = f"user_{user.user_id}"
# ❌ self.user_id không tồn tại
```
**Fix:** Thay `user.user_id` → `user.id`

---

### 3. **QnA Model - Field Naming & String**
**File:** `qnas/models.py` 
```python
# Line 17: Field name sai convention
user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='qna_user', db_column='user_id')
# ❌ Tên field là `user` nhưng db_column là `user_id` → confusing

# Line 31: __str__ dùng wrong field
return f"QnA #{self.id}: Student {self.user_id}"
# ❌ Không phải `.user_id` mà `.user.id` hoặc chỉ `.user`
```
**Fix:**
- Field definition giữ nguyên (Django tự handle db_column)
- Sửa __str__: `self.user_id` → `self.user.id`

---

### 4. **QnA Answers Model - String**
**File:** `qna_answers/models.py` line 22
```python
return f"Answer {self.id}: QnA {self.id}: User {self.user_id}"
# ❌ self.user_id không có, phải là self.user.id
```
**Fix:** Thay `self.user_id` → `self.user.id`

---

### 5. **Admin Services - Field Naming**
**File:** `admins/services.py` line 63
```python
entity_id=admin.admin_id,  # ❌ admin_id không tồn tại
```
**Fix:** Thay `admin.admin_id` → `admin.id`
**(Đã sửa)**

---

### 6. **Payment Services - Nested Field Access**
**File:** `payments/vnpay_services.py` lines 169, 275, 284
```python
payment.course_id.title, payment.user_id.full_name
# ❌ Sai naming: user_id là FK field nhưng access như là object
```
**Fix:**
- `payment.user_id` → `payment.user` (name của field FK)
- `payment.course_id` → `payment.course` (name của field FK)

---

### 7. **Payment Services - Check admin**
**File:** `payments/services.py` line 103
```python
if not promotion.admin_id:
# ❌ admin_id không tồn tại (là FK field `admin`)
```
**Fix:** Thay `promotion.admin_id` → `promotion.admin`

---

### 8. **Payment Model - Field Naming**
**File:** `payments/models.py` line 18
```python
user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_user_id')
# ⚠️ Đúng (field là `user`), nhưng related_name dùng `_id` suffix (inconsistent naming convention)
```
**Fix:** Thay `related_name='payment_user_id'` → `related_name='payments'`

---

### 9. **Payment Details Model - Field Naming**
**File:** `payment_details/models.py` lines 13, 14, 18
```python
payment_id = models.ForeignKey(Payment, ...)  # ❌ Naming convention sai
course_id = models.ForeignKey(Course, ...)    # ❌ Naming convention sai
promotion_id = models.ForeignKey(Promotion, ...) # ❌ Naming convention sai
```
**Fix:**
- `payment_id` → `payment`
- `course_id` → `course`
- `promotion_id` → `promotion`

---

### 10. **Lesson Comments Model - Field Naming**
**File:** `lesson_comments/models.py` lines 5, 6, 7
```python
comment_id = models.AutoField(primary_key=True)  # ❌ Phải dùng `id` mặc định
user_id = models.ForeignKey(User, ...)           # ❌ Sai naming
lesson_id = models.ForeignKey(Lesson, ...)       # ❌ Sai naming
```
**Fix:**
- `comment_id` → `id` (mặc định primary key)
- `user_id` → `user`
- `lesson_id` → `lesson`

---

### 11. **Forum Topics Model - Field Naming & String**
**File:** `forum_topics/models.py` 
```python
# Line 10: Field name sai
user = models.ForeignKey('users.User', ..., db_column='user_id')
# ❌ Tương tự QnA - tên field OK nhưng db_column confusing

# Line 29: __str__ dùng wrong field
return f"Topic {self.id}: {self.title} by {self.user_id}"
# ❌ self.user_id không tồn tại
```
**Fix:** `self.user_id` → `self.user.id`

---

### 12. **Instructors Model - String**
**File:** `instructors/models.py` line 32
```python
return f"Instructor {self.instructor_id} - {self.user_id.full_name} ..."
# ❌ instructor_id không tồn tại (là `id`), user_id không tồn tại (là `user`)
```
**Fix:** 
- `self.instructor_id` → `self.id`
- `self.user_id` → `self.user`

---

### 13. **Forum Comments Model - String**
**File:** `forum_comments/models.py` line 29
```python
return f"Comment {self.id} on Topic {self.id} by User {self.user_id}"
# ❌ self.user_id không tồn tại
```
**Fix:** `self.user_id` → `self.user.id` (hoặc `self.user`)

---

### 14. **Forums Model - String**
**File:** `forums/models.py` line 28
```python
return f"{self.title} (ID: {self.id}) - {self.user_id})"
# ❌ self.user_id không tồn tại
```
**Fix:** `self.user_id` → `self.user.id` (hoặc `self.user`)

---

### 15. **Carts Model - String**
**File:** `carts/models.py` line 29
```python
return f"Cart {self.id}: User {self.user_id}, Course {self.course_id}"
# ❌ user_id và course_id không tồn tại (fields là `user` và `course`)
```
**Fix:**
- `self.user_id` → `self.user`
- `self.course_id` → `self.course`

---

### 16. **Activity Logs Model - Field Naming & String**
**File:** `activity_logs/models.py`
```python
# Line 17: Sai naming convention
log_id = models.AutoField(primary_key=True)
# ❌ Phải dùng `id` mặc định

# Line 18: Sai naming
user_id = models.ForeignKey(User, ...)
# ❌ Phải là `user`

# Line 37: __str__ dùng wrong field
return f"ActivityLog {self.log_id} by User {self.user_id} ..."
# ❌ Cả hai sai
```
**Fix:**
- `log_id` → `id` (mặc định)
- `user_id` → `user`
- `self.log_id` → `self.id`
- `self.user_id` → `self.user.id`

---

## 📊 SUMMARY - Lỗi theo loại

| Loại Lỗi | Số lượng | Độ ưu tiên |
|----------|---------|-----------|
| __str__ method dùng sai field | 8 | 🔴 High |
| Model field naming không tuân thủ | 5 | 🔴 High |
| Nested FK access sai | 2 | 🟡 Medium |
| related_name inconsistent | 1 | 🟡 Medium |

---

## ✅ Chuẩn để theo

### 1. **Primary Key**
✓ Luôn dùng `id` (auto field)
```python
# ✓ Đúng
class MyModel(models.Model):
    id = models.AutoField(primary_key=True)  # hoặc bỏ qua (Django tự tạo)

# ❌ Sai
class MyModel(models.Model):
    my_model_id = models.AutoField(primary_key=True)
```

### 2. **Foreign Key Field Names**
✓ Đặt tên mà không có `_id` suffix
```python
# ✓ Đúng
user = models.ForeignKey(User, ...)
course = models.ForeignKey(Course, ...)

# ❌ Sai
user_id = models.ForeignKey(User, ...)
course_id = models.ForeignKey(Course, ...)
```

### 3. **Accessing FK Values**
✓ Dùng field name để access object hoặc ID
```python
# ✓ Đúng
self.user           # returns User object
self.user.id        # returns user ID
self.user.full_name # returns name attribute

# ❌ Sai
self.user_id        # ❌ thường không tồn tại (ngoại trừ db_column)
self.user_id.full_name  # ❌ tồn tại nhưng confusing
```

### 4. **Django Naming Convention**
```python
# Format: field_name (không có _id suffix)
# Access ID: field_name.id hoặc field_name_id (Django auto-created)
# Access Object: field_name

class Post(models.Model):
    author = models.ForeignKey(User, ...)  # ✓ Field name
    
post.author         # User object
post.author.id      # User ID (hoặc post.author_id)
post.author.name    # User name
```

---

## 🔧 Action Plan

### Priority 1 (Critical - Model Consistency)
- [ ] Fix `activity_logs/models.py` - `log_id` → `id`, `user_id` → `user`
- [ ] Fix `lesson_comments/models.py` - `comment_id`, `user_id`, `lesson_id` naming
- [ ] Fix `payment_details/models.py` - `payment_id`, `course_id`, `promotion_id` naming

### Priority 2 (High - __str__ Methods)
- [ ] users/models.py - Line 48
- [ ] qnas/models.py - Line 31
- [ ] qna_answers/models.py - Line 22
- [ ] forum_topics/models.py - Line 29
- [ ] instructors/models.py - Line 32
- [ ] forum_comments/models.py - Line 29
- [ ] forums/models.py - Line 28
- [ ] carts/models.py - Line 29

### Priority 3 (High - Code Access)
- [ ] realtime/consumers.py - `user.user_id` → `user.id`
- [ ] payments/vnpay_services.py - `payment.user_id` → `payment.user`, etc.
- [ ] payments/services.py - `promotion.admin_id` → `promotion.admin`

### Priority 4 (Medium - Code Standards)
- [ ] payments/models.py - `related_name='payment_user_id'` → `related_name='payments'`

---

## ⚠️ Notes
- Thay đổi model field names cần migration
- __str__ methods chỉ là string representation, không ảnh hưởng logic
- Django auto-tạo `_id` versioning của FK (e.g., `post.author_id`)
