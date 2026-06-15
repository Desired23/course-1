# -*- coding: utf-8 -*-
"""Tính động các chỉ số tổng hợp của giảng viên.

Các field lưu cứng trên model Instructor (total_courses/total_students/rating)
không được maintain ở bất kỳ đâu, nên mọi nơi hiển thị phải tính trực tiếp từ DB.
Lazy import để tránh vòng lặp import."""
from django.db.models import Avg


def published_course_count(instructor):
    from courses.models import Course
    return Course.objects.filter(
        instructor=instructor, is_deleted=False, status=Course.Status.PUBLISHED
    ).count()


def student_count(instructor):
    from enrollments.models import Enrollment
    return (
        Enrollment.objects.filter(
            course__instructor=instructor, course__is_deleted=False, is_deleted=False
        )
        .values('user').distinct().count()
    )


def average_rating(instructor):
    from reviews.models import Review
    avg = Review.objects.filter(
        course__instructor=instructor, is_deleted=False
    ).aggregate(value=Avg('rating'))['value']
    return round(float(avg), 2) if avg is not None else 0.0
