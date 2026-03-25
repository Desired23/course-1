import csv
from collections import OrderedDict
from io import StringIO

from django.db.models import Avg, Count, Q, Sum
from rest_framework.exceptions import ValidationError

from enrollments.models import Enrollment
from learning_progress.models import LearningProgress


def get_instructor_students(instructor, course_id=None):
    qs = Enrollment.objects.filter(
        course__instructor=instructor,
        is_deleted=False,
        user__is_deleted=False,
    ).select_related('user', 'course').order_by('-last_access_date', '-updated_at')

    if course_id:
        qs = qs.filter(course_id=course_id)

    students = OrderedDict()
    for enrollment in qs:
        if not enrollment.user or not enrollment.course:
            continue

        entry = students.setdefault(enrollment.user_id, {
            'student_id': enrollment.user_id,
            'full_name': enrollment.user.full_name,
            'email': enrollment.user.email,
            'avatar': enrollment.user.avatar,
            'status': enrollment.user.status,
            'enrolled_at': enrollment.enrollment_date,
            'last_access_date': enrollment.last_access_date,
            'average_progress': 0.0,
            'completion_count': 0,
            'total_courses': 0,
            'courses': [],
        })

        entry['total_courses'] += 1
        entry['average_progress'] += float(enrollment.progress or 0)
        if enrollment.status == Enrollment.Status.Complete:
            entry['completion_count'] += 1
        if enrollment.enrollment_date and (entry['enrolled_at'] is None or enrollment.enrollment_date < entry['enrolled_at']):
            entry['enrolled_at'] = enrollment.enrollment_date
        if enrollment.last_access_date and (entry['last_access_date'] is None or enrollment.last_access_date > entry['last_access_date']):
            entry['last_access_date'] = enrollment.last_access_date

        entry['courses'].append({
            'course_id': enrollment.course_id,
            'title': enrollment.course.title,
            'status': enrollment.status,
            'progress': float(enrollment.progress or 0),
            'enrollment_date': enrollment.enrollment_date,
            'last_access_date': enrollment.last_access_date,
        })

    results = []
    for entry in students.values():
        total_courses = max(entry['total_courses'], 1)
        entry['average_progress'] = round(entry['average_progress'] / total_courses, 2)
        results.append(entry)

    return results


def get_instructor_student_detail(instructor, student_id):
    qs = Enrollment.objects.filter(
        course__instructor=instructor,
        user_id=student_id,
        is_deleted=False,
        user__is_deleted=False,
    ).select_related('user', 'course').order_by('-last_access_date', '-updated_at')

    enrollments = list(qs)
    if not enrollments:
        raise ValidationError("Student not found for this instructor")

    progress_by_enrollment = {
        row['enrollment_id']: row
        for row in LearningProgress.objects.filter(
            enrollment_id__in=[enrollment.id for enrollment in enrollments],
            is_deleted=False,
        )
        .values('enrollment_id')
        .annotate(
            completed_lessons=Count('id', filter=Q(is_completed=True)),
            avg_lesson_progress=Avg('progress_percentage'),
            total_time_spent=Sum('time_spent'),
        )
    }

    student = enrollments[0].user
    courses = []
    average_progress = 0.0
    completion_count = 0
    first_enrolled_at = None
    last_access_date = None

    for enrollment in enrollments:
        progress_data = progress_by_enrollment.get(enrollment.id, {})
        average_progress += float(enrollment.progress or 0)
        if enrollment.status == Enrollment.Status.Complete:
            completion_count += 1
        if enrollment.enrollment_date and (first_enrolled_at is None or enrollment.enrollment_date < first_enrolled_at):
            first_enrolled_at = enrollment.enrollment_date
        if enrollment.last_access_date and (last_access_date is None or enrollment.last_access_date > last_access_date):
            last_access_date = enrollment.last_access_date

        courses.append({
            'enrollment_id': enrollment.id,
            'course_id': enrollment.course_id,
            'title': enrollment.course.title,
            'status': enrollment.status,
            'progress': float(enrollment.progress or 0),
            'enrollment_date': enrollment.enrollment_date,
            'last_access_date': enrollment.last_access_date,
            'completion_date': enrollment.completion_date,
            'certificate': enrollment.certificate,
            'total_lessons': enrollment.course.total_lessons or 0,
            'completed_lessons': int(progress_data.get('completed_lessons') or 0),
            'avg_lesson_progress': round(float(progress_data.get('avg_lesson_progress') or 0), 2),
            'time_spent_minutes': int(progress_data.get('total_time_spent') or 0),
        })

    total_courses = len(courses)
    return {
        'student_id': student.id,
        'full_name': student.full_name,
        'email': student.email,
        'avatar': student.avatar,
        'status': student.status,
        'phone': student.phone,
        'address': student.address,
        'enrolled_at': first_enrolled_at,
        'last_access_date': last_access_date,
        'average_progress': round(average_progress / total_courses, 2) if total_courses else 0.0,
        'completion_count': completion_count,
        'total_courses': total_courses,
        'active_course_count': sum(1 for course in courses if course['status'] == Enrollment.Status.Active),
        'courses': courses,
    }


def export_instructor_students_csv(instructor, course_id=None):
    students = get_instructor_students(instructor, course_id=course_id)
    buffer = StringIO()
    writer = csv.writer(buffer)

    writer.writerow([
        'Student ID',
        'Full Name',
        'Email',
        'Status',
        'Total Courses',
        'Average Progress',
        'Completion Count',
        'First Enrolled At',
        'Last Access Date',
        'Courses',
    ])

    for student in students:
        course_titles = ', '.join(course['title'] for course in student['courses'])
        writer.writerow([
            student['student_id'],
            _sanitize_csv_cell(student['full_name']),
            _sanitize_csv_cell(student['email']),
            student['status'],
            student['total_courses'],
            student['average_progress'],
            student['completion_count'],
            student['enrolled_at'].isoformat() if student['enrolled_at'] else '',
            student['last_access_date'].isoformat() if student['last_access_date'] else '',
            _sanitize_csv_cell(course_titles),
        ])

    return buffer.getvalue()


def _sanitize_csv_cell(value):
    if value is None:
        return ''

    text = str(value)
    if text.startswith(('=', '+', '-', '@')):
        return f"'{text}"
    return text
