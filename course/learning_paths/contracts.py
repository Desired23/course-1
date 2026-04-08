import json


def resolve_advisor_contract_version(request):
    header_version = (request.headers.get('X-Advisor-Contract') or '').strip().lower()
    query_version = (request.query_params.get('contract') or '').strip().lower()
    version = header_version or query_version
    if version == 'v2':
        return 'v2'
    return 'v1'


def wrap_sse_payload(contract_version, event, payload):
    if contract_version != 'v2':
        return payload
    return {
        'version': 'v2',
        'event': event,
        'data': payload,
    }


def sse_event(event, payload, contract_version='v1'):
    wrapped_payload = wrap_sse_payload(contract_version, event, payload)
    return f"event: {event}\ndata: {json.dumps(wrapped_payload, ensure_ascii=False)}\n\n"


def wrap_http_success(contract_version, payload):
    if contract_version != 'v2':
        return payload
    return {
        'version': 'v2',
        'data': payload,
    }


def wrap_http_error(contract_version, *, code, message):
    if contract_version != 'v2':
        return {'errors': message}
    return {
        'version': 'v2',
        'error': {
            'code': code,
            'message': message,
        },
    }
