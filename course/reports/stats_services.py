"""Plan 6 — Report analytics: system-wide stats + CSV export.

Thống kê trên toàn hệ thống (không đếm theo trang). Report là generic
(target_type + target_id) nên không có priority/course/instructor; các chỉ số
theo course/instructor/severity lấy từ CopyrightCase.
"""
import csv
import io

from django.db.models import Count, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek

from .copyright_services import FINAL_STATUSES
from .models import CopyrightCase, InstructorEarningHold, Report


RESOLVED_CASE_STATUSES = [
    CopyrightCase.Status.TAKEDOWN,
    CopyrightCase.Status.RESTORED,
]
DISMISSED_CASE_STATUSES = [
    CopyrightCase.Status.RESOLVED_REJECTED,
    CopyrightCase.Status.INSUFFICIENT_INFO,
]
CRITICAL_SEVERITIES = [
    CopyrightCase.Severity.HIGH,
    CopyrightCase.Severity.CONFIRMED,
    CopyrightCase.Severity.LEGAL,
]


def _filtered_reports(filters):
    qs = Report.objects.all()
    if filters.get('date_from'):
        qs = qs.filter(created_at__date__gte=filters['date_from'])
    if filters.get('date_to'):
        qs = qs.filter(created_at__date__lte=filters['date_to'])
    if filters.get('reason'):
        qs = qs.filter(reason=filters['reason'])
    if filters.get('status'):
        qs = qs.filter(status=filters['status'])
    if filters.get('type'):
        qs = qs.filter(target_type=filters['type'])
    return qs


def _filtered_cases(filters):
    qs = CopyrightCase.objects.all()
    if filters.get('date_from'):
        qs = qs.filter(created_at__date__gte=filters['date_from'])
    if filters.get('date_to'):
        qs = qs.filter(created_at__date__lte=filters['date_to'])
    if filters.get('copyright_status'):
        qs = qs.filter(status=filters['copyright_status'])
    if filters.get('severity'):
        qs = qs.filter(severity=filters['severity'])
    if filters.get('instructor_id'):
        qs = qs.filter(instructor_id=filters['instructor_id'])
    if filters.get('course_id'):
        qs = qs.filter(course_id=filters['course_id'])
    return qs


def _count_map(qs, field):
    return {row[field]: row['count'] for row in qs.values(field).annotate(count=Count('id')).order_by()}


def get_report_statistics(filters=None):
    filters = filters or {}
    reports = _filtered_reports(filters)
    cases = _filtered_cases(filters)

    trunc = {'week': TruncWeek, 'month': TruncMonth}.get(filters.get('group_by'), TruncDay)
    trend = [
        {'period': row['period'].date().isoformat() if row['period'] else None, 'count': row['count']}
        for row in reports.annotate(period=trunc('created_at')).values('period').annotate(count=Count('id')).order_by('period')
    ]

    top_targets = list(
        reports.values('target_type', 'target_id')
        .annotate(count=Count('id')).order_by('-count')[:10]
    )
    top_instructors = list(
        cases.exclude(instructor__isnull=True)
        .values('instructor_id', 'instructor__user__full_name')
        .annotate(count=Count('id')).order_by('-count')[:10]
    )

    held_amount = (
        InstructorEarningHold.objects.filter(status=InstructorEarningHold.Status.ACTIVE)
        .aggregate(total=Sum('earning__net_amount'))['total']
    )

    return {
        'summary': {
            'total_reports': reports.count(),
            'open_cases': cases.exclude(status__in=FINAL_STATUSES).count(),
            'resolved_cases': cases.filter(status__in=RESOLVED_CASE_STATUSES).count(),
            'dismissed_cases': cases.filter(status__in=DISMISSED_CASE_STATUSES).count(),
            'critical_cases': cases.filter(severity__in=CRITICAL_SEVERITIES).count(),
        },
        'by_status': _count_map(reports, 'status'),
        'by_target_type': _count_map(reports, 'target_type'),
        'by_reason': _count_map(reports, 'reason'),
        'trend': trend,
        'top_targets': top_targets,
        'top_instructors': top_instructors,
        'copyright_financials': {
            'active_holds': InstructorEarningHold.objects.filter(
                status=InstructorEarningHold.Status.ACTIVE
            ).count(),
            'active_held_amount': str(held_amount or '0.00'),
        },
    }


def export_reports_csv(filters=None):
    reports = _filtered_reports(filters or {}).select_related('reporter', 'resolved_by').order_by('-created_at')
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['id', 'target_type', 'target_id', 'reason', 'status',
                     'reporter', 'action_taken', 'resolved_by', 'created_at', 'resolved_at'])
    for r in reports:
        writer.writerow([
            r.id, r.target_type, r.target_id, r.reason, r.status,
            r.reporter.full_name if r.reporter else '',
            r.action_taken,
            r.resolved_by.full_name if r.resolved_by else '',
            r.created_at.isoformat() if r.created_at else '',
            r.resolved_at.isoformat() if r.resolved_at else '',
        ])
    return buffer.getvalue()


def export_copyright_cases_csv(filters=None):
    cases = _filtered_cases(filters or {}).select_related('course', 'instructor__user').order_by('-updated_at')
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['id', 'course', 'instructor', 'status', 'severity',
                     'content_action', 'financial_action', 'manual_follow_up',
                     'created_at', 'resolved_at'])
    for c in cases:
        writer.writerow([
            c.id,
            c.course.title if c.course else '',
            c.instructor.user.full_name if c.instructor and c.instructor.user else '',
            c.status, c.severity, c.content_action, c.financial_action, c.manual_follow_up,
            c.created_at.isoformat() if c.created_at else '',
            c.resolved_at.isoformat() if c.resolved_at else '',
        ])
    return buffer.getvalue()
