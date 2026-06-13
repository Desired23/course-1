import logging
import re

from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError

from courses.models import Course
from systems_settings.services import get_text_setting

from .advisor_catalog import build_catalog_snapshot
from .advisor_messages import sanitize_advisor_messages
from .advisor_payloads import validate_advisor_payload
from .advisor_retrieval import retrieve_courses_for_advisor, validate_retrieval_plan
from .errors import AdvisorUpstreamError
from .models import LearningPath, LearningPathItem
from .provider import (
    GeminiAdvisorProvider,
    extract_json_object,
)
from .runtime import GeminiCircuitBreaker, get_advisor_runtime_config

logger = logging.getLogger(__name__)


MESSAGE_FIELD_PATTERN = re.compile(r'"message"\s*:\s*"((?:\\.|[^"\\])*)"', re.DOTALL)
SUMMARY_FIELD_PATTERN = re.compile(r'"summary"\s*:\s*"((?:\\.|[^"\\])*)"', re.DOTALL)

GEMINI_MODEL_SETTING_KEY = 'learning_path_gemini_model'
ADVISOR_UNAVAILABLE_MESSAGE = 'Chatbot đang bảo trì, vui lòng thử lại sau.'
CLARIFICATION_FALLBACK_MESSAGE = 'Bạn muốn tìm khóa học hoặc thiết kế lộ trình về chủ đề nào?'
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
        raise AdvisorUpstreamError(ADVISOR_UNAVAILABLE_MESSAGE)


def reset_advisor_runtime_state_for_tests():
    _gemini_circuit_breaker.reset()


def _resolve_gemini_model():
    env_model = _normalize_gemini_model(getattr(settings, 'GEMINI_MODEL', None))
    if env_model:
        return env_model

    try:
        model_setting = get_text_setting(GEMINI_MODEL_SETTING_KEY, default='')
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
        raise AdvisorUpstreamError(ADVISOR_UNAVAILABLE_MESSAGE)
    return GeminiAdvisorProvider(
        api_key=gemini_api_key,
        model=_resolve_gemini_model(),
        timeout=runtime.gemini_timeout_seconds,
    )


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


def _question_response(message, advisor_meta=None):
    return {
        'type': 'question',
        'message': message,
        'advisor_meta': advisor_meta or {},
    }


class AdvisorOrchestrator:
    def __init__(self, *, goal_text, weekly_hours=None, messages=None, known_skills=None):
        self.goal_text = goal_text
        self.weekly_hours = weekly_hours
        self.messages = sanitize_advisor_messages(messages)
        self.known_skills = known_skills or []
        self.catalog_snapshot = build_catalog_snapshot()
        if not self.catalog_snapshot:
            raise ValidationError('Catalog does not have any published public courses for advisor use.')

    def _plan_and_retrieve(self, provider):
        raw_plan = provider.plan_retrieval(
            goal_text=self.goal_text,
            weekly_hours=self.weekly_hours,
            messages=self.messages,
            known_skills=self.known_skills,
        )
        retrieval_plan = validate_retrieval_plan(raw_plan)
        source_course_ids = retrieval_plan.get('source_course_ids') or []
        if source_course_ids:
            catalog_by_id = {course['course_id']: course for course in self.catalog_snapshot}
            retrieved_catalog = [
                catalog_by_id[course_id]
                for course_id in source_course_ids
                if course_id in catalog_by_id
            ]
            retrieval_plan['source_course_ids'] = [course['course_id'] for course in retrieved_catalog]
            return retrieval_plan, retrieved_catalog

        retrieved_catalog = retrieve_courses_for_advisor(self.catalog_snapshot, retrieval_plan)
        return retrieval_plan, retrieved_catalog

    def _empty_retrieval_response(self, retrieval_plan):
        query = retrieval_plan.get('query') or ', '.join(retrieval_plan.get('topics') or [])
        if query:
            message = f'Mình chưa tìm thấy khóa học phù hợp với "{query}". Bạn có thể đổi từ khóa hoặc nói rõ hơn mục tiêu học không?'
        else:
            message = 'Mình chưa tìm thấy khóa học phù hợp. Bạn có thể nói rõ hơn chủ đề hoặc mục tiêu muốn học không?'
        return _question_response(
            message,
            {
                'retrieval_plan': retrieval_plan,
                'retrieved_count': 0,
            },
        )

    def _response_context(self):
        _ensure_gemini_circuit_available()
        provider = get_advisor_provider()
        retrieval_plan, retrieved_catalog = self._plan_and_retrieve(provider)

        if retrieval_plan['action'] != 'retrieve_courses':
            message = retrieval_plan.get('message') or CLARIFICATION_FALLBACK_MESSAGE
            return provider, retrieval_plan, retrieved_catalog, _question_response(message)

        if not retrieved_catalog:
            return provider, retrieval_plan, retrieved_catalog, self._empty_retrieval_response(retrieval_plan)

        return provider, retrieval_plan, retrieved_catalog, None

    def _provider_request(self, retrieved_catalog, retrieval_plan):
        return {
            'goal_text': self.goal_text,
            'weekly_hours': self.weekly_hours,
            'messages': self.messages,
            'known_skills': self.known_skills,
            'catalog_snapshot': retrieved_catalog,
            'retrieval_plan': retrieval_plan,
        }

    def _validate_response(self, response, retrieved_catalog, retrieval_plan):
        validated = validate_advisor_payload(response, retrieved_catalog)
        validated['advisor_meta'] = {
            **(validated.get('advisor_meta') or {}),
            'retrieval_plan': retrieval_plan,
            'retrieved_count': len(retrieved_catalog),
        }
        return validated

    def chat(self):
        logger.info('Learning path advisor request started')
        try:
            provider, retrieval_plan, retrieved_catalog, early_response = self._response_context()
            if early_response:
                return early_response

            response = provider.chat(**self._provider_request(retrieved_catalog, retrieval_plan))
            validated = self._validate_response(response, retrieved_catalog, retrieval_plan)
            _record_gemini_success()
            logger.info('Learning path advisor request succeeded')
            return validated
        except (ValidationError, AdvisorUpstreamError):
            raise
        except Exception as exc:
            _record_gemini_failure(exc)
            logger.warning('Learning path advisor request failed: %s', exc)
            raise AdvisorUpstreamError(ADVISOR_UNAVAILABLE_MESSAGE) from exc

    def stream(self):
        logger.info('Learning path advisor stream request started')

        raw_response = ""
        preview_text = ""
        try:
            provider, retrieval_plan, retrieved_catalog, early_response = self._response_context()
            if early_response:
                yield {'event': 'final', 'result': early_response}
                return

            for chunk in provider.stream_chunks(**self._provider_request(retrieved_catalog, retrieval_plan)):
                raw_response += chunk
                next_preview = _extract_preview_text(raw_response)
                if next_preview and next_preview.startswith(preview_text):
                    delta = next_preview[len(preview_text):]
                    if delta:
                        preview_text = next_preview
                        yield {'event': 'delta', 'delta': delta, 'attempt': 1}

            parsed_response = extract_json_object(raw_response)
            validated = self._validate_response(parsed_response, retrieved_catalog, retrieval_plan)
            _record_gemini_success()
            logger.info('Learning path advisor stream request succeeded')
            yield {'event': 'final', 'result': validated}
        except (ValidationError, AdvisorUpstreamError):
            raise
        except Exception as exc:
            _record_gemini_failure(exc)
            logger.warning('Learning path advisor stream failed: %s', exc)
            raise AdvisorUpstreamError(ADVISOR_UNAVAILABLE_MESSAGE) from exc


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
        .prefetch_related('items__course')
        .order_by('-updated_at', '-created_at')
    )


def get_learning_path_for_user(path_id, user):
    try:
        return (
            LearningPath.objects
            .filter(user=user, id=path_id, is_archived=False)
            .prefetch_related('items__course')
            .get()
        )
    except LearningPath.DoesNotExist as exc:
        raise ValidationError('Learning path not found.') from exc


def _available_course_map(course_ids):
    courses = Course.objects.filter(
        id__in=course_ids,
        is_deleted=False,
        is_public=True,
        status=Course.Status.PUBLISHED,
    )
    return {course.id: course for course in courses}


def _create_learning_path_items(path, path_items, course_map, *, validate_items=False, sort_items=False):
    ordered_items = sorted(path_items, key=lambda row: row['order']) if sort_items else path_items
    for item in ordered_items:
        if validate_items:
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


@transaction.atomic
def create_learning_path(*, user, goal_text, summary, estimated_weeks, path_items):
    course_ids = [item['course_id'] for item in path_items]
    course_map = _available_course_map(course_ids)
    if len(course_map) != len(set(course_ids)):
        raise ValidationError('One or more course_id values are invalid or unavailable.')

    path = LearningPath.objects.create(
        user=user,
        goal_text=goal_text,
        summary=summary,
        estimated_weeks=estimated_weeks,
    )
    _create_learning_path_items(path, path_items, course_map, validate_items=True, sort_items=True)

    return path


@transaction.atomic
def update_learning_path_from_advisor(path, advisor_result):
    path.summary = advisor_result['summary']
    path.estimated_weeks = advisor_result['estimated_weeks']
    path.save(update_fields=['summary', 'estimated_weeks', 'updated_at'])

    path.items.all().delete()
    courses = Course.objects.filter(id__in=[item['course_id'] for item in advisor_result['path']])
    course_map = {course.id: course for course in courses}
    _create_learning_path_items(path, advisor_result['path'], course_map)

    path.refresh_from_db()
    return path
