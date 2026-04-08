import logging
import re

from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError

from courses.models import Course
from systems_settings.models import SystemsSetting

from .errors import AdvisorUpstreamError
from .models import LearningPath, LearningPathItem, PathConversation
from .provider import GeminiAdvisorProvider, RuleBasedAdvisorProvider, extract_json_object
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


def _ensure_gemini_circuit_available(require_gemini):
    if not _gemini_circuit_breaker.is_open():
        return

    if require_gemini:
        raise AdvisorUpstreamError('Gemini temporarily unavailable (circuit breaker open).')

    raise AdvisorUpstreamError('Gemini temporarily unavailable, switching to fallback (circuit breaker open).')


def reset_advisor_runtime_state_for_tests():
    _gemini_circuit_breaker.reset()


def _resolve_gemini_model():
    env_model = _normalize_gemini_model(getattr(settings, 'GEMINI_MODEL', None))

    # .env/runtime model has highest priority for local/dev operability.
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
    provider_name = runtime.provider_mode
    gemini_api_key = runtime.gemini_api_key
    fallback_provider = RuleBasedAdvisorProvider()
    if provider_name in {'auto', 'gemini'} and gemini_api_key:
        return GeminiAdvisorProvider(
            api_key=gemini_api_key,
            model=_resolve_gemini_model(),
            timeout=runtime.gemini_timeout_seconds,
            fallback_provider=fallback_provider,
        )
    return fallback_provider


def is_gemini_required():
    return get_advisor_runtime_config().force_gemini


def build_catalog_snapshot():
    courses = (
        Course.objects
        .filter(is_deleted=False, is_public=True, status=Course.Status.PUBLISHED)
        .select_related('category', 'subcategory')
        .order_by('title')
    )
    snapshot = []
    for course in courses:
        snapshot.append({
            'course_id': course.id,
            'title': course.title,
            'description': course.description or '',
            'level': course.level,
            'course_price': str(course.price),
            'course_discount_price': str(course.discount_price) if course.discount_price is not None else None,
            'course_discount_start_date': course.discount_start_date.isoformat() if course.discount_start_date else None,
            'course_discount_end_date': course.discount_end_date.isoformat() if course.discount_end_date else None,
            'duration_hours': round(course.duration / 60, 2) if course.duration is not None else None,
            'skills_taught': course.skills_taught or [],
            'prerequisites': course.prerequisites or [],
            'target_audience': course.target_audience or [],
            'tags': course.tags or [],
            'category_name': course.category.name if course.category else '',
            'subcategory_name': course.subcategory.name if course.subcategory else '',
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
            'skills_taught': course.get('skills_taught') or [],
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


def run_rule_based_fallback(*, goal_text, weekly_hours, messages, known_skills, catalog_snapshot, reason):
    logger.warning('Learning path advisor falling back to rule-based provider: %s', reason)
    fallback_provider = RuleBasedAdvisorProvider()
    fallback_response = fallback_provider.chat(
        goal_text=goal_text,
        weekly_hours=weekly_hours,
        messages=messages or [],
        known_skills=known_skills or [],
        catalog_snapshot=catalog_snapshot,
    )
    fallback_meta = fallback_response.get('advisor_meta') or {}
    fallback_response['advisor_meta'] = {
        **fallback_meta,
        'provider_used': 'rule_based',
        'fallback_triggered': True,
        'fallback_reason': reason,
        'fallback_provider': 'rule_based',
    }
    return validate_advisor_payload(fallback_response, catalog_snapshot)


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
        self.provider_name = self.provider.__class__.__name__
        self.require_gemini = is_gemini_required()
        self.max_attempts = get_advisor_runtime_config().gemini_max_attempts

        if self.require_gemini and not isinstance(self.provider, GeminiAdvisorProvider):
            raise ValidationError('Gemini is required but not configured. Please set a valid GEMINI_API_KEY.')

    def _call_provider_chat(self):
        return self.provider.chat(
            goal_text=self.goal_text,
            weekly_hours=self.weekly_hours,
            messages=self.messages,
            known_skills=self.known_skills,
            catalog_snapshot=self.catalog_snapshot,
        )

    def _enrich_meta(self, response, *, attempt, fallback_triggered):
        existing_meta = response.get('advisor_meta') or {}
        response['advisor_meta'] = {
            **existing_meta,
            'provider_used': existing_meta.get('provider_used') or ('rule_based' if fallback_triggered else 'gemini'),
            'model': existing_meta.get('model') or getattr(self.provider, 'model', ''),
            'attempt_count': attempt,
            'max_attempts': self.max_attempts,
            'fallback_triggered': fallback_triggered,
        }
        if fallback_triggered and not self.require_gemini:
            response['advisor_meta']['fallback_provider'] = existing_meta.get('fallback_provider') or 'rule_based'
        return response

    def _validate_rule_based_response(self):
        response = self._call_provider_chat()
        response['advisor_meta'] = {
            **(response.get('advisor_meta') or {}),
            'provider_used': 'rule_based',
            'attempt_count': 1,
            'max_attempts': 1,
            'fallback_triggered': False,
        }
        return validate_advisor_payload(response, self.catalog_snapshot)

    def chat(self):
        logger.info('Learning path advisor request started with provider=%s', self.provider_name)
        if not isinstance(self.provider, GeminiAdvisorProvider):
            validated = self._validate_rule_based_response()
            logger.info('Learning path advisor request succeeded with provider=%s', self.provider_name)
            return validated

        _ensure_gemini_circuit_available(self.require_gemini)
        last_error = None
        for attempt in range(1, self.max_attempts + 1):
            response = self._call_provider_chat()
            fallback_triggered = bool((response.get('advisor_meta') or {}).get('fallback_triggered'))
            self._enrich_meta(response, attempt=attempt, fallback_triggered=fallback_triggered)
            if fallback_triggered:
                _record_gemini_failure((response.get('advisor_meta') or {}).get('fallback_reason') or 'gemini_fallback_triggered')
                if self.require_gemini:
                    raise AdvisorUpstreamError(
                        (response.get('advisor_meta') or {}).get('fallback_reason')
                        or 'Gemini request failed while strict Gemini mode is enabled.'
                    )
            try:
                validated = validate_advisor_payload(response, self.catalog_snapshot)
                _record_gemini_success()
                logger.info('Learning path advisor request succeeded with provider=%s attempt=%s', self.provider_name, attempt)
                return validated
            except ValidationError as exc:
                last_error = exc
                logger.warning(
                    'Learning path advisor returned invalid payload from provider=%s attempt=%s error=%s',
                    self.provider_name,
                    attempt,
                    exc,
                )

        if self.require_gemini:
            raise AdvisorUpstreamError(f'Gemini validation failed: {last_error}')

        return run_rule_based_fallback(
            goal_text=self.goal_text,
            weekly_hours=self.weekly_hours,
            messages=self.messages,
            known_skills=self.known_skills,
            catalog_snapshot=self.catalog_snapshot,
            reason=f'gemini_validation_failed: {last_error}',
        )

    def stream(self):
        logger.info('Learning path advisor stream request started with provider=%s', self.provider_name)
        if not isinstance(self.provider, GeminiAdvisorProvider):
            validated = self._validate_rule_based_response()
            preview = (validated.get('message') or validated.get('summary') or '').strip()
            if preview:
                yield {'event': 'delta', 'delta': preview, 'attempt': 1}
            yield {'event': 'final', 'result': validated}
            return

        try:
            _ensure_gemini_circuit_available(self.require_gemini)
        except AdvisorUpstreamError as exc:
            if self.require_gemini:
                raise
            fallback_result = run_rule_based_fallback(
                goal_text=self.goal_text,
                weekly_hours=self.weekly_hours,
                messages=self.messages,
                known_skills=self.known_skills,
                catalog_snapshot=self.catalog_snapshot,
                reason=f'gemini_circuit_open: {exc}',
            )
            fallback_preview = (fallback_result.get('message') or fallback_result.get('summary') or '').strip()
            if fallback_preview:
                yield {'event': 'delta', 'delta': fallback_preview, 'attempt': 1}
            yield {'event': 'final', 'result': fallback_result}
            return

        last_error = None
        consecutive_overload_errors = 0
        for attempt in range(1, self.max_attempts + 1):
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
                            yield {'event': 'delta', 'delta': delta, 'attempt': attempt}

                parsed_response = extract_json_object(raw_response)
                fallback_triggered = bool((parsed_response.get('advisor_meta') or {}).get('fallback_triggered'))
                self._enrich_meta(parsed_response, attempt=attempt, fallback_triggered=fallback_triggered)
                if fallback_triggered and self.require_gemini:
                    raise ValidationError(
                        (parsed_response.get('advisor_meta') or {}).get('fallback_reason')
                        or 'Gemini request failed while strict Gemini mode is enabled.'
                    )

                validated = validate_advisor_payload(parsed_response, self.catalog_snapshot)
                _record_gemini_success()
                logger.info('Learning path advisor stream request succeeded with provider=%s attempt=%s', self.provider_name, attempt)
                yield {'event': 'final', 'result': validated}
                return
            except ValidationError as exc:
                last_error = exc
                logger.warning(
                    'Learning path advisor stream returned invalid payload from provider=%s attempt=%s error=%s',
                    self.provider_name,
                    attempt,
                    exc,
                )
            except Exception as exc:
                last_error = exc
                _record_gemini_failure(exc)
                if _is_upstream_overloaded_error(exc):
                    consecutive_overload_errors += 1
                else:
                    consecutive_overload_errors = 0
                logger.warning(
                    'Learning path advisor stream failed from provider=%s attempt=%s error=%s',
                    self.provider_name,
                    attempt,
                    exc,
                )

                if not self.require_gemini and consecutive_overload_errors >= 2:
                    logger.warning(
                        'Learning path advisor stream triggering fail-fast fallback after consecutive overload errors provider=%s attempt=%s',
                        self.provider_name,
                        attempt,
                    )
                    break

        if self.require_gemini:
            raise AdvisorUpstreamError(f'Gemini stream failed: {last_error}')

        fallback_result = run_rule_based_fallback(
            goal_text=self.goal_text,
            weekly_hours=self.weekly_hours,
            messages=self.messages,
            known_skills=self.known_skills,
            catalog_snapshot=self.catalog_snapshot,
            reason=f'gemini_stream_failed: {last_error}',
        )
        fallback_preview = (fallback_result.get('message') or fallback_result.get('summary') or '').strip()
        if fallback_preview:
            yield {'event': 'delta', 'delta': fallback_preview, 'attempt': self.max_attempts}
        yield {'event': 'final', 'result': fallback_result}


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


def get_learning_path_for_admin(path_id):
    try:
        return (
            LearningPath.objects
            .filter(id=path_id)
            .select_related('user', 'conversation')
            .prefetch_related('items__course')
            .get()
        )
    except LearningPath.DoesNotExist as exc:
        raise ValidationError('Learning path not found.') from exc


def get_learning_path_advisor_stats(limit=10, provider=None, fallback_only=False):
    paths = (
        LearningPath.objects
        .select_related('user', 'conversation')
        .prefetch_related('items__course')
        .order_by('-updated_at', '-created_at')
    )

    total_paths = 0
    gemini_paths = 0
    rule_based_paths = 0
    fallback_paths = 0
    attempt_sum = 0
    recent_paths = []

    for path in paths:
        advisor_meta = {}
        if hasattr(path, 'conversation') and path.conversation:
            advisor_meta = path.conversation.advisor_meta or {}

        provider_used = advisor_meta.get('provider_used') or 'unknown'
        fallback_triggered = bool(advisor_meta.get('fallback_triggered'))
        attempt_count = int(advisor_meta.get('attempt_count') or 1)

        if provider and provider_used != provider:
            continue
        if fallback_only and not fallback_triggered:
            continue

        total_paths += 1
        attempt_sum += attempt_count

        if provider_used == 'gemini':
            gemini_paths += 1
        elif provider_used == 'rule_based':
            rule_based_paths += 1

        if fallback_triggered:
            fallback_paths += 1

        if len(recent_paths) < limit:
            recent_paths.append({
                'id': path.id,
                'user_id': path.user_id,
                'user_name': getattr(path.user, 'full_name', '') or getattr(path.user, 'username', ''),
                'goal_text': path.goal_text,
                'summary': path.summary,
                'estimated_weeks': path.estimated_weeks,
                'is_archived': path.is_archived,
                'course_count': path.items.count(),
                'updated_at': path.updated_at,
                'advisor_meta': advisor_meta,
            })

    return {
        'total_paths': total_paths,
        'gemini_paths': gemini_paths,
        'rule_based_paths': rule_based_paths,
        'fallback_paths': fallback_paths,
        'fallback_rate': round((fallback_paths / total_paths) * 100, 2) if total_paths else 0,
        'average_attempt_count': round(attempt_sum / total_paths, 2) if total_paths else 0,
        'recent_paths': recent_paths,
    }


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
