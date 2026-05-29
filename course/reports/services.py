from datetime import datetime, time

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from questions.models import Question
from questions.services import moderate_question
from realtime.models import Message
from realtime.views import _moderate_reported_message
from reviews.models import Review
from reviews.services import moderate_review


def _derive_priority(report_count):
    if report_count >= 5:
        return 'critical'
    if report_count >= 3:
        return 'high'
    if report_count >= 2:
        return 'medium'
    return 'low'


def _normalize_question(question):
    return {
        'id': f'question-{question.id}',
        'reported_type': 'question',
        'reported_id': question.id,
        'report_count': question.report_count,
        'reporter_name': None,
        'reporter_email': None,
        'reported_user_name': question.author.full_name if question.author else None,
        'reported_content_title': question.title,
        'reason': question.last_report_reason or 'question_report',
        'description': question.content,
        'status': 'pending',
        'priority': _derive_priority(question.report_count),
        'created_at': question.last_reported_at or question.updated_at,
        'updated_at': question.updated_at,
        'resolution': None,
        'action_taken': None,
    }


def _normalize_review(review):
    return {
        'id': f'review-{review.id}',
        'reported_type': 'review',
        'reported_id': review.id,
        'report_count': review.report_count,
        'reporter_name': None,
        'reporter_email': None,
        'reported_user_name': review.user.full_name if review.user else None,
        'reported_content_title': review.course.title if review.course else None,
        'reason': review.last_report_reason or 'review_report',
        'description': review.comment or '',
        'status': 'pending',
        'priority': _derive_priority(review.report_count),
        'created_at': review.last_reported_at or review.updated_at,
        'updated_at': review.updated_at,
        'resolution': None,
        'action_taken': None,
    }


def _normalize_message(message):
    return {
        'id': f'message-{message.id}',
        'reported_type': 'message',
        'reported_id': message.id,
        'report_count': message.report_count,
        'reporter_name': None,
        'reporter_email': None,
        'reported_user_name': message.sender.full_name if message.sender else None,
        'reported_content_title': f'Conversation #{message.conversation_id}',
        'reason': message.last_report_reason or 'message_report',
        'description': message.text_content or '[attachment-only message]',
        'status': 'pending',
        'priority': _derive_priority(message.report_count),
        'created_at': message.last_reported_at or message.updated_at,
        'updated_at': message.updated_at,
        'resolution': None,
        'action_taken': None,
    }


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


def get_admin_reports(filters=None):
    filters = filters or {}
    reported_type = filters.get('type')
    status = filters.get('status')
    priority = filters.get('priority')
    search = (filters.get('search') or '').strip().lower()
    date_from, date_to = _to_datetime_range(filters.get('date_from'), filters.get('date_to'))

    if status and status != 'pending':
        return []

    items = []

    if reported_type in (None, '', 'question'):
        questions = Question.objects.filter(
            is_deleted=False,
            report_count__gt=0,
        ).select_related('author')
        items.extend(_normalize_question(q) for q in questions)

    if reported_type in (None, '', 'review'):
        reviews = Review.objects.filter(
            is_deleted=False,
            report_count__gt=0,
        ).select_related('user', 'course')
        items.extend(_normalize_review(review) for review in reviews)

    if reported_type in (None, '', 'message'):
        messages = Message.objects.filter(
            report_count__gt=0,
        ).select_related('sender', 'conversation')
        items.extend(_normalize_message(message) for message in messages)

    if search:
        def matches(item):
            haystacks = [
                item.get('reported_user_name') or '',
                item.get('reported_content_title') or '',
                item.get('reason') or '',
                item.get('description') or '',
            ]
            return any(search in value.lower() for value in haystacks)

        items = [item for item in items if matches(item)]

    if priority:
        items = [item for item in items if item['priority'] == priority]

    if date_from:
        items = [item for item in items if item['created_at'] and item['created_at'] >= date_from]
    if date_to:
        items = [item for item in items if item['created_at'] and item['created_at'] <= date_to]

    items.sort(key=lambda item: item['created_at'] or timezone.now(), reverse=True)
    return items


def resolve_admin_report(reported_type, reported_id, action, reason=''):
    if reported_type == 'question':
        return moderate_question(reported_id, action, reason)
    if reported_type == 'review':
        return moderate_review(reported_id, action, reason)
    if reported_type == 'message':
        return _moderate_reported_message(reported_id, action, reason)
    raise ValueError('Unsupported reported_type')
