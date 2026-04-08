from django.db import models


class SearchEvent(models.Model):
    class SourceChoices(models.TextChoices):
        GLOBAL_SEARCH = 'global_search', 'global_search'

    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='search_events',
    )
    raw_query = models.CharField(max_length=255)
    normalized_query = models.CharField(max_length=255)
    source = models.CharField(
        max_length=32,
        choices=SourceChoices.choices,
        default=SourceChoices.GLOBAL_SEARCH,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'SearchEvents'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['normalized_query', '-created_at']),
            models.Index(fields=['source', '-created_at']),
        ]

    def __str__(self):
        return f"{self.normalized_query} ({self.source})"

