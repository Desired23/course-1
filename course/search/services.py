import re
from datetime import timedelta

from django.db.models import Count, Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import SearchEvent


MIN_QUERY_LENGTH = 2
MAX_RECENT_SEARCHES = 5
MAX_POPULAR_SEARCHES = 6
POPULAR_WINDOW_DAYS = 30
ALLOWED_SOURCES = {SearchEvent.SourceChoices.GLOBAL_SEARCH}


def normalize_search_query(query: str) -> str:
    collapsed = re.sub(r'\s+', ' ', (query or '').strip())
    return collapsed.lower()


def clean_search_query(query: str) -> tuple[str, str]:
    raw_query = re.sub(r'\s+', ' ', (query or '').strip())
    normalized_query = raw_query.lower()
    if len(normalized_query) < MIN_QUERY_LENGTH:
        raise ValidationError({"query": [f"Query must be at least {MIN_QUERY_LENGTH} characters."]})
    return raw_query, normalized_query


def track_search_event(query: str, source: str, user=None) -> SearchEvent:
    raw_query, normalized_query = clean_search_query(query)
    if source not in ALLOWED_SOURCES:
        raise ValidationError({"source": [f"Unsupported source. Allowed: {sorted(ALLOWED_SOURCES)}"]})
    return SearchEvent.objects.create(
        user=user,
        raw_query=raw_query,
        normalized_query=normalized_query,
        source=source,
    )


def get_recent_searches_for_user(user_id: int) -> list[str]:
    recent_terms: list[str] = []
    seen: set[str] = set()

    rows = (
        SearchEvent.objects
        .filter(user_id=user_id)
        .order_by('-created_at', '-id')
        .values_list('normalized_query', 'raw_query')
    )

    for normalized_query, raw_query in rows:
        if normalized_query in seen:
            continue
        seen.add(normalized_query)
        recent_terms.append(raw_query)
        if len(recent_terms) >= MAX_RECENT_SEARCHES:
            break

    return recent_terms


def get_popular_searches() -> list[str]:
    window_start = timezone.now() - timedelta(days=POPULAR_WINDOW_DAYS)
    popular_rows = (
        SearchEvent.objects
        .filter(created_at__gte=window_start)
        .values('normalized_query')
        .annotate(search_count=Count('id'), latest_at=Max('created_at'))
        .order_by('-search_count', '-latest_at', 'normalized_query')[:MAX_POPULAR_SEARCHES]
    )

    popular_terms: list[str] = []
    for row in popular_rows:
        latest_event = (
            SearchEvent.objects
            .filter(
                normalized_query=row['normalized_query'],
                created_at__gte=window_start,
            )
            .order_by('-created_at', '-id')
            .values_list('raw_query', flat=True)
            .first()
        )
        if latest_event:
            popular_terms.append(latest_event)

    return popular_terms


def get_search_suggestions(user=None) -> dict[str, list[str]]:
    recent_searches = get_recent_searches_for_user(user.id) if user else []
    popular_searches = get_popular_searches()
    return {
        'recent_searches': recent_searches,
        'popular_searches': popular_searches,
    }
