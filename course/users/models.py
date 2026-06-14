from django.db import models


class User(models.Model):
    class StatusChoices(models.TextChoices):
        ACTIVE = 'active', 'active'
        INACTIVE = 'inactive', 'inactive'
        BANNED = 'banned', 'banned'

    class UserTypeChoices(models.TextChoices):
        STUDENT = 'student', 'student'
        INSTRUCTOR = 'instructor', 'instructor'
        ADMIN = 'admin', 'admin'

    id = models.AutoField(primary_key=True)

    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    pending_email = models.EmailField(max_length=255, null=True, blank=True)
    password_hash = models.CharField(max_length=255)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.CharField(max_length=255, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_users')
    is_deleted = models.BooleanField(default=False)
    last_login = models.DateTimeField(blank=True, null=True)

    status = models.CharField(
        max_length=8,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE
    )

    class Meta:
        db_table = 'Users'
        ordering = ['-created_at']



    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def user_type(self):
        """Derived role (admin > instructor > student) from related role records.

        The legacy ``user_type`` column was dropped in migration 0008; roles are
        now canonical on the Admin/Instructor records. This property keeps the
        many read-only ``user.user_type`` call sites working.
        """
        admin = getattr(self, 'admin', None)
        if admin and not admin.is_deleted:
            return self.UserTypeChoices.ADMIN
        instructor = getattr(self, 'instructor', None)
        if instructor and not instructor.is_deleted:
            return self.UserTypeChoices.INSTRUCTOR
        return self.UserTypeChoices.STUDENT

    def __str__(self):
        return f"{self.username} (User_id = {self.id})"



def generate_refresh_jti():
    import uuid
    return str(uuid.uuid4())

class RefreshToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    jti = models.CharField(max_length=36, unique=True, default=generate_refresh_jti)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    replaced_by = models.OneToOneField('self', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'RefreshTokens'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['jti']), models.Index(fields=['user'])]

    def is_active(self):
        from django.utils import timezone
        return (self.revoked_at is None) and (timezone.now() < self.expires_at)

    def revoke(self):
        from django.utils import timezone
        if self.revoked_at is None:
            self.revoked_at = timezone.now()
            self.save(update_fields=['revoked_at'])


class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    account_preferences = models.JSONField(default=dict, blank=True)
    notification_preferences = models.JSONField(default=dict, blank=True)
    privacy_preferences = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'UserSettings'
        ordering = ['-created_at']

    def __str__(self):
        return f"Settings(user={self.user_id})"
