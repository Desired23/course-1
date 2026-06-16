STANDARD_ACTIONS = frozenset(['approve', 'dismiss', 'hide', 'delete'])
MESSAGE_ACTIONS = frozenset(['approve', 'dismiss', 'revoke', 'delete'])
LESSON_ACTIONS = frozenset(['approve', 'dismiss', 'hide', 'delete'])


def _review_adapter():
    from reviews.models import Review
    from reviews.services import moderate_review

    def get_object(target_id):
        return Review.objects.filter(id=target_id, is_deleted=False).select_related('user', 'course').first()

    def get_title(obj):
        return obj.course.title if obj.course else f'Review #{obj.id}'

    def get_owner_id(obj):
        return obj.user_id

    def get_snippet(obj):
        return (obj.comment or '')[:200]

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'actions': STANDARD_ACTIONS,
        'moderate': lambda tid, action, reason: moderate_review(tid, action, reason),
    }


def _question_adapter():
    from questions.models import Question
    from questions.services import moderate_question

    def get_object(target_id):
        return Question.objects.filter(id=target_id, is_deleted=False).select_related('author').first()

    def get_title(obj):
        return obj.title or f'Question #{obj.id}'

    def get_owner_id(obj):
        return obj.author_id

    def get_snippet(obj):
        return (obj.content or '')[:200]

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'actions': STANDARD_ACTIONS,
        'moderate': lambda tid, action, reason: moderate_question(tid, action, reason),
    }


def _answer_adapter():
    from answers.models import Answer
    from answers.services import moderate_answer

    def get_object(target_id):
        return Answer.objects.filter(id=target_id, is_deleted=False).select_related('author', 'question').first()

    def get_title(obj):
        return obj.question.title if obj.question else f'Answer #{obj.id}'

    def get_owner_id(obj):
        return obj.author_id

    def get_snippet(obj):
        return (obj.content or '')[:200]

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'actions': STANDARD_ACTIONS,
        'moderate': lambda tid, action, reason: moderate_answer(tid, action, reason),
    }


def _blog_post_adapter():
    from blog_posts.models import BlogPost
    from blog_posts.services import moderate_blog_post

    def get_object(target_id):
        return BlogPost.objects.filter(id=target_id, is_deleted=False).select_related('author').first()

    def get_title(obj):
        return obj.title or f'Blog Post #{obj.id}'

    def get_owner_id(obj):
        return obj.author_id

    def get_snippet(obj):
        return (obj.content or '')[:200]

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'actions': STANDARD_ACTIONS,
        'moderate': lambda tid, action, reason: moderate_blog_post(tid, action, reason),
    }


def _blog_comment_adapter():
    from blog_comments.models import BlogComment
    from blog_comments.services import moderate_blog_comment

    def get_object(target_id):
        return BlogComment.objects.filter(id=target_id, is_deleted=False).select_related('user', 'blog_post').first()

    def get_title(obj):
        return obj.blog_post.title if obj.blog_post else f'Blog Comment #{obj.id}'

    def get_owner_id(obj):
        return obj.user_id

    def get_snippet(obj):
        return (obj.content or '')[:200]

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'actions': STANDARD_ACTIONS,
        'moderate': lambda tid, action, reason: moderate_blog_comment(tid, action, reason),
    }


def _lesson_comment_adapter():
    from lesson_comments.models import LessonComment
    from lesson_comments.services import moderate_lesson_comment

    def get_object(target_id):
        return (
            LessonComment.objects.filter(id=target_id, is_deleted=False)
            .select_related('user', 'lesson__coursemodule__course')
            .first()
        )

    def get_title(obj):
        return obj.lesson.title if obj.lesson else f'Lesson Comment #{obj.id}'

    def get_owner_id(obj):
        return obj.user_id

    def get_snippet(obj):
        return (obj.content or '')[:200]

    def get_context(obj):
        # Navigation hint so admins can open the comment in the course player.
        lesson = obj.lesson
        module = lesson.coursemodule if lesson else None
        course = module.course if module else None
        return {
            'course_id': course.id if course else None,
            'lesson_id': lesson.id if lesson else None,
            'comment_id': obj.id,
        }

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'get_context': get_context,
        'actions': STANDARD_ACTIONS,
        'moderate': lambda tid, action, reason: moderate_lesson_comment(tid, action, reason),
    }


def _lesson_adapter():
    from django.utils import timezone
    from rest_framework.exceptions import ValidationError

    def get_object(target_id):
        from lessons.models import Lesson
        return (
            Lesson.objects.filter(id=target_id, is_deleted=False)
            .select_related('coursemodule__course__instructor__user')
            .first()
        )

    def get_title(obj):
        return obj.title or f'Lesson #{obj.id}'

    def get_owner_id(obj):
        course = obj.coursemodule.course if obj.coursemodule else None
        return course.instructor.user_id if course and course.instructor else None

    def get_snippet(obj):
        return (obj.description or obj.content or '')[:200]

    def get_context(obj):
        course = obj.coursemodule.course if obj.coursemodule else None
        return {
            'course_id': course.id if course else None,
            'lesson_id': obj.id,
            'comment_id': None,
        }

    def moderate(target_id, action, reason=''):
        lesson = get_object(target_id)
        if not lesson:
            raise ValidationError({'target_id': 'Lesson not found.'})
        action = (action or '').strip().lower()
        if action == 'approve':
            lesson.is_deleted = False
            lesson.deleted_at = None
        elif action == 'dismiss':
            return lesson
        elif action == 'hide':
            lesson.is_deleted = True
            lesson.deleted_at = timezone.now()
        elif action == 'delete':
            lesson.is_deleted = True
            lesson.deleted_at = timezone.now()
        else:
            raise ValidationError({'action': 'Invalid action. Use: approve, dismiss, hide, delete'})
        lesson.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
        return lesson

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'get_context': get_context,
        'actions': LESSON_ACTIONS,
        'moderate': moderate,
    }


def _course_adapter():
    from courses.models import Course
    from courses.services import moderate_course, delete_course

    def get_object(target_id):
        return Course.objects.filter(id=target_id, is_deleted=False).select_related('instructor__user').first()

    def get_title(obj):
        return obj.title or f'Course #{obj.id}'

    def get_owner_id(obj):
        return obj.instructor.user_id if obj.instructor else None

    def get_snippet(obj):
        return (obj.description or '')[:200]

    def moderate(target_id, action, reason=''):
        # STANDARD_ACTIONS: approve/dismiss giữ nguyên; hide -> suspend_sale; delete -> xóa.
        if action == 'delete':
            return delete_course(target_id)
        course_action = 'suspend_sale' if action == 'hide' else action
        return moderate_course(target_id, course_action, reason=reason)

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'actions': STANDARD_ACTIONS,
        'moderate': moderate,
    }


def _message_adapter():
    from realtime.models import Message
    from realtime.views import _moderate_reported_message

    def get_object(target_id):
        return Message.objects.filter(id=target_id).select_related('sender', 'conversation').first()

    def get_title(obj):
        return f'Conversation #{obj.conversation_id}'

    def get_owner_id(obj):
        return obj.sender_id

    def get_snippet(obj):
        return (obj.text_content or '[attachment-only message]')[:200]

    return {
        'get_object': get_object,
        'get_title': get_title,
        'get_owner_id': get_owner_id,
        'get_snippet': get_snippet,
        'actions': MESSAGE_ACTIONS,
        'moderate': lambda tid, action, reason: _moderate_reported_message(tid, action, reason),
    }


_REGISTRY = {
    'review': _review_adapter,
    'question': _question_adapter,
    'answer': _answer_adapter,
    'blog_post': _blog_post_adapter,
    'blog_comment': _blog_comment_adapter,
    'lesson_comment': _lesson_comment_adapter,
    'lesson': _lesson_adapter,
    'course': _course_adapter,
    'message': _message_adapter,
}


def get_adapter(target_type):
    factory = _REGISTRY.get(target_type)
    if not factory:
        return None
    return factory()
