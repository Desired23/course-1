from django.db import models

class StatusChoices(models.TextChoices):
    ACTIVE = 'active', 'active'
    INACTIVE = 'inactive', 'inactive'
class Category(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    parent_category = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories'
    )
    
    status = models.CharField(
        max_length=8,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'Categories'

    def __str__(self):
        return self.name




