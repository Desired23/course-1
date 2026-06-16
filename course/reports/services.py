from datetime import datetime, time

from django.db import models as django_models
from django.db.models import Count, Max
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import ValidationError

from .adapters import get_adapter
from .models import Report


def _derive_priority(report_count):
    if report_count >= 5:
        return 'critical'
    if report_count >= 3:
        return 'high'
    if report_count >= 2:
        return 'medium'
    return 'low'


def _to_datetime_range(date_from=None, date_to=None):
    parsed_from = parse_datetime(date_from or '') if date_from else None
    parsed_to = parse_datetime(date_to or '') if date_to else None

    if not parsed_from and date_from:
        only_date = parse_date(date_from)
        if only_date:
            parsed_from = datetime.combine(only_date, time.min)
    if not parsed_to and date_to:
        only_date = parse_date(date_to)
        if only_date:
            parsed_to = datetime.combine(only_date, time.max)

    if parsed_from and timezone.is_naive(parsed_from):
        parsed_from = timezone.make_aware(parsed_from)
    if parsed_to and timezone.is_naive(parsed_to):
        parsed_to = timezone.make_aware(parsed_to)
    return parsed_from, parsed_to


def create_report(reporter, target_type, target_id, reason, description='', metadata=None, attachments=None):
    adapter = get_adapter(target_type)
    if not adapter:
        raise ValidationError({'target_type': 'Loại nội dung không hợp lệ.'})

    obj = adapter['get_object'](target_id)
    if obj is None:
        raise ValidationError({'target_id': 'Không tìm thấy nội dung.'})

    owner_id = adapter['get_owner_id'](obj)
    if reporter and owner_id and reporter.id == owner_id:
        raise ValidationError({'detail': 'Bạn không thể báo cáo nội dung của chính mình.'})

    existing = None
    if reporter:
        existing = Report.objects.filter(
            reporter=reporter,
            target_type=target_type,
            target_id=target_id,
            status__in=[Report.Status.PENDING, Report.Status.REVIEWING],
        ).first()

    if existing:
        if reason and reason != existing.reason:
            existing.reason = reason
        if description:
            existing.description = description
        if metadata:
            existing.metadata = metadata
        if attachments:
            existing.attachments = attachments
        existing.save(update_fields=['reason', 'description', 'metadata', 'attachments', 'updated_at'])
        report = existing
    else:
        report = Report.objects.create(
            reporter=reporter,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            description=description,
            metadata=metadata or {},
            attachments=attachments or [],
        )

    _sync_counter(target_type, target_id, reason, description)

    copyright_case = None
    if reason == Report.Reason.COPYRIGHT:
        from .copyright_services import create_or_update_copyright_case
        copyright_case = create_or_update_copyright_case(
            report,
            metadata=metadata or {},
            attachments=attachments or [],
        )

    try:
        from notifications.services import notify_admins
        report_count = Report.objects.filter(
            target_type=target_type, target_id=target_id,
            status__in=[Report.Status.PENDING, Report.Status.REVIEWING],
        ).count()
        title = adapter['get_title'](obj)
        notify_admins(
            title=f"{_target_type_label(target_type)} bị báo cáo",
            message=f'"{title}" đã bị báo cáo ({report_count} lần). Lý do: {_reason_label(reason)}',
            type='other',
            notification_code=f'{target_type}_reported',
            related_id=target_id,
            action_url=(
                f'/admin/reports?case={copyright_case.id}'
                if copyright_case else None
            ),
            metadata={'copyright_case_id': copyright_case.id} if copyright_case else None,
            force=bool(copyright_case),
        )
    except Exception:
        pass

    return report


def _target_type_label(target_type):
    labels = {
        'review': 'Đánh giá',
        'question': 'Câu hỏi',
        'answer': 'Câu trả lời',
        'blog_post': 'Bài viết blog',
        'blog_comment': 'Bình luận blog',
        'lesson_comment': 'Bình luận bài học',
        'course': 'Khóa học',
        'message': 'Tin nhắn',
    }
    return labels.get(target_type, target_type)


def _reason_label(reason):
    labels = {
        'spam': 'Spam',
        'offensive': 'Nội dung phản cảm',
        'harassment': 'Quấy rối / bắt nạt',
        'copyright': 'Vi phạm bản quyền',
        'misinformation': 'Thông tin sai lệch',
        'other': 'Khác',
    }
    return labels.get(reason, reason)


def _sync_counter(target_type, target_id, reason, description):
    try:
        count = Report.objects.filter(
            target_type=target_type,
            target_id=target_id,
            status__in=[Report.Status.PENDING, Report.Status.REVIEWING],
        ).count()
        now = timezone.now()

        if target_type == 'review':
            from reviews.models import Review
            Review.objects.filter(id=target_id).update(
                report_count=count, last_report_reason=reason or description, last_reported_at=now
            )
        elif target_type == 'question':
            from questions.models import Question
            Question.objects.filter(id=target_id).update(
                report_count=count, last_report_reason=reason or description, last_reported_at=now
            )
        elif target_type == 'blog_post':
            from blog_posts.models import BlogPost
            BlogPost.objects.filter(id=target_id).update(
                report_count=count, last_report_reason=reason or description, last_reported_at=now
            )
        elif target_type == 'message':
            from realtime.models import Message
            Message.objects.filter(id=target_id).update(
                report_count=count, last_report_reason=reason or description, last_reported_at=now
            )
    except Exception:
        pass


def get_report_cases(filters=None):
    filters = filters or {}
    target_type_filter = filters.get('type')
    status_filter = filters.get('status', 'pending')
    priority_filter = filters.get('priority')
    search = (filters.get('search') or '').strip().lower()
    date_from, date_to = _to_datetime_range(filters.get('date_from'), filters.get('date_to'))

    report_status_map = {
        'pending': [Report.Status.PENDING],
        'reviewing': [Report.Status.REVIEWING],
        'resolved': [Report.Status.RESOLVED],
        'dismissed': [Report.Status.DISMISSED],
        'open': [Report.Status.PENDING, Report.Status.REVIEWING],
    }
    statuses = report_status_map.get(status_filter, [Report.Status.PENDING])

    qs = Report.objects.filter(status__in=statuses)
    if target_type_filter:
        qs = qs.filter(target_type=target_type_filter)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)

    cases_qs = (
        qs
        .values('target_type', 'target_id')
        .annotate(
            report_count=Count('id'),
            last_reported_at=Max('created_at'),
        )
        .order_by('-last_reported_at')
    )

    from .models import CopyrightCase
    copyright_map = {}
    for c in CopyrightCase.objects.order_by('id').values('target_type', 'target_id', 'id'):
        copyright_map[(c['target_type'], c['target_id'])] = c['id']

    items = []
    for case in cases_qs:
        tt = case['target_type']
        tid = case['target_id']
        report_count = case['report_count']
        priority = _derive_priority(report_count)

        if priority_filter and priority != priority_filter:
            continue

        adapter = get_adapter(tt)
        if not adapter:
            continue
        obj = adapter['get_object'](tid)

        title = adapter['get_title'](obj) if obj else f'{tt} #{tid}'
        owner_name = _get_owner_name(adapter, obj)
        snippet = adapter['get_snippet'](obj) if obj else ''

        if search:
            haystacks = [title, owner_name or '', snippet]
            if not any(search in h.lower() for h in haystacks):
                continue

        reason_qs = (
            qs.filter(target_type=tt, target_id=tid)
            .values('reason')
            .annotate(count=Count('id'))
        )
        reason_breakdown = {r['reason']: r['count'] for r in reason_qs}
        top_reason = max(reason_breakdown, key=reason_breakdown.get) if reason_breakdown else 'other'

        response_status = status_filter if status_filter not in (None, '', 'open') else 'pending'

        items.append({
            'id': f'{tt}-{tid}',
            'target_type': tt,
            'target_id': tid,
            'report_count': report_count,
            'priority': priority,
            'status': response_status,
            'title': title,
            'owner_name': owner_name,
            'snippet': snippet,
            'top_reason': top_reason,
            'reason_breakdown': reason_breakdown,
            'last_reported_at': case['last_reported_at'],
            'copyright_case_id': copyright_map.get((tt, tid)),
        })

    return items


def _get_owner_name(adapter, obj):
    if obj is None:
        return None
    try:
        owner_id = adapter['get_owner_id'](obj)
        if owner_id is None:
            return None
        from users.models import User
        user = User.objects.filter(id=owner_id).values('full_name').first()
        return user['full_name'] if user else None
    except Exception:
        return None


def get_report_case_detail(target_type, target_id):
    adapter = get_adapter(target_type)
    if not adapter:
        raise ValidationError({'target_type': 'Loại nội dung không hợp lệ.'})

    obj = adapter['get_object'](target_id)

    Report.objects.filter(
        target_type=target_type, target_id=target_id, status=Report.Status.PENDING
    ).update(status=Report.Status.REVIEWING)

    reports = Report.objects.filter(
        target_type=target_type, target_id=target_id
    ).select_related('reporter')

    items = []
    for r in reports:
        items.append({
            'report_id': r.id,
            'reporter_name': r.reporter.full_name if r.reporter else None,
            'reporter_email': r.reporter.email if r.reporter else None,
            'reason': r.reason,
            'reason_label': _reason_label(r.reason),
            'description': r.description,
            'metadata': r.metadata,
            'attachments': r.attachments,
            'status': r.status,
            'created_at': r.created_at,
        })

    result = {
        'target_type': target_type,
        'target_id': target_id,
        'title': adapter['get_title'](obj) if obj else f'{target_type} #{target_id}',
        'owner_name': _get_owner_name(adapter, obj),
        'snippet': adapter['get_snippet'](obj) if obj else '',
        'reports': items,
    }

    get_context = adapter.get('get_context')
    if get_context and obj is not None:
        try:
            result['context'] = get_context(obj)
        except Exception:
            pass

    return result


def resolve_report_case(target_type, target_id, action, notes='', admin=None):
    adapter = get_adapter(target_type)
    if not adapter:
        raise ValidationError({'target_type': 'Loại nội dung không hợp lệ.'})

    valid_actions = adapter.get('actions', set())
    if action not in valid_actions:
        raise ValidationError({
            'action': f"Hành động '{action}' không hợp lệ cho loại '{target_type}'. "
                      f"Hành động hợp lệ: {', '.join(sorted(valid_actions))}."
        })

    result = adapter['moderate'](target_id, action, notes)

    final_status = Report.Status.DISMISSED if action == 'dismiss' else Report.Status.RESOLVED

    now = timezone.now()
    Report.objects.filter(
        target_type=target_type,
        target_id=target_id,
        status__in=[Report.Status.PENDING, Report.Status.REVIEWING],
    ).update(
        status=final_status,
        resolved_by=admin,
        action_taken=action,
        resolution_notes=notes,
        resolved_at=now,
        updated_at=now,
    )

    _reset_counter(target_type, target_id)

    return result


def reopen_report_case(target_type, target_id, admin=None):
    """Mở lại report đã RESOLVED/DISMISSED về REVIEWING để admin có thể xử lý lại."""
    updated = Report.objects.filter(
        target_type=target_type,
        target_id=target_id,
        status__in=[Report.Status.RESOLVED, Report.Status.DISMISSED],
    ).update(
        status=Report.Status.REVIEWING,
        resolved_by=None,
        action_taken='',
        resolution_notes='',
        resolved_at=None,
        updated_at=timezone.now(),
    )
    if updated == 0:
        raise ValidationError({'error': 'Không tìm thấy report đã xử lý cho nội dung này.'})
    return {'message': 'Đã mở lại report. Chuyển về trạng thái đang xem xét.'}


def _reset_counter(target_type, target_id):
    try:
        if target_type == 'review':
            from reviews.models import Review
            Review.objects.filter(id=target_id).update(report_count=0)
        elif target_type == 'question':
            from questions.models import Question
            Question.objects.filter(id=target_id).update(report_count=0)
        elif target_type == 'blog_post':
            from blog_posts.models import BlogPost
            BlogPost.objects.filter(id=target_id).update(report_count=0)
        elif target_type == 'message':
            from realtime.models import Message
            Message.objects.filter(id=target_id).update(report_count=0)
    except Exception:
        pass
