from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum, Q
from .models import InstructorLevel
from .serializers import InstructorLevelSerializer




def list_instructor_levels():
    return InstructorLevel.objects.filter(is_deleted=False).order_by('min_plan_minutes', 'min_revenue', 'min_students')


def get_default_instructor_level():
    """Level khởi điểm để gán mặc định khi tạo instructor: sàn lấy phí cao nhất
    (commission_rate lớn nhất) vì instructor mới chưa tạo doanh thu."""
    return (
        InstructorLevel.objects
        .filter(is_deleted=False)
        .order_by('-commission_rate', 'min_plan_minutes', 'min_revenue')
        .first()
    )


def _level_rank(level):
    return (
        level.min_plan_minutes or 0,
        level.min_revenue or 0,
        level.min_students or 0,
    )


def _level_sort_key(level):
    return (
        *_level_rank(level),
        level.id or 0,
    )


def ordered_instructor_levels():
    return sorted(
        InstructorLevel.objects.filter(is_deleted=False),
        key=_level_sort_key,
    )


def get_next_instructor_level(level):
    if not level:
        return None

    levels = ordered_instructor_levels()
    current_rank = _level_rank(level)
    return next((candidate for candidate in levels if _level_rank(candidate) > current_rank), None)


def _instructor_level_metrics(instructor):
    from enrollments.models import Enrollment
    from instructor_earnings.models import InstructorEarning
    from subscription_plans.models import SubscriptionUsage

    total_students = (
        Enrollment.objects
        .filter(
            course__instructor=instructor,
            is_deleted=False,
            status=Enrollment.Status.Active,
        )
        .values('user_id')
        .distinct()
        .count()
    )
    total_revenue = (
        InstructorEarning.objects
        .filter(instructor=instructor, is_deleted=False)
        .aggregate(total=Sum('net_amount'))['total'] or 0
    )
    total_plan_minutes = (
        SubscriptionUsage.objects
        .filter(course__instructor=instructor)
        .aggregate(total=Sum('consumed_minutes'))['total'] or 0
    )
    return {
        'total_students': total_students,
        'total_revenue': total_revenue,
        'total_plan_minutes': total_plan_minutes,
    }


def _meets_level(level, metrics):
    return (
        metrics['total_students'] >= (level.min_students or 0)
        and metrics['total_revenue'] >= (level.min_revenue or 0)
        and metrics['total_plan_minutes'] >= (level.min_plan_minutes or 0)
    )


def check_and_upgrade_instructor_level(instructor):
    if not instructor or instructor.level_locked:
        return None

    metrics = _instructor_level_metrics(instructor)
    target_level = None
    for level in ordered_instructor_levels():
        if _meets_level(level, metrics):
            target_level = level
    if target_level is None:
        target_level = get_default_instructor_level()

    if target_level is None:
        return None

    current_level = instructor.level
    if current_level and _level_rank(target_level) <= _level_rank(current_level):
        return None

    old_level_name = current_level.name if current_level else 'Chưa có'
    instructor.level = target_level
    instructor.save(update_fields=['level', 'updated_at'])
    return {
        'instructor_id': instructor.id,
        'old_level': old_level_name,
        'new_level': target_level.name,
        **metrics,
    }


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

            if instructor.level_locked:
                # Level do admin gán thủ công — không tự động nâng cấp.
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
