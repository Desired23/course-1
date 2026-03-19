from typing import Iterable, Optional


def get_search_param(request, key: str = 'search') -> str:
    return (request.query_params.get(key) or '').strip()


def get_sort_param(
    request,
    allowed_values: Iterable[str],
    default: str,
    key: str = 'sort_by',
) -> str:
    raw = request.query_params.get(key) or default
    return raw if raw in set(allowed_values) else default


def get_int_param(request, key: str) -> Optional[int]:
    raw = request.query_params.get(key)
    if raw in (None, ''):
        return None
    return int(raw)
