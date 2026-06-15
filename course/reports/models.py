from django.db import models
from users.models import User


class Report(models.Model):
    class TargetType(models.TextChoices):
        REVIEW = 'review', 'review'
        QUESTION = 'question', 'question'
        ANSWER = 'answer', 'answer'
        BLOG_POST = 'blog_post', 'blog_post'
        BLOG_COMMENT = 'blog_comment', 'blog_comment'
        LESSON_COMMENT = 'lesson_comment', 'lesson_comment'
        LESSON = 'lesson', 'lesson'
        COURSE = 'course', 'course'
        MESSAGE = 'message', 'message'

    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam'
        OFFENSIVE = 'offensive', 'Nội dung phản cảm'
        HARASSMENT = 'harassment', 'Quấy rối / bắt nạt'
        COPYRIGHT = 'copyright', 'Vi phạm bản quyền'
        MISINFORMATION = 'misinformation', 'Thông tin sai lệch'
        OTHER = 'other', 'Khác'

    class Status(models.TextChoices):
        PENDING = 'pending', 'pending'
        REVIEWING = 'reviewing', 'reviewing'
        RESOLVED = 'resolved', 'resolved'
        DISMISSED = 'dismissed', 'dismissed'

    reporter = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reports_made'
    )
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.IntegerField()
    reason = models.CharField(max_length=20, choices=Reason.choices, default=Reason.OTHER)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    attachments = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    resolved_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reports_resolved'
    )
    action_taken = models.CharField(max_length=20, blank=True)
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'Reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_type', 'target_id', 'status']),
            models.Index(fields=['reporter', 'target_type', 'target_id']),
        ]

    def __str__(self):
        return f"Report #{self.id} on {self.target_type}:{self.target_id} by user {self.reporter_id}"


class CopyrightCase(models.Model):
    class Status(models.TextChoices):
        UNDER_REVIEW = 'under_review', 'under_review'
        NEEDS_REPORTER_INFO = 'needs_reporter_info', 'needs_reporter_info'
        AWAITING_INSTRUCTOR_RESPONSE = 'awaiting_instructor_response', 'awaiting_instructor_response'
        INSTRUCTOR_RESPONDED = 'instructor_responded', 'instructor_responded'
        AWAITING_INSTRUCTOR_FIX = 'awaiting_instructor_fix', 'awaiting_instructor_fix'
        INSUFFICIENT_INFO = 'insufficient_info', 'insufficient_info'
        RESOLVED_VALID = 'resolved_valid', 'resolved_valid'
        RESOLVED_REJECTED = 'resolved_rejected', 'resolved_rejected'
        TAKEDOWN = 'takedown', 'takedown'
        RESTORED = 'restored', 'restored'
        ESCALATED_LEGAL = 'escalated_legal', 'escalated_legal'

    class Severity(models.TextChoices):
        LOW = 'low', 'low'
        MEDIUM = 'medium', 'medium'
        HIGH = 'high', 'high'
        CONFIRMED = 'confirmed', 'confirmed'
        LEGAL = 'legal', 'legal'

    class ContentAction(models.TextChoices):
        NONE = 'none', 'none'
        SALE_SUSPENDED = 'sale_suspended', 'sale_suspended'
        LESSON_HIDDEN = 'lesson_hidden', 'lesson_hidden'
        ACCESS_SUSPENDED = 'access_suspended', 'access_suspended'
        TAKEDOWN = 'takedown', 'takedown'
        RESTORED = 'restored', 'restored'

    class FinancialAction(models.TextChoices):
        NONE = 'none', 'none'
        HOLD = 'hold', 'hold'
        RELEASED = 'released', 'released'
        ADJUSTED = 'adjusted', 'adjusted'
        MANUAL_FOLLOW_UP = 'manual_follow_up', 'manual_follow_up'

    target_type = models.CharField(max_length=20, choices=Report.TargetType.choices)
    target_id = models.IntegerField()
    source_report = models.ForeignKey(
        Report, null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_case_sources'
    )
    course = models.ForeignKey(
        'courses.Course', null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_cases'
    )
    lesson = models.ForeignKey(
        'lessons.Lesson', null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_cases'
    )
    instructor = models.ForeignKey(
        'instructors.Instructor', null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_cases'
    )
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.UNDER_REVIEW)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.LOW)
    content_action = models.CharField(max_length=30, choices=ContentAction.choices, default=ContentAction.NONE)
    financial_action = models.CharField(max_length=30, choices=FinancialAction.choices, default=FinancialAction.NONE)
    reporter_deadline_at = models.DateTimeField(null=True, blank=True)
    instructor_deadline_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_cases_created'
    )
    last_action_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_cases_last_actioned'
    )
    resolved_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_cases_resolved'
    )
    manual_follow_up = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'CopyrightCases'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['target_type', 'target_id', 'status']),
            models.Index(fields=['instructor', 'status']),
            models.Index(fields=['created_by', 'status']),
        ]

    def __str__(self):
        return f"CopyrightCase #{self.id} on {self.target_type}:{self.target_id}"


class CopyrightCaseMessage(models.Model):
    class ActorRole(models.TextChoices):
        REPORTER = 'reporter', 'reporter'
        INSTRUCTOR = 'instructor', 'instructor'
        ADMIN = 'admin', 'admin'
        SYSTEM = 'system', 'system'

    class Visibility(models.TextChoices):
        ADMIN_ONLY = 'admin_only', 'admin_only'
        SHARED_WITH_REPORTER = 'shared_with_reporter', 'shared_with_reporter'
        SHARED_WITH_INSTRUCTOR = 'shared_with_instructor', 'shared_with_instructor'

    case = models.ForeignKey(CopyrightCase, on_delete=models.CASCADE, related_name='messages')
    actor = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_case_messages'
    )
    actor_role = models.CharField(max_length=20, choices=ActorRole.choices)
    message = models.TextField(blank=True)
    response_type = models.CharField(max_length=40, blank=True)
    attachments = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    visibility = models.CharField(
        max_length=30, choices=Visibility.choices, default=Visibility.ADMIN_ONLY
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'CopyrightCaseMessages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['case', 'created_at']),
            models.Index(fields=['actor', 'actor_role']),
        ]

    def __str__(self):
        return f"CopyrightCaseMessage #{self.id} for case {self.case_id}"


class InstructorEarningHold(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'active'
        RELEASED = 'released', 'released'
        ADJUSTED = 'adjusted', 'adjusted'

    case = models.ForeignKey(CopyrightCase, on_delete=models.CASCADE, related_name='earning_holds')
    earning = models.ForeignKey(
        'instructor_earnings.InstructorEarning',
        on_delete=models.CASCADE,
        related_name='copyright_holds',
    )
    course = models.ForeignKey(
        'courses.Course', null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_earning_holds'
    )
    instructor = models.ForeignKey(
        'instructors.Instructor', null=True, blank=True, on_delete=models.SET_NULL, related_name='copyright_earning_holds'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_earning_holds'
    )
    released_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='released_earning_holds'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True)
    adjusted_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'InstructorEarningHolds'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'course', 'instructor']),
            models.Index(fields=['earning', 'status']),
            models.Index(fields=['case', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['case', 'earning'], name='unique_hold_per_case_earning'),
        ]

    def __str__(self):
        return f"EarningHold #{self.id} earning {self.earning_id} case {self.case_id}"
