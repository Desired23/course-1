from rest_framework.exceptions import ValidationError

from .advisor_retrieval import normalize_search_text


def _advisor_course_item(course, order, reason):
    return {
        'course_id': course['course_id'],
        'order': order,
        'reason': reason,
        'is_skippable': False,
        'skippable_reason': None,
        'course_title': course.get('title'),
        'course_level': course.get('level'),
        'course_price': course.get('course_price'),
        'course_discount_price': course.get('course_discount_price'),
        'course_discount_start_date': course.get('course_discount_start_date'),
        'course_discount_end_date': course.get('course_discount_end_date'),
        'duration_hours': course.get('duration_hours'),
    }


def validate_advisor_payload(payload, catalog_snapshot):
    if payload.get('type') == 'course_list':
        catalog_by_id = {course['course_id']: course for course in catalog_snapshot}
        expected_order = 1
        validated_courses = []
        for item in payload.get('courses') or []:
            course_id = item.get('course_id')
            if course_id not in catalog_by_id:
                raise ValidationError(f'Advisor returned invalid course_id: {course_id}')
            course = catalog_by_id[course_id]
            if item.get('order') != expected_order:
                raise ValidationError('Advisor course list order must be continuous starting from 1.')
            validated_courses.append(_advisor_course_item(
                course,
                expected_order,
                item.get('reason') or 'Khóa học này phù hợp với yêu cầu hiện tại.',
            ))
            expected_order += 1

        payload['courses'] = validated_courses
        summary = (payload.get('summary') or '').strip()
        if _looks_like_path_summary(summary):
            summary = f'Mình tìm thấy {len(validated_courses)} khóa học phù hợp với yêu cầu của bạn.'
        payload['summary'] = summary
        payload['advisor_meta'] = payload.get('advisor_meta') or {}
        return payload

    if payload.get('type') != 'path':
        payload['advisor_meta'] = payload.get('advisor_meta') or {}
        return payload

    catalog_by_id = {course['course_id']: course for course in catalog_snapshot}
    path = payload.get('path') or []
    if not path:
        return {
            'type': 'question',
            'message': (
                payload.get('summary')
                or 'Mình chưa tìm thấy đủ khóa học phù hợp để tạo lộ trình. Bạn có thể nói rõ hơn chủ đề, trình độ hoặc mục tiêu muốn học không?'
            ),
            'advisor_meta': payload.get('advisor_meta') or {},
        }

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


def _looks_like_path_summary(summary):
    normalized = normalize_search_text(summary)
    path_markers = (
        'buoc',
        'uoc tinh',
        'co the bo qua',
        'lo trinh',
    )
    return 'course_id' in normalized and any(marker in normalized for marker in path_markers)
