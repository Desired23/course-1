import re
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import Application, ApplicationResponse
from .serializers import (
    ApplicationSerializer,
)
from registration_forms.models import RegistrationForm, FormQuestion
from instructors.models import Instructor
from utils.admin_actors import resolve_admin_actor


def submit_application(user, data):
    form_id = data.get('form_id')
    responses = data.get('responses', [])

    try:
        form = RegistrationForm.objects.prefetch_related('questions').get(
            id=form_id, is_active=True, is_deleted=False
        )
    except RegistrationForm.DoesNotExist:
        raise ValidationError({"error": "Form not found or inactive."})

    existing = Application.objects.filter(
        user=user, form=form, status__in=['pending', 'changes_requested'], is_deleted=False
    ).first()
    if existing:
        raise ValidationError({
            "error": "You already have an active application for this form.",
            "application_id": existing.id,
        })

    active_questions = form.questions.filter(is_deleted=False)
    required_question_ids = set(
        active_questions.filter(required=True).values_list('id', flat=True)
    )
    valid_question_ids = set(active_questions.values_list('id', flat=True))

    submitted_map = {}
    for resp in responses:
        qid = resp.get('question_id')
        value = resp.get('value')
        if qid not in valid_question_ids:
            raise ValidationError({"error": f"Question ID {qid} is not part of this form."})
        submitted_map[qid] = value

    missing = required_question_ids - set(submitted_map.keys())
    if missing:
        raise ValidationError({
            "error": "Missing required questions.",
            "missing_question_ids": list(missing),
        })

    question_map = {q.id: q for q in active_questions}
    for qid, value in submitted_map.items():
        _validate_question_value(question_map[qid], value)

    with transaction.atomic():
        application = Application.objects.create(user=user, form=form)
        response_objects = [
            ApplicationResponse(
                application=application, question_id=qid, value=value
            )
            for qid, value in submitted_map.items()
        ]
        ApplicationResponse.objects.bulk_create(response_objects)

    from systems_settings.services import get_bool_setting
    auto_approved = (
        form.type == 'instructor_application'
        and get_bool_setting('auto_approve_instructor_application', default=True)
    )

    if auto_approved:
        with transaction.atomic():
            application.status = Application.Status.APPROVED
            application.reviewed_at = timezone.now()
            application.save(update_fields=['status', 'reviewed_at', 'updated_at'])
            _promote_to_instructor(application)

        try:
            from notifications.services import create_notification
            create_notification(
                receiver_id=user.id,
                title="Đơn đăng ký được chấp thuận",
                message="Chúc mừng! Đơn đăng ký instructor của bạn đã được chấp thuận.",
                type='other',
                related_id=application.id,
                notification_code='application_approved',
            )
        except Exception:
            pass
    else:
        try:
            from notifications.services import notify_admins
            notify_admins(
                title="Đơn đăng ký instructor mới",
                message=f"{user.full_name} vừa nộp đơn đăng ký trở thành instructor.",
                type='other',
                notification_code='application_submitted',
                related_id=application.id,
                sender_id=user.id,
            )
        except Exception:
            pass

    return ApplicationSerializer(application).data


def _validate_question_value(question, value):
    q_type = question.type

    if q_type in ('text', 'textarea', 'url'):
        if not isinstance(value, str):
            raise ValidationError({"error": f"Question '{question.label}': expected string value."})
        if q_type == 'url':
            url_pattern = r'^https?://'
            if not re.match(url_pattern, value):
                raise ValidationError({"error": f"Question '{question.label}': invalid URL format."})

    elif q_type == 'number':
        if not isinstance(value, (int, float)):
            raise ValidationError({"error": f"Question '{question.label}': expected numeric value."})

    elif q_type in ('select', 'radio'):
        if not isinstance(value, str):
            raise ValidationError({"error": f"Question '{question.label}': expected string value."})

    elif q_type == 'checkbox':
        if not isinstance(value, list):
            raise ValidationError({"error": f"Question '{question.label}': expected array value."})

    elif q_type == 'file':
        if not isinstance(value, str):
            raise ValidationError({"error": f"Question '{question.label}': expected file URL string."})

    if question.validation_regex and isinstance(value, str):
        if not re.match(question.validation_regex, value):
            raise ValidationError({
                "error": f"Question '{question.label}': value does not match required format."
            })


def get_user_applications(user):
    apps = Application.objects.filter(
        user=user, is_deleted=False
    ).select_related('form').order_by('-submitted_at')
    return apps


def get_application_detail(application_id, user=None):
    try:
        filters = {'id': application_id, 'is_deleted': False}
        if user:
            filters['user'] = user
        application = Application.objects.select_related(
            'user', 'form', 'reviewed_by__user'
        ).prefetch_related(
            'responses__question'
        ).get(**filters)
        return ApplicationSerializer(application).data
    except Application.DoesNotExist:
        raise ValidationError({"error": "Application not found."})


def get_all_applications(filters=None):
    qs = Application.objects.filter(
        is_deleted=False
    ).select_related('user', 'form').order_by('-submitted_at')

    if filters:
        if filters.get('status'):
            qs = qs.filter(status=filters['status'])
        if filters.get('form_id'):
            qs = qs.filter(form_id=filters['form_id'])
        if filters.get('user_id'):
            qs = qs.filter(user_id=filters['user_id'])

    return qs


def review_application(application_id, admin_actor, data):
    action = data.get('action')
    if action not in ('approve', 'reject', 'request_changes'):
        raise ValidationError({"error": "Action must be 'approve', 'reject', or 'request_changes'."})
    admin = resolve_admin_actor(admin_actor)

    try:
        application = Application.objects.select_related(
            'user', 'form'
        ).prefetch_related('responses__question').get(
            id=application_id, is_deleted=False
        )
    except Application.DoesNotExist:
        raise ValidationError({"error": "Application not found."})

    if application.status not in ('pending', 'changes_requested'):
        raise ValidationError({"error": f"Cannot review an application with status '{application.status}'."})

    now = timezone.now()

    if action == 'approve':
        with transaction.atomic():
            application.status = 'approved'
            application.reviewed_at = now
            application.reviewed_by = admin
            application.admin_notes = data.get('admin_notes', '')
            application.save()

            if application.form.type == 'instructor_application':
                _promote_to_instructor(application)

        try:
            from notifications.services import create_notification
            create_notification(
                receiver_id=application.user.id,
                title="Đơn đăng ký được chấp thuận",
                message="Chúc mừng! Đơn đăng ký instructor của bạn đã được chấp thuận.",
                type='other',
                related_id=application.id,
                notification_code='application_approved',
            )
        except Exception:
            pass

    elif action == 'reject':
        application.status = 'rejected'
        application.reviewed_at = now
        application.reviewed_by = admin
        application.admin_notes = data.get('admin_notes', '')
        application.rejection_reason = data.get('rejection_reason', '')
        application.save()

        try:
            from notifications.services import create_notification
            reason = application.rejection_reason
            msg = f"Đơn đăng ký của bạn không được chấp thuận.{' Lý do: ' + reason if reason else ''}"
            create_notification(
                receiver_id=application.user.id,
                title="Đơn đăng ký không được chấp thuận",
                message=msg,
                type='other',
                related_id=application.id,
                notification_code='application_rejected',
            )
        except Exception:
            pass

    elif action == 'request_changes':
        application.status = 'changes_requested'
        application.reviewed_at = now
        application.reviewed_by = admin
        application.admin_notes = data.get('admin_notes', '')
        application.save()

        try:
            from notifications.services import create_notification
            notes = application.admin_notes
            msg = f"Đơn đăng ký của bạn cần bổ sung thêm thông tin.{' Ghi chú: ' + notes if notes else ''}"
            create_notification(
                receiver_id=application.user.id,
                title="Đơn đăng ký cần bổ sung",
                message=msg,
                type='other',
                related_id=application.id,
                notification_code='application_changes_requested',
            )
        except Exception:
            pass

    try:
        from utils.mailer.mailer import send_application_result
        import threading
        threading.Thread(
            target=send_application_result,
            args=(application.user.email, application.user.full_name, action),
            kwargs={
                "rejection_reason": data.get('rejection_reason', '') or None,
                "admin_notes": data.get('admin_notes', '') or None,
            },
            daemon=True,
        ).start()
    except Exception:
        pass

    return ApplicationSerializer(application).data


def _promote_to_instructor(application):
    user = application.user
    instructor_data = {}
    for resp in application.responses.select_related('question').all():
        label_lower = resp.question.label.lower()
        if 'bio' in label_lower:
            instructor_data['bio'] = resp.value
        elif 'specialization' in label_lower or 'chuyên ngành' in label_lower:
            instructor_data['specialization'] = resp.value
        elif 'qualification' in label_lower or 'bằng cấp' in label_lower:
            instructor_data['qualification'] = resp.value
        elif 'experience' in label_lower or 'kinh nghiệm' in label_lower:
            try:
                instructor_data['experience'] = int(resp.value)
            except (ValueError, TypeError):
                pass

    instructor, created = Instructor.objects.get_or_create(
        user=user,
        defaults=instructor_data,
    )
    if not created:
        for key, val in instructor_data.items():
            setattr(instructor, key, val)
        instructor.save()

    from notifications.services import notify_role_updated
    notify_role_updated(user.id)


def resubmit_application(application_id, user, data):
    try:
        application = Application.objects.get(
            id=application_id, user=user,
            status='changes_requested', is_deleted=False,
        )
    except Application.DoesNotExist:
        raise ValidationError({"error": "Application not found or not eligible for resubmission."})

    responses = data.get('responses', [])
    form = application.form

    active_questions = form.questions.filter(is_deleted=False)
    required_question_ids = set(
        active_questions.filter(required=True).values_list('id', flat=True)
    )
    valid_question_ids = set(active_questions.values_list('id', flat=True))

    submitted_map = {}
    for resp in responses:
        qid = resp.get('question_id')
        value = resp.get('value')
        if qid not in valid_question_ids:
            raise ValidationError({"error": f"Question ID {qid} is not part of this form."})
        submitted_map[qid] = value

    missing = required_question_ids - set(submitted_map.keys())
    if missing:
        raise ValidationError({
            "error": "Missing required questions.",
            "missing_question_ids": list(missing),
        })

    question_map = {q.id: q for q in active_questions}
    for qid, value in submitted_map.items():
        _validate_question_value(question_map[qid], value)

    with transaction.atomic():
        application.responses.all().delete()
        response_objects = [
            ApplicationResponse(
                application=application, question_id=qid, value=value
            )
            for qid, value in submitted_map.items()
        ]
        ApplicationResponse.objects.bulk_create(response_objects)

        application.status = 'pending'
        application.save()

    try:
        from notifications.services import notify_admins
        notify_admins(
            title="Đơn đăng ký được nộp lại",
            message=f"{user.full_name} vừa nộp lại đơn đăng ký instructor.",
            type='other',
            notification_code='application_resubmitted',
            related_id=application.id,
            sender_id=user.id,
        )
    except Exception:
        pass

    return ApplicationSerializer(application).data
