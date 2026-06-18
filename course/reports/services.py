from datetime import datetime, time

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

    metadata = metadata or {}
    attachments = attachments or []
    description = description or ''

    existing = None
    if reporter:
        existing = Report.objects.filter(
            reporter=reporter,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            description=description,
            metadata=metadata,
            attachments=attachments,
            status__in=[Report.Status.PENDING, Report.Status.REVIEWING],
        ).first()

    if existing:
        return existing

    report = Report.objects.create(
        reporter=reporter,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        description=description,
        metadata=metadata,
        attachments=attachments,
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
        open_reports = Report.objects.filter(
            target_type=target_type,
            target_id=target_id,
            status__in=[Report.Status.PENDING, Report.Status.REVIEWING],
        )
        count = open_reports.count()
        latest = open_reports.order_by('-created_at', '-id').first()
        last_reason = (latest.reason or latest.description) if latest else None
        last_reported_at = latest.created_at if latest else None

        if target_type == 'review':
            from reviews.models import Review
            Review.objects.filter(id=target_id).update(
                report_count=count, last_report_reason=last_reason, last_reported_at=last_reported_at
            )
        elif target_type == 'question':
            from questions.models import Question
            Question.objects.filter(id=target_id).update(
                report_count=count, last_report_reason=last_reason, last_reported_at=last_reported_at
            )
        elif target_type == 'blog_post':
            from blog_posts.models import BlogPost
            BlogPost.objects.filter(id=target_id).update(
                report_count=count, last_report_reason=last_reason, last_reported_at=last_reported_at
            )
        elif target_type == 'message':
            from realtime.models import Message
            Message.objects.filter(id=target_id).update(
                report_count=count, last_report_reason=last_reason, last_reported_at=last_reported_at
            )
    except Exception:
        pass


def _status_values(status_filter):
    report_status_map = {
        'pending': [Report.Status.PENDING],
        'reviewing': [Report.Status.REVIEWING],
        'resolved': [Report.Status.RESOLVED],
        'dismissed': [Report.Status.DISMISSED],
        'open': [Report.Status.PENDING, Report.Status.REVIEWING],
        'processed': [Report.Status.RESOLVED, Report.Status.DISMISSED],
    }
    return report_status_map.get(status_filter or 'open', report_status_map['open'])


def _find_copyright_case_id(report):
    if report.reason != Report.Reason.COPYRIGHT:
        return None
    from .models import CopyrightCase
    case = (
        CopyrightCase.objects
        .filter(target_type=report.target_type, target_id=report.target_id)
        .order_by('-id')
        .values('id')
        .first()
    )
    return case['id'] if case else None


def _get_moderation_url(report, obj):
    if report.reason == Report.Reason.COPYRIGHT:
        case_id = _find_copyright_case_id(report)
        return f'/admin/reports?case={case_id}' if case_id else None
    if report.target_type == Report.TargetType.COURSE:
        return f'/admin/courses/{report.target_id}'
    if report.target_type == Report.TargetType.LESSON:
        return f'/instructor/lessons/{report.target_id}/edit'
    if report.target_type == Report.TargetType.REVIEW:
        return f'/admin/reviews?review={report.target_id}'
    if report.target_type == Report.TargetType.QUESTION:
        return f'/qa/{report.target_id}'
    if report.target_type == Report.TargetType.ANSWER and obj is not None:
        question_id = getattr(obj, 'question_id', None)
        return f'/qa/{question_id}?answer={report.target_id}' if question_id else None
    if report.target_type == Report.TargetType.BLOG_POST and obj is not None:
        slug = getattr(obj, 'slug', None)
        return f'/blog/{slug}' if slug else None
    if report.target_type == Report.TargetType.BLOG_COMMENT and obj is not None:
        post = getattr(obj, 'blog_post', None)
        slug = getattr(post, 'slug', None)
        return f'/blog/{slug}?comment={report.target_id}' if slug else None
    if report.target_type == Report.TargetType.LESSON_COMMENT and obj is not None:
        try:
            lesson = obj.lesson
            module = lesson.coursemodule if lesson else None
            course = module.course if module else None
            if course and lesson:
                return f'/course-player/{course.id}?lesson={lesson.id}&comment={report.target_id}'
        except Exception:
            return None
    return None


def _serialize_report_item(report):
    adapter = get_adapter(report.target_type)
    obj = adapter['get_object'](report.target_id) if adapter else None
    title = adapter['get_title'](obj) if adapter and obj else f'{report.target_type} #{report.target_id}'
    snippet = adapter['get_snippet'](obj) if adapter and obj else ''
    owner_name = _get_owner_name(adapter, obj) if adapter else None
    open_count = Report.objects.filter(
        target_type=report.target_type,
        target_id=report.target_id,
        status__in=[Report.Status.PENDING, Report.Status.REVIEWING],
    ).count()

    return {
        'id': str(report.id),
        'report_id': report.id,
        'target_type': report.target_type,
        'target_id': report.target_id,
        'report_count': open_count,
        'priority': _derive_priority(open_count),
        'status': report.status,
        'title': title,
        'owner_name': owner_name,
        'snippet': snippet,
        'reason': report.reason,
        'reason_label': _reason_label(report.reason),
        'description': report.description,
        'metadata': report.metadata,
        'attachments': report.attachments,
        'reporter_name': report.reporter.full_name if report.reporter else None,
        'reporter_email': report.reporter.email if report.reporter else None,
        'reported_at': report.created_at,
        'processed_at': report.resolved_at,
        'processed_by_name': report.resolved_by.full_name if report.resolved_by else None,
        'copyright_case_id': _find_copyright_case_id(report),
        'moderation_url': _get_moderation_url(report, obj),
    }


def get_report_cases(filters=None):
    filters = filters or {}
    target_type_filter = filters.get('type')
    reason_filter = filters.get('reason')
    status_filter = filters.get('status', 'open')
    priority_filter = filters.get('priority')
    search = (filters.get('search') or '').strip().lower()
    date_from, date_to = _to_datetime_range(filters.get('date_from'), filters.get('date_to'))

    qs = Report.objects.select_related('reporter', 'resolved_by').filter(status__in=_status_values(status_filter))
    if target_type_filter:
        qs = qs.filter(target_type=target_type_filter)
    if reason_filter:
        qs = qs.filter(reason=reason_filter)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)

    items = []
    for report in qs.order_by('-created_at', '-id'):
        item = _serialize_report_item(report)

        if priority_filter and item['priority'] != priority_filter:
            continue

        if search:
            haystacks = [
                item['title'] or '',
                item['owner_name'] or '',
                item['snippet'] or '',
                item['description'] or '',
                item['reporter_name'] or '',
                item['reporter_email'] or '',
            ]
            if not any(search in h.lower() for h in haystacks):
                continue

        items.append(item)

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


def get_report_item_detail(report_id):
    report = Report.objects.select_related('reporter', 'resolved_by').filter(id=report_id).first()
    if not report:
        raise ValidationError({'report_id': 'Report not found.'})

    item = _serialize_report_item(report)
    item['created_at'] = report.created_at
    item['resolved_at'] = report.resolved_at
    item['action_taken'] = report.action_taken
    item['resolution_notes'] = report.resolution_notes
    return item


def mark_report_processed(report_id, admin=None):
    report = Report.objects.filter(id=report_id).first()
    if not report:
        raise ValidationError({'report_id': 'Report not found.'})
    now = timezone.now()
    report.status = Report.Status.RESOLVED
    report.resolved_by = admin
    report.action_taken = 'marked_processed'
    report.resolution_notes = ''
    report.resolved_at = now
    report.updated_at = now
    report.save(update_fields=[
        'status', 'resolved_by', 'action_taken', 'resolution_notes', 'resolved_at', 'updated_at'
    ])
    _sync_counter(report.target_type, report.target_id, report.reason, report.description)
    return get_report_item_detail(report.id)


def mark_report_unprocessed(report_id, admin=None):
    report = Report.objects.filter(id=report_id).first()
    if not report:
        raise ValidationError({'report_id': 'Report not found.'})
    report.status = Report.Status.PENDING
    report.resolved_by = None
    report.action_taken = ''
    report.resolution_notes = ''
    report.resolved_at = None
    report.updated_at = timezone.now()
    report.save(update_fields=[
        'status', 'resolved_by', 'action_taken', 'resolution_notes', 'resolved_at', 'updated_at'
    ])
    _sync_counter(report.target_type, report.target_id, report.reason, report.description)
    return get_report_item_detail(report.id)


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
