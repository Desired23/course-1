from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum, Q
from .models import InstructorLevel
from .serializers import InstructorLevelSerializer




def list_instructor_levels():
    return InstructorLevel.objects.filter(is_deleted=False).order_by('min_plan_minutes', 'min_revenue')


def create_instructor_level(data: dict):
    serializer = InstructorLevelSerializer(data=data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    return serializer.save()


def update_instructor_level(level_id: int, data: dict):
    try:
        level = InstructorLevel.objects.get(id=level_id, is_deleted=False)
    except InstructorLevel.DoesNotExist:
        raise ValidationError("Không tìm thấy InstructorLevel.")
    serializer = InstructorLevelSerializer(level, data=data, partial=True)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    return serializer.save()


def delete_instructor_level(level_id: int, deleted_by_user):
    try:
        level = InstructorLevel.objects.get(id=level_id, is_deleted=False)
    except InstructorLevel.DoesNotExist:
        raise ValidationError("Không tìm thấy InstructorLevel.")
    from django.utils import timezone
    level.is_deleted = True
    level.deleted_at = timezone.now()
    level.deleted_by = deleted_by_user
    level.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
    return {"detail": "Đã xóa InstructorLevel."}




def check_and_upgrade_instructor_levels():
    """
    Kiểm tra tất cả instructor và tự động nâng level dựa trên
    tổng consumed_minutes từ SubscriptionUsage.
    Chỉ nâng level (không hạ xuống).
    Trả về danh sách instructor được nâng level.
    """
    from instructors.models import Instructor
    from subscription_plans.models import SubscriptionUsage


    levels = list(
        InstructorLevel.objects.filter(is_deleted=False, min_plan_minutes__gt=0)
        .order_by('-min_plan_minutes')
    )
    if not levels:
        return {"upgraded": [], "detail": "Không có level nào có ngưỡng min_plan_minutes > 0."}


    usage_agg = (
        SubscriptionUsage.objects
        .values('course__instructor__id')
        .annotate(total_minutes=Sum('consumed_minutes'))
        .filter(course__instructor__isnull=False)
    )

    upgraded = []

    with transaction.atomic():
        for row in usage_agg:
            instructor_id = row['course__instructor__id']
            total_minutes = row['total_minutes'] or 0

            try:
                instructor = Instructor.objects.select_related('level').get(id=instructor_id, is_deleted=False)
            except Instructor.DoesNotExist:
                continue


            target_level = None
            for lvl in levels:
                if total_minutes >= lvl.min_plan_minutes:
                    target_level = lvl
                    break

            if target_level is None:
                continue


            current_min = instructor.level.min_plan_minutes if instructor.level else -1
            if target_level.min_plan_minutes > current_min:
                old_level_name = instructor.level.name if instructor.level else 'Chưa có'
                instructor.level = target_level
                instructor.save(update_fields=['level', 'updated_at'])
                upgraded.append({
                    "instructor_id": instructor.id,
                    "instructor_name": instructor.user.full_name,
                    "old_level": old_level_name,
                    "new_level": target_level.name,
                    "total_plan_minutes": total_minutes,
                })

    return {"upgraded": upgraded, "total_upgraded": len(upgraded)}
