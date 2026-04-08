from django.db import models


class LearningPath(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='learning_paths')
    goal_text = models.TextField()
    summary = models.TextField(blank=True, default='')
    estimated_weeks = models.IntegerField(default=0)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'LearningPaths'
        ordering = ['-updated_at', '-created_at']

    def __str__(self):
        return f'LearningPath {self.id} for user {self.user_id}'


class LearningPathItem(models.Model):
    id = models.AutoField(primary_key=True)
    path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name='items')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='learning_path_items')
    order = models.PositiveIntegerField()
    reason = models.TextField()
    is_skippable = models.BooleanField(default=False)
    skippable_reason = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'LearningPathItems'
        ordering = ['order', 'id']
        unique_together = [('path', 'order'), ('path', 'course')]

    def __str__(self):
        return f'LearningPathItem {self.id} path={self.path_id} course={self.course_id}'


class PathConversation(models.Model):
    id = models.AutoField(primary_key=True)
    path = models.OneToOneField(LearningPath, on_delete=models.CASCADE, related_name='conversation')
    messages = models.JSONField(default=list, blank=True)
    advisor_meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'PathConversations'

    def __str__(self):
        return f'PathConversation {self.id} path={self.path_id}'
