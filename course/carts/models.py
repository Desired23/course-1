from django.db import models
from users.models import User
from courses.models import Course
from promotions.models import Promotion

class Cart(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_user')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='cart_course', null=True, blank=True)
    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.CASCADE,
        related_name='cart_promotion',
        null=True, blank=True  # Cho phép null và không bắt buộc
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_carts')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'Cart'
        constraints = [
            models.UniqueConstraint(fields=['user', 'course'], name='unique_cart')
        ]

    def __str__(self):
        return f"Cart {self.id}: User {self.user_id}, Course {self.course_id}"
