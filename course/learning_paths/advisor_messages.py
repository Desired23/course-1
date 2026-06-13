from .advisor_retrieval import MAX_RETRIEVAL_LIMIT, validate_retrieval_plan


def sanitize_advisor_messages(messages):
    normalized = []
    for message in messages or []:
        if not isinstance(message, dict):
            continue
        role = message.get('role')
        content = (message.get('content') or '').strip()
        if role not in {'user', 'assistant'} or not content:
            continue
        normalized_message = {'role': role, 'content': content}
        artifact = sanitize_advisor_artifact(message.get('artifact'))
        if artifact:
            normalized_message['artifact'] = artifact
        normalized.append(normalized_message)
    return normalized


def sanitize_advisor_artifact(artifact):
    if not isinstance(artifact, dict):
        return None
    artifact_type = artifact.get('type')
    if artifact_type not in {'course_list', 'path', 'comparison'}:
        return None

    course_ids = []
    for raw_id in artifact.get('course_ids') or []:
        try:
            course_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        if course_id > 0 and course_id not in course_ids:
            course_ids.append(course_id)
        if len(course_ids) >= MAX_RETRIEVAL_LIMIT:
            break

    sanitized = {'type': artifact_type}
    if course_ids:
        sanitized['course_ids'] = course_ids
    retrieval_plan = artifact.get('retrieval_plan')
    if isinstance(retrieval_plan, dict):
        sanitized['retrieval_plan'] = validate_retrieval_plan(retrieval_plan)
    return sanitized
