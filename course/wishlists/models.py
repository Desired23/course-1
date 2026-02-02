from django.db import models
from users.models import User
from courses.models import Course
from promotions.models import Promotion

class Wishlist(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist_user')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='wishlist_course')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_wishlists')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'Wishlist'
        constraints = [
            models.UniqueConstraint(fields=['user', 'course'], name='unique_wishlist')
        ]

    def __str__(self):
        return f"Wishlist {self.id}: User {self.user}, Course {self.course}"
