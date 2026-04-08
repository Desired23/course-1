from django.db import models


class KnowledgeDocument(models.Model):
    class SourceType(models.TextChoices):
        TRANSCRIPT = "transcript"
        ATTACHMENT = "attachment"

    class Visibility(models.TextChoices):
        PUBLISHED = "published"
        INSTRUCTOR_PREVIEW = "instructor_preview"

    class Status(models.TextChoices):
        PENDING = "pending"
        PROCESSING = "processing"
        READY = "ready"
        FAILED = "failed"
        STALE = "stale"

    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="knowledge_documents",
    )
    lesson = models.ForeignKey(
        "lessons.Lesson",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="knowledge_documents",
    )
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    source_object_id = models.PositiveIntegerField()
    source_group_key = models.CharField(max_length=255)
    language_code = models.CharField(max_length=16, default="und")
    visibility = models.CharField(max_length=24, choices=Visibility.choices, default=Visibility.PUBLISHED)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    version = models.PositiveIntegerField(default=1)
    checksum = models.CharField(max_length=64, blank=True, default="")
    title = models.CharField(max_length=255)
    source_url = models.CharField(max_length=500, blank=True, default="")
    metadata_json = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["course", "status", "visibility"]),
            models.Index(fields=["lesson", "status", "visibility"]),
            models.Index(fields=["source_type", "source_object_id"]),
            models.Index(fields=["source_group_key", "version"]),
        ]

    def __str__(self):
        return f"KnowledgeDocument<{self.id}> {self.source_type}#{self.source_object_id} v{self.version}"


class KnowledgeChunk(models.Model):
    document = models.ForeignKey(
        KnowledgeDocument,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    chunk_index = models.PositiveIntegerField()
    text = models.TextField()
    token_count = models.PositiveIntegerField(default=0)
    embedding_vector = models.JSONField(null=True, blank=True)
    start_ms = models.PositiveIntegerField(null=True, blank=True)
    end_ms = models.PositiveIntegerField(null=True, blank=True)
    citation_label = models.CharField(max_length=255, blank=True, default="")
    metadata_json = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["chunk_index", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "chunk_index"],
                name="unique_knowledge_chunk_index",
            )
        ]

    def __str__(self):
        return f"KnowledgeChunk<{self.id}> doc={self.document_id} idx={self.chunk_index}"


class KnowledgeIngestJob(models.Model):
    class Scope(models.TextChoices):
        LESSON = "lesson"
        COURSE = "course"
        DOCUMENT = "document"

    class TriggerSource(models.TextChoices):
        TRANSCRIPT_PUBLISHED = "transcript_published"
        TRANSCRIPT_UPDATED = "transcript_updated"
        ATTACHMENT_CREATED = "attachment_created"
        ATTACHMENT_UPDATED = "attachment_updated"
        MANUAL = "manual"
        LESSON_PUBLISHED = "lesson_published"

    class Status(models.TextChoices):
        QUEUED = "queued"
        PROCESSING = "processing"
        COMPLETED = "completed"
        FAILED = "failed"

    course = models.ForeignKey(
        "courses.Course",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="knowledge_jobs",
    )
    lesson = models.ForeignKey(
        "lessons.Lesson",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="knowledge_jobs",
    )
    document = models.ForeignKey(
        KnowledgeDocument,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="jobs",
    )
    scope = models.CharField(max_length=16, choices=Scope.choices, default=Scope.DOCUMENT)
    trigger_source = models.CharField(max_length=32, choices=TriggerSource.choices, default=TriggerSource.MANUAL)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.QUEUED)
    source_type = models.CharField(max_length=20, choices=KnowledgeDocument.SourceType.choices)
    source_object_id = models.PositiveIntegerField()
    source_group_key = models.CharField(max_length=255, blank=True, default="")
    visibility = models.CharField(
        max_length=24,
        choices=KnowledgeDocument.Visibility.choices,
        default=KnowledgeDocument.Visibility.PUBLISHED,
    )
    language_code = models.CharField(max_length=16, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["source_type", "source_object_id", "visibility"]),
            models.Index(fields=["course", "lesson"]),
        ]

    def __str__(self):
        return f"KnowledgeIngestJob<{self.id}> {self.source_type}#{self.source_object_id} {self.status}"


class AssistantConversation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active"
        ARCHIVED = "archived"

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="assistant_conversations",
    )
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="assistant_conversations",
    )
    lesson = models.ForeignKey(
        "lessons.Lesson",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="assistant_conversations",
    )
    title = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_message_at", "-updated_at", "-id"]
        indexes = [
            models.Index(fields=["user", "course", "lesson", "status"], name="kn_asstconv_user_idx"),
            models.Index(fields=["course", "lesson", "status"], name="kn_asstconv_scope_idx"),
        ]

    def __str__(self):
        return f"AssistantConversation<{self.id}> user={self.user_id} course={self.course_id} lesson={self.lesson_id}"


class AssistantMessage(models.Model):
    class Role(models.TextChoices):
        SYSTEM = "system"
        USER = "user"
        ASSISTANT = "assistant"

    conversation = models.ForeignKey(
        AssistantConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=16, choices=Role.choices)
    content = models.TextField()
    citations_json = models.JSONField(default=list, blank=True)
    retrieval_context_json = models.JSONField(default=dict, blank=True)
    token_usage = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["conversation", "created_at"], name="kn_asstmsg_conv_idx"),
        ]

    def __str__(self):
        return f"AssistantMessage<{self.id}> conv={self.conversation_id} role={self.role}"
