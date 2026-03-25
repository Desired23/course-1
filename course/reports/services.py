from datetime import datetime, time

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from forum_topics.models import ForumTopic
from forum_topics.services import moderate_forum_topic
from qnas.models import QnA
from qnas.services import moderate_qna
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


def _normalize_forum_topic(topic):
    return {
        'id': f'forum_post-{topic.id}',
        'reported_type': 'forum_post',
        'reported_id': topic.id,
        'report_count': topic.report_count,
        'reporter_name': None,
        'reporter_email': None,
        'reported_user_name': topic.user.full_name if topic.user else None,
        'reported_content_title': topic.title,
        'reason': topic.last_report_reason or 'forum_report',
        'description': topic.content,
        'status': 'pending',
        'priority': _derive_priority(topic.report_count),
        'created_at': topic.last_reported_at or topic.updated_at,
        'updated_at': topic.updated_at,
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


def _normalize_qna(qna):
    return {
        'id': f'qa_question-{qna.id}',
        'reported_type': 'qa_question',
        'reported_id': qna.id,
        'report_count': qna.report_count,
        'reporter_name': None,
        'reporter_email': None,
        'reported_user_name': qna.user.full_name if qna.user else None,
        'reported_content_title': qna.course.title if qna.course else qna.question[:80],
        'reason': qna.last_report_reason or 'qna_report',
        'description': qna.question,
        'status': 'pending',
        'priority': _derive_priority(qna.report_count),
        'created_at': qna.last_reported_at or qna.updated_at,
        'updated_at': qna.updated_at,
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

    if reported_type in (None, '', 'forum_post'):
        topics = ForumTopic.objects.filter(
            is_deleted=False,
            report_count__gt=0,
        ).select_related('user', 'forum')
        items.extend(_normalize_forum_topic(topic) for topic in topics)

    if reported_type in (None, '', 'review'):
        reviews = Review.objects.filter(
            is_deleted=False,
            report_count__gt=0,
        ).select_related('user', 'course')
        items.extend(_normalize_review(review) for review in reviews)

    if reported_type in (None, '', 'qa_question'):
        qnas = QnA.objects.filter(
            is_deleted=False,
            report_count__gt=0,
        ).select_related('user', 'course', 'lesson')
        items.extend(_normalize_qna(qna) for qna in qnas)

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
    if reported_type == 'forum_post':
        return moderate_forum_topic(reported_id, action, reason)
    if reported_type == 'review':
        return moderate_review(reported_id, action, reason)
    if reported_type == 'qa_question':
        return moderate_qna(reported_id, action, reason)
    if reported_type == 'message':
        return _moderate_reported_message(reported_id, action, reason)
    raise ValueError('Unsupported reported_type')
