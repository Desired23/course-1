import logging
import re
from collections import Counter

from django.conf import settings
from django.db import transaction
from django.db.models import Prefetch
from rest_framework.exceptions import ValidationError

from courses.models import Course
from coursemodules.models import CourseModule
from lessons.models import Lesson
from systems_settings.models import SystemsSetting

from .errors import AdvisorUpstreamError
from .models import LearningPath, LearningPathItem, PathConversation
from .provider import (
    GeminiAdvisorProvider,
    extract_json_object,
)
from .runtime import GeminiCircuitBreaker, get_advisor_runtime_config

logger = logging.getLogger(__name__)


MESSAGE_FIELD_PATTERN = re.compile(r'"message"\s*:\s*"((?:\\.|[^"\\])*)"', re.DOTALL)
SUMMARY_FIELD_PATTERN = re.compile(r'"summary"\s*:\s*"((?:\\.|[^"\\])*)"', re.DOTALL)

GEMINI_MODEL_SETTING_KEY = 'learning_path_gemini_model'
_gemini_circuit_breaker = GeminiCircuitBreaker()
LEGACY_GEMINI_MODEL_ALIASES = {
    'gemini-2.0-flash': 'gemini-2.5-flash',
}


def _is_upstream_overloaded_error(exc):
    message = f"{exc}".lower()
    overload_signals = (
        "503",
        "unavailable",
        "resource_exhausted",
        "high demand",
        "temporarily unavailable",
    )
    return any(signal in message for signal in overload_signals)


def _record_gemini_success():
    _gemini_circuit_breaker.record_success()


def _record_gemini_failure(exc):
    if not _is_upstream_overloaded_error(exc):
        return

    runtime = get_advisor_runtime_config()
    _gemini_circuit_breaker.record_overload_failure(
        threshold=runtime.gemini_circuit_threshold,
        cooldown_seconds=runtime.gemini_circuit_cooldown_seconds,
    )


def _ensure_gemini_circuit_available():
    if _gemini_circuit_breaker.is_open():
        raise AdvisorUpstreamError('Chatbot đang bảo trì, vui lòng thử lại sau.')


def reset_advisor_runtime_state_for_tests():
    _gemini_circuit_breaker.reset()


def _resolve_gemini_model():
    env_model = _normalize_gemini_model(getattr(settings, 'GEMINI_MODEL', None))


    if env_model:
        return env_model

    try:
        model_setting = (
            SystemsSetting.objects
            .filter(setting_key=GEMINI_MODEL_SETTING_KEY, is_deleted=False)
            .values_list('setting_value', flat=True)
            .first()
        )
    except Exception as exc:
        logger.warning('Could not read systems setting %s: %s', GEMINI_MODEL_SETTING_KEY, exc)
        return _normalize_gemini_model(get_advisor_runtime_config().gemini_model)

    configured_model = _normalize_gemini_model(model_setting)
    if configured_model:
        return configured_model

    return _normalize_gemini_model(get_advisor_runtime_config().gemini_model)


def _normalize_gemini_model(raw_model):
    model = (raw_model or '').strip()
    if not model:
        return ''

    if model.lower().startswith('models/'):
        model = model.split('/', 1)[1].strip()

    mapped_model = LEGACY_GEMINI_MODEL_ALIASES.get(model.lower())
    if mapped_model:
        logger.warning('Deprecated Gemini model configured (%s). Auto-mapping to %s.', model, mapped_model)
        return mapped_model
    return model


def get_advisor_provider():
    runtime = get_advisor_runtime_config()
    gemini_api_key = runtime.gemini_api_key
    if not gemini_api_key:
        raise AdvisorUpstreamError('Chatbot đang bảo trì, vui lòng thử lại sau.')
    return GeminiAdvisorProvider(
        api_key=gemini_api_key,
        model=_resolve_gemini_model(),
        timeout=runtime.gemini_timeout_seconds,
    )


def build_catalog_snapshot():
    lesson_queryset = Lesson.objects.filter(is_deleted=False).only('id', 'coursemodule_id', 'content_type')
    module_queryset = CourseModule.objects.filter(is_deleted=False).prefetch_related(
        Prefetch('lessons', queryset=lesson_queryset)
    )

    courses = (
        Course.objects
        .filter(is_deleted=False, is_public=True, status=Course.Status.PUBLISHED)
        .select_related('category', 'subcategory', 'instructor__user')
        .prefetch_related(Prefetch('modules', queryset=module_queryset))
        .order_by('title')
    )
    snapshot = []
    for course in courses:
        module_count = 0
        lesson_count_by_type = Counter()
        total_lessons = 0

        for module in course.modules.all():
            module_count += 1
            for lesson in module.lessons.all():
                total_lessons += 1
                lesson_count_by_type[str(lesson.content_type or '').lower()] += 1

        total_quizzes = lesson_count_by_type.get('quiz', 0)
        coding_count = lesson_count_by_type.get('code', 0)

        snapshot.append({
            'course_id': course.id,
            'title': course.title,
            'shortdescription': course.shortdescription or '',
            'description': course.description or '',
            'level': course.level,
            'course_price': str(course.price),
            'course_discount_price': str(course.discount_price) if course.discount_price is not None else None,
            'course_discount_start_date': course.discount_start_date.isoformat() if course.discount_start_date else None,
            'course_discount_end_date': course.discount_end_date.isoformat() if course.discount_end_date else None,
            'duration_hours': round(course.duration / 60, 2) if course.duration is not None else None,
            'language': course.language or '',
            'rating': str(course.rating),
            'total_students': course.total_students,
            'has_certificate': course.certificate,
            'instructor_name': (
                course.instructor.user.full_name
                if course.instructor and course.instructor.user
                else ''
            ),
            'target_audience': course.target_audience or [],
            'learning_objectives': course.learning_objectives or [],
            'tags': course.tags or [],
            'category_name': course.category.name if course.category else '',
            'subcategory_name': course.subcategory.name if course.subcategory else '',
            'total_modules': module_count,
            'total_lessons': total_lessons,
            'lesson_count_by_type': dict(lesson_count_by_type),
            'total_quizzes': total_quizzes,
            'exercise_count': coding_count,
            'has_coding_exercises': coding_count > 0,
        })
    return snapshot


def validate_advisor_payload(payload, catalog_snapshot):
    if payload.get('type') != 'path':
        payload['advisor_meta'] = payload.get('advisor_meta') or {}
        return payload

    catalog_by_id = {course['course_id']: course for course in catalog_snapshot}
    path = payload.get('path') or []
    if not path:
        raise ValidationError('Advisor returned an empty learning path.')

    expected_order = 1
    validated_path = []
    for item in path:
        course_id = item.get('course_id')
        if course_id not in catalog_by_id:
            raise ValidationError(f'Advisor returned invalid course_id: {course_id}')
        course = catalog_by_id[course_id]
        if item.get('order') != expected_order:
            raise ValidationError('Advisor path order must be continuous starting from 1.')
        if item.get('is_skippable') and not item.get('skippable_reason'):
            raise ValidationError('Skippable items must include skippable_reason.')
        validated_path.append({
            'course_id': course_id,
            'order': expected_order,
            'reason': item.get('reason') or 'Khóa học này được chọn vì phù hợp với mục tiêu hiện tại.',
            'is_skippable': bool(item.get('is_skippable')),
            'skippable_reason': item.get('skippable_reason') or None,
            'course_title': course.get('title'),
            'course_level': course.get('level'),
            'course_price': course.get('course_price'),
            'course_discount_price': course.get('course_discount_price'),
            'course_discount_start_date': course.get('course_discount_start_date'),
            'course_discount_end_date': course.get('course_discount_end_date'),
            'duration_hours': course.get('duration_hours'),
            '_estimated_weeks': int(item.get('_estimated_weeks') or 1),
        })
        expected_order += 1

    payload['path'] = validated_path
    payload['estimated_weeks'] = int(payload.get('estimated_weeks') or sum(item['_estimated_weeks'] for item in validated_path))
    payload['summary'] = (payload.get('summary') or '').strip()
    payload['advisor_meta'] = payload.get('advisor_meta') or {}
    return payload


def sanitize_advisor_messages(messages):
    normalized = []
    for message in messages or []:
        if not isinstance(message, dict):
            continue
        role = message.get('role')
        content = (message.get('content') or '').strip()
        if role not in {'user', 'assistant'} or not content:
            continue
        normalized.append({'role': role, 'content': content})
    return normalized


def merge_advisor_messages(existing_messages, incoming_messages):
    existing = sanitize_advisor_messages(existing_messages)
    incoming = sanitize_advisor_messages(incoming_messages)

    if not existing:
        return incoming
    if not incoming:
        return existing

    max_overlap = min(len(existing), len(incoming))
    for overlap in range(max_overlap, 0, -1):
        if existing[-overlap:] == incoming[:overlap]:
            return existing + incoming[overlap:]

    if incoming[: len(existing)] == existing:
        return incoming
    if existing[: len(incoming)] == incoming:
        return existing

    merged = list(existing)
    for message in incoming:
        if merged and merged[-1] == message:
            continue
        merged.append(message)
    return merged


def build_path_assistant_message(advisor_result):
    summary = (advisor_result.get('summary') or '').strip()
    if summary:
        return summary

    if advisor_result.get('path'):
        return 'Mình đã cập nhật lộ trình theo thông tin mới nhất từ hội thoại của bạn.'
    return ''


def upsert_path_conversation(path, messages, advisor_meta=None):
    conversation, _ = PathConversation.objects.get_or_create(
        path=path,
        defaults={'messages': sanitize_advisor_messages(messages), 'advisor_meta': advisor_meta or {}},
    )
    conversation.messages = sanitize_advisor_messages(messages)
    if advisor_meta is not None:
        conversation.advisor_meta = advisor_meta
        conversation.save(update_fields=['messages', 'advisor_meta', 'updated_at'])
    else:
        conversation.save(update_fields=['messages', 'updated_at'])
    return conversation


@transaction.atomic
def create_advisor_draft_path(*, user, goal_text, summary='', estimated_weeks=0, messages=None, advisor_meta=None):
    path = LearningPath.objects.create(
        user=user,
        goal_text=goal_text,
        summary=summary or '',
        estimated_weeks=max(0, int(estimated_weeks or 0)),
    )
    PathConversation.objects.create(
        path=path,
        messages=sanitize_advisor_messages(messages),
        advisor_meta=advisor_meta or {},
    )
    return path


def _extract_preview_text(partial_json_text):
    for pattern in (MESSAGE_FIELD_PATTERN, SUMMARY_FIELD_PATTERN):
        match = pattern.search(partial_json_text)
        if not match:
            continue
        escaped_value = match.group(1)
        try:
            return f'"{escaped_value}"'.encode('utf-8').decode('unicode_escape').strip('"')
        except Exception:
            return escaped_value.replace('\\n', '\n').replace('\\"', '"')
    return ""


class AdvisorOrchestrator:
    def __init__(self, *, goal_text, weekly_hours=None, messages=None, known_skills=None):
        self.goal_text = goal_text
        self.weekly_hours = weekly_hours
        self.messages = sanitize_advisor_messages(messages)
        self.known_skills = known_skills or []
        self.catalog_snapshot = build_catalog_snapshot()
        if not self.catalog_snapshot:
            raise ValidationError('Catalog does not have any published public courses for advisor use.')
        self.provider = get_advisor_provider()

    def chat(self):
        logger.info('Learning path advisor request started')
        try:
            _ensure_gemini_circuit_available()
            response = self.provider.chat(
                goal_text=self.goal_text,
                weekly_hours=self.weekly_hours,
                messages=self.messages,
                known_skills=self.known_skills,
                catalog_snapshot=self.catalog_snapshot,
            )
            validated = validate_advisor_payload(response, self.catalog_snapshot)
            _record_gemini_success()
            logger.info('Learning path advisor request succeeded')
            return validated
        except (ValidationError, AdvisorUpstreamError):
            raise
        except Exception as exc:
            _record_gemini_failure(exc)
            logger.warning('Learning path advisor request failed: %s', exc)
            raise AdvisorUpstreamError('Chatbot đang bảo trì, vui lòng thử lại sau.') from exc

    def stream(self):
        logger.info('Learning path advisor stream request started')
        _ensure_gemini_circuit_available()

        raw_response = ""
        preview_text = ""
        try:
            for chunk in self.provider.stream_chunks(
                goal_text=self.goal_text,
                weekly_hours=self.weekly_hours,
                messages=self.messages,
                known_skills=self.known_skills,
                catalog_snapshot=self.catalog_snapshot,
            ):
                raw_response += chunk
                next_preview = _extract_preview_text(raw_response)
                if next_preview and next_preview.startswith(preview_text):
                    delta = next_preview[len(preview_text):]
                    if delta:
                        preview_text = next_preview
                        yield {'event': 'delta', 'delta': delta, 'attempt': 1}

            parsed_response = extract_json_object(raw_response)
            validated = validate_advisor_payload(parsed_response, self.catalog_snapshot)
            _record_gemini_success()
            logger.info('Learning path advisor stream request succeeded')
            yield {'event': 'final', 'result': validated}
        except (ValidationError, AdvisorUpstreamError):
            raise
        except Exception as exc:
            _record_gemini_failure(exc)
            logger.warning('Learning path advisor stream failed: %s', exc)
            raise AdvisorUpstreamError('Chatbot đang bảo trì, vui lòng thử lại sau.') from exc


def advisor_chat_stream(*, goal_text, weekly_hours=None, messages=None, known_skills=None):
    orchestrator = AdvisorOrchestrator(
        goal_text=goal_text,
        weekly_hours=weekly_hours,
        messages=messages,
        known_skills=known_skills,
    )
    yield from orchestrator.stream()


def advisor_chat(*, goal_text, weekly_hours=None, messages=None, known_skills=None):
    orchestrator = AdvisorOrchestrator(
        goal_text=goal_text,
        weekly_hours=weekly_hours,
        messages=messages,
        known_skills=known_skills,
    )
    return orchestrator.chat()


def get_learning_paths_for_user(user):
    return (
        LearningPath.objects
        .filter(user=user, is_archived=False)
        .prefetch_related('items__course', 'conversation')
        .order_by('-updated_at', '-created_at')
    )


def get_learning_path_for_user(path_id, user):
    try:
        return (
            LearningPath.objects
            .filter(user=user, id=path_id, is_archived=False)
            .prefetch_related('items__course', 'conversation')
            .get()
        )
    except LearningPath.DoesNotExist as exc:
        raise ValidationError('Learning path not found.') from exc



@transaction.atomic
def create_learning_path(*, user, goal_text, summary, estimated_weeks, path_items, messages=None, advisor_meta=None):
    course_ids = [item['course_id'] for item in path_items]
    courses = Course.objects.filter(
        id__in=course_ids,
        is_deleted=False,
        is_public=True,
        status=Course.Status.PUBLISHED,
    )
    course_map = {course.id: course for course in courses}
    if len(course_map) != len(set(course_ids)):
        raise ValidationError('One or more course_id values are invalid or unavailable.')

    path = LearningPath.objects.create(
        user=user,
        goal_text=goal_text,
        summary=summary,
        estimated_weeks=estimated_weeks,
    )
    for item in sorted(path_items, key=lambda row: row['order']):
        if item['order'] < 1:
            raise ValidationError('Path item order must be >= 1.')
        if item.get('is_skippable') and not item.get('skippable_reason'):
            raise ValidationError('Skippable items must include skippable_reason.')
        LearningPathItem.objects.create(
            path=path,
            course=course_map[item['course_id']],
            order=item['order'],
            reason=item['reason'],
            is_skippable=bool(item.get('is_skippable')),
            skippable_reason=item.get('skippable_reason') or '',
        )

    PathConversation.objects.create(path=path, messages=messages or [], advisor_meta=advisor_meta or {})
    return path


@transaction.atomic
def update_learning_path_from_advisor(path, advisor_result, messages):
    path.summary = advisor_result['summary']
    path.estimated_weeks = advisor_result['estimated_weeks']
    path.save(update_fields=['summary', 'estimated_weeks', 'updated_at'])

    path.items.all().delete()
    courses = Course.objects.filter(id__in=[item['course_id'] for item in advisor_result['path']])
    course_map = {course.id: course for course in courses}
    for item in advisor_result['path']:
        LearningPathItem.objects.create(
            path=path,
            course=course_map[item['course_id']],
            order=item['order'],
            reason=item['reason'],
            is_skippable=item['is_skippable'],
            skippable_reason=item.get('skippable_reason') or '',
        )

    updated_messages = sanitize_advisor_messages(messages)
    assistant_message = build_path_assistant_message(advisor_result)
    if assistant_message:
        updated_messages = merge_advisor_messages(
            updated_messages,
            [{'role': 'assistant', 'content': assistant_message}],
        )

    conversation, _ = PathConversation.objects.get_or_create(
        path=path,
        defaults={'messages': updated_messages, 'advisor_meta': advisor_result.get('advisor_meta') or {}},
    )
    conversation.messages = updated_messages
    conversation.advisor_meta = advisor_result.get('advisor_meta') or {}
    conversation.save(update_fields=['messages', 'advisor_meta', 'updated_at'])
    path.refresh_from_db()
    return path
