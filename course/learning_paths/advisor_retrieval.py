import re
import unicodedata
from decimal import Decimal, InvalidOperation

from rest_framework.exceptions import ValidationError

from courses.models import Course


TOKEN_PATTERN = re.compile(r'[a-z0-9]+')

ALLOWED_PLAN_ACTIONS = {'retrieve_courses', 'ask_clarification', 'unsupported'}
ALLOWED_RESPONSE_TYPES = {'course_list', 'path', 'comparison', 'answer'}
ALLOWED_SORTS = {'relevance', 'popular', 'rating', 'price_asc', 'price_desc'}
ALLOWED_LEVELS = {
    Course.Level.BEGINNER,
    Course.Level.INTERMEDIATE,
    Course.Level.ADVANCED,
    Course.Level.ALL_LEVELS,
}
DEFAULT_RETRIEVAL_LIMIT = 20
MAX_RETRIEVAL_LIMIT = 40


def normalize_search_text(value):
    text = str(value or '').replace('đ', 'd').replace('Đ', 'D')
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(char for char in text if not unicodedata.combining(char))
    return text.lower()


def _tokens(value):
    return TOKEN_PATTERN.findall(normalize_search_text(value))


def _decimal_or_none(value):
    if value in (None, ''):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _course_effective_price(course):
    discount_price = _decimal_or_none(course.get('course_discount_price'))
    if discount_price is not None:
        return discount_price
    return _decimal_or_none(course.get('course_price')) or Decimal('0')


def _course_rating(course):
    return _decimal_or_none(course.get('rating')) or Decimal('0')


def _course_text(course):
    values = [
        course.get('title'),
        course.get('shortdescription'),
        course.get('description'),
        course.get('level'),
        course.get('language'),
        course.get('instructor_name'),
        course.get('category_name'),
        course.get('subcategory_name'),
        course.get('tags'),
        course.get('target_audience'),
        course.get('learning_objectives'),
    ]
    flat = []
    for value in values:
        if isinstance(value, (list, tuple, set)):
            flat.extend(str(item) for item in value)
        else:
            flat.append(str(value or ''))
    return normalize_search_text(' '.join(flat))


def validate_retrieval_plan(plan):
    if not isinstance(plan, dict):
        raise ValidationError('Advisor returned an invalid retrieval plan.')

    action = plan.get('action')
    if action not in ALLOWED_PLAN_ACTIONS:
        action = 'ask_clarification'

    response_type = plan.get('response_type')
    if response_type not in ALLOWED_RESPONSE_TYPES:
        response_type = 'course_list'

    raw_filters = plan.get('filters') if isinstance(plan.get('filters'), dict) else {}
    levels = [
        level for level in (raw_filters.get('levels') or [])
        if level in ALLOWED_LEVELS
    ]

    limit = plan.get('limit') or DEFAULT_RETRIEVAL_LIMIT
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = DEFAULT_RETRIEVAL_LIMIT
    limit = max(5, min(limit, MAX_RETRIEVAL_LIMIT))

    min_rating = raw_filters.get('min_rating')
    try:
        min_rating = float(min_rating) if min_rating not in (None, '') else None
    except (TypeError, ValueError):
        min_rating = None

    max_price = raw_filters.get('max_effective_price')
    try:
        max_price = float(max_price) if max_price not in (None, '') else None
    except (TypeError, ValueError):
        max_price = None

    sort = plan.get('sort')
    if sort not in ALLOWED_SORTS:
        sort = 'relevance'

    source_course_ids = []
    for raw_id in plan.get('source_course_ids') or []:
        try:
            course_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        if course_id > 0 and course_id not in source_course_ids:
            source_course_ids.append(course_id)
        if len(source_course_ids) >= MAX_RETRIEVAL_LIMIT:
            break

    return {
        'action': action,
        'response_type': response_type,
        'query': str(plan.get('query') or '').strip()[:160],
        'topics': [
            str(topic).strip()[:60]
            for topic in (plan.get('topics') or [])
            if str(topic or '').strip()
        ][:12],
        'filters': {
            'levels': levels,
            'language': str(raw_filters.get('language') or '').strip()[:50] or None,
            'max_effective_price': max_price,
            'min_rating': min_rating,
            'has_certificate': raw_filters.get('has_certificate') if isinstance(raw_filters.get('has_certificate'), bool) else None,
            'free_only': bool(raw_filters.get('free_only')),
        },
        'sort': sort,
        'limit': limit,
        'source_course_ids': source_course_ids,
        'message': str(plan.get('message') or '').strip()[:500],
    }


def retrieve_courses_for_advisor(catalog_snapshot, retrieval_plan):
    if retrieval_plan.get('action') != 'retrieve_courses':
        return []

    filters = retrieval_plan.get('filters') or {}
    query_parts = [retrieval_plan.get('query') or ''] + (retrieval_plan.get('topics') or [])
    query_tokens = set()
    for part in query_parts:
        query_tokens.update(_tokens(part))

    levels = set(filters.get('levels') or [])
    if Course.Level.ALL_LEVELS in levels:
        levels = set()

    scored = []
    for course in catalog_snapshot:
        if levels and course.get('level') not in levels:
            continue

        language = filters.get('language')
        if language and normalize_search_text(language) not in normalize_search_text(course.get('language')):
            continue

        effective_price = _course_effective_price(course)
        if filters.get('free_only') and effective_price != 0:
            continue

        max_price = filters.get('max_effective_price')
        if max_price is not None and effective_price > Decimal(str(max_price)):
            continue

        min_rating = filters.get('min_rating')
        if min_rating is not None and _course_rating(course) < Decimal(str(min_rating)):
            continue

        has_certificate = filters.get('has_certificate')
        if has_certificate is not None and bool(course.get('has_certificate')) is not has_certificate:
            continue

        course_text = _course_text(course)
        relevance = 0
        for token in query_tokens:
            if token in course_text:
                relevance += 1
        if query_tokens and relevance == 0:
            continue

        scored.append({
            'course': course,
            'relevance': relevance,
            'price': effective_price,
            'rating': _course_rating(course),
            'students': course.get('total_students') or 0,
        })

    sort = retrieval_plan.get('sort')
    if sort == 'popular':
        scored.sort(key=lambda item: (item['students'], item['rating'], item['relevance']), reverse=True)
    elif sort == 'rating':
        scored.sort(key=lambda item: (item['rating'], item['students'], item['relevance']), reverse=True)
    elif sort == 'price_asc':
        scored.sort(key=lambda item: (item['price'], -item['relevance'], -item['students']))
    elif sort == 'price_desc':
        scored.sort(key=lambda item: (item['price'], item['relevance'], item['students']), reverse=True)
    else:
        scored.sort(key=lambda item: (item['relevance'], item['students'], item['rating']), reverse=True)

    return [item['course'] for item in scored[:retrieval_plan.get('limit', DEFAULT_RETRIEVAL_LIMIT)]]
