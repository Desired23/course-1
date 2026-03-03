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

    user_type = models.CharField(
        max_length=10,
        choices=UserTypeChoices.choices
    )

    class Meta:
        db_table = 'Users'

    # Django expects is_authenticated on request.user (AuthenticationMiddleware).
    # Our User inherits models.Model, not AbstractBaseUser, so we add it manually.
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.username} ({self.user_type} - User_id = {self.id})"
