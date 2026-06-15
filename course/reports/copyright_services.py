from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from .adapters import get_adapter
from .models import CopyrightCase, CopyrightCaseMessage, InstructorEarningHold, Report


FINAL_STATUSES = {
    CopyrightCase.Status.INSUFFICIENT_INFO,
    CopyrightCase.Status.RESOLVED_VALID,
    CopyrightCase.Status.RESOLVED_REJECTED,
    CopyrightCase.Status.TAKEDOWN,
    CopyrightCase.Status.RESTORED,
}


def _case_queryset():
    return (
        CopyrightCase.objects
        .select_related('course', 'lesson', 'instructor__user', 'created_by', 'last_action_by', 'resolved_by')
        .prefetch_related('messages__actor', 'earning_holds__earning')
    )


def _frontend_url(path):
    if not path:
        return getattr(settings, 'FRONTEND_URL', '').rstrip('/')
    if path.startswith('http://') or path.startswith('https://'):
        return path
    return f"{getattr(settings, 'FRONTEND_URL', '').rstrip('/')}{path}"


def _target_context(target_type, target_id):
    adapter = get_adapter(target_type)
    if not adapter:
        raise ValidationError({'target_type': 'Invalid target type.'})
    obj = adapter['get_object'](target_id)
    if not obj:
        raise ValidationError({'target_id': 'Target not found.'})

    course = None
    lesson = None
    instructor = None
    if target_type == Report.TargetType.COURSE:
        course = obj
        instructor = getattr(course, 'instructor', None)
    elif target_type == Report.TargetType.LESSON:
        lesson = obj
        module = getattr(lesson, 'coursemodule', None)
        course = getattr(module, 'course', None)
        instructor = getattr(course, 'instructor', None) if course else None
    else:
        raise ValidationError({'target_type': 'Copyright workflow is only supported for course and lesson.'})
    return obj, course, lesson, instructor


def _target_title(case):
    if case.target_type == Report.TargetType.LESSON and case.lesson:
        return case.lesson.title
    if case.course:
        return case.course.title
    return f'{case.target_type} #{case.target_id}'


def create_or_update_copyright_case(report, metadata=None, attachments=None):
    if report.reason != Report.Reason.COPYRIGHT:
        return None
    if report.target_type not in (Report.TargetType.COURSE, Report.TargetType.LESSON):
        return None

    metadata = metadata or {}
    attachments = attachments or []
    _, course, lesson, instructor = _target_context(report.target_type, report.target_id)

    with transaction.atomic():
        case = (
            CopyrightCase.objects
            .select_for_update()
            .filter(target_type=report.target_type, target_id=report.target_id)
            .exclude(status__in=FINAL_STATUSES)
            .first()
        )
        created = False
        if not case:
            case = CopyrightCase.objects.create(
                target_type=report.target_type,
                target_id=report.target_id,
                source_report=report,
                course=course,
                lesson=lesson,
                instructor=instructor,
                created_by=report.reporter,
                last_action_by=report.reporter,
            )
            created = True
        else:
            update_fields = []
            for field, value in {
                'course': course,
                'lesson': lesson,
                'instructor': instructor,
                'last_action_by': report.reporter,
            }.items():
                if getattr(case, f'{field}_id', None) != getattr(value, 'id', None):
                    setattr(case, field, value)
                    update_fields.append(field)
            if update_fields:
                update_fields.append('updated_at')
                case.save(update_fields=update_fields)

        message_text = report.description or metadata.get('description') or ''
        if created or message_text or metadata or attachments:
            CopyrightCaseMessage.objects.create(
                case=case,
                actor=report.reporter,
                actor_role=CopyrightCaseMessage.ActorRole.REPORTER,
                message=message_text,
                response_type='initial_report',
                attachments=attachments,
                metadata={**metadata, 'report_id': report.id},
                visibility=CopyrightCaseMessage.Visibility.ADMIN_ONLY,
            )

    return case


def get_case_for_report(report):
    if report.reason != Report.Reason.COPYRIGHT:
        return None
    return (
        CopyrightCase.objects
        .filter(target_type=report.target_type, target_id=report.target_id)
        .exclude(status__in=FINAL_STATUSES)
        .order_by('-updated_at')
        .first()
    )


def _reporter_can_access(case, user):
    if not user or not getattr(user, 'id', None):
        return False
    if case.created_by_id == user.id:
        return True
    return Report.objects.filter(
        reporter=user,
        target_type=case.target_type,
        target_id=case.target_id,
        reason=Report.Reason.COPYRIGHT,
    ).exists()


def _instructor_can_access(case, user):
    return bool(
        user
        and case.instructor
        and case.instructor.user_id == user.id
    )


def get_reporter_case(case_id, user):
    case = _case_queryset().filter(id=case_id).first()
    if not case:
        raise ValidationError('Copyright case not found.')
    if not _reporter_can_access(case, user):
        raise PermissionDenied('You do not have permission to view this copyright case.')
    messages = case.messages.filter(
        Q(actor=user)
        | Q(visibility=CopyrightCaseMessage.Visibility.SHARED_WITH_REPORTER)
        | Q(actor_role=CopyrightCaseMessage.ActorRole.SYSTEM)
    ).select_related('actor')
    return case, messages


def get_instructor_case(case_id, user):
    case = _case_queryset().filter(id=case_id).first()
    if not case:
        raise ValidationError('Copyright case not found.')
    if not _instructor_can_access(case, user):
        raise PermissionDenied('You do not have permission to view this copyright case.')
    messages = case.messages.filter(
        Q(actor=user)
        | Q(visibility=CopyrightCaseMessage.Visibility.SHARED_WITH_INSTRUCTOR)
        | Q(actor_role=CopyrightCaseMessage.ActorRole.SYSTEM)
    ).select_related('actor')
    return case, messages


def list_instructor_cases(user):
    instructor = getattr(user, 'instructor', None)
    if not instructor:
        raise PermissionDenied('Instructor profile not found.')
    return _case_queryset().filter(instructor=instructor)


def list_admin_cases(filters=None):
    filters = filters or {}
    qs = _case_queryset().all()
    status = filters.get('status')
    severity = filters.get('severity')
    search = (filters.get('search') or '').strip()
    if status:
        qs = qs.filter(status=status)
    if severity:
        qs = qs.filter(severity=severity)
    if search:
        qs = qs.filter(
            Q(course__title__icontains=search)
            | Q(lesson__title__icontains=search)
            | Q(instructor__user__full_name__icontains=search)
            | Q(created_by__full_name__icontains=search)
        )
    return qs.order_by('-updated_at')


def get_admin_case(case_id):
    case = _case_queryset().filter(id=case_id).first()
    if not case:
        raise ValidationError('Copyright case not found.')
    Report.objects.filter(
        target_type=case.target_type,
        target_id=case.target_id,
        reason=Report.Reason.COPYRIGHT,
        status=Report.Status.PENDING,
    ).update(status=Report.Status.REVIEWING, updated_at=timezone.now())
    return case, case.messages.select_related('actor').all()


def _create_case_message(case, actor, actor_role, message='', response_type='', attachments=None, metadata=None, visibility=None):
    return CopyrightCaseMessage.objects.create(
        case=case,
        actor=actor,
        actor_role=actor_role,
        message=message or '',
        response_type=response_type or '',
        attachments=attachments or [],
        metadata=metadata or {},
        visibility=visibility or CopyrightCaseMessage.Visibility.ADMIN_ONLY,
    )


def _notify_admins(case, title, message, code):
    try:
        from notifications.services import notify_admins
        notify_admins(
            title=title,
            message=message,
            type='system',
            notification_code=code,
            related_id=case.id,
            action_url=f'/admin/reports?case={case.id}',
            metadata={'case_id': case.id},
            force=True,
        )
    except Exception:
        pass


def _notify_user(user, case, title, message, code, action_url, sender=None, email_kind=None, deadline=None):
    if not user:
        return
    try:
        from notifications.services import create_notification
        create_notification(
            receiver_id=user.id,
            title=title,
            message=message,
            type='system',
            related_id=case.id,
            sender=sender.id if sender else None,
            notification_code=code,
            action_url=action_url,
            metadata={'case_id': case.id},
            force=True,
        )
    except Exception:
        pass

    if email_kind and getattr(user, 'email', None):
        try:
            from utils.mailer.mailer import (
                send_copyright_case_decision,
                send_copyright_instructor_response_required,
                send_copyright_reporter_info_required,
            )
            full_url = _frontend_url(action_url)
            course_title = _target_title(case)
            if email_kind == 'reporter_info':
                send_copyright_reporter_info_required(
                    user.email, user.full_name, course_title, full_url, deadline
                )
            elif email_kind == 'instructor_response':
                send_copyright_instructor_response_required(
                    user.email, user.full_name, course_title, full_url, deadline
                )
            elif email_kind == 'decision':
                send_copyright_case_decision(user.email, user.full_name, course_title, message, full_url)
        except Exception:
            pass


def submit_reporter_evidence(case_id, user, message='', metadata=None, attachments=None):
    with transaction.atomic():
        case = CopyrightCase.objects.select_for_update().filter(id=case_id).first()
        if not case:
            raise ValidationError('Copyright case not found.')
        if not _reporter_can_access(case, user):
            raise PermissionDenied('You do not have permission to update this copyright case.')
        _create_case_message(
            case,
            actor=user,
            actor_role=CopyrightCaseMessage.ActorRole.REPORTER,
            message=message,
            response_type='evidence_submitted',
            attachments=attachments,
            metadata=metadata,
            visibility=CopyrightCaseMessage.Visibility.ADMIN_ONLY,
        )
        case.status = CopyrightCase.Status.UNDER_REVIEW
        case.last_action_by = user
        case.save(update_fields=['status', 'last_action_by', 'updated_at'])

    _notify_admins(
        case,
        title='Copyright evidence submitted',
        message=f'Reporter submitted more evidence for "{_target_title(case)}".',
        code='copyright_reporter_info_submitted',
    )
    return _case_queryset().get(id=case.id)


def submit_instructor_response(case_id, user, response_type, message='', metadata=None, attachments=None):
    with transaction.atomic():
        case = CopyrightCase.objects.select_for_update().filter(id=case_id).first()
        if not case:
            raise ValidationError('Copyright case not found.')
        if not _instructor_can_access(case, user):
            raise PermissionDenied('You do not have permission to update this copyright case.')
        _create_case_message(
            case,
            actor=user,
            actor_role=CopyrightCaseMessage.ActorRole.INSTRUCTOR,
            message=message,
            response_type=response_type,
            attachments=attachments,
            metadata=metadata,
            visibility=CopyrightCaseMessage.Visibility.ADMIN_ONLY,
        )
        case.status = (
            CopyrightCase.Status.AWAITING_INSTRUCTOR_FIX
            if response_type == 'accept_and_fix'
            else CopyrightCase.Status.INSTRUCTOR_RESPONDED
        )
        case.last_action_by = user
        case.save(update_fields=['status', 'last_action_by', 'updated_at'])

    _notify_admins(
        case,
        title='Instructor responded to copyright case',
        message=f'Instructor responded for "{_target_title(case)}".',
        code='copyright_instructor_responded',
    )
    return _case_queryset().get(id=case.id)


def submit_instructor_fix(case_id, user, message=''):
    with transaction.atomic():
        case = CopyrightCase.objects.select_for_update().filter(id=case_id).first()
        if not case:
            raise ValidationError('Copyright case not found.')
        if not _instructor_can_access(case, user):
            raise PermissionDenied('You do not have permission to update this copyright case.')
        _create_case_message(
            case,
            actor=user,
            actor_role=CopyrightCaseMessage.ActorRole.INSTRUCTOR,
            message=message,
            response_type='fix_submitted',
            visibility=CopyrightCaseMessage.Visibility.ADMIN_ONLY,
        )
        case.status = CopyrightCase.Status.INSTRUCTOR_RESPONDED
        case.last_action_by = user
        case.save(update_fields=['status', 'last_action_by', 'updated_at'])

    _notify_admins(
        case,
        title='Instructor submitted copyright fix',
        message=f'Instructor marked the fix complete for "{_target_title(case)}".',
        code='copyright_instructor_responded',
    )
    return _case_queryset().get(id=case.id)


def _apply_content_action(case, content_action):
    course = case.course
    lesson = case.lesson
    if content_action == CopyrightCase.ContentAction.SALE_SUSPENDED:
        if course:
            course.admin_hidden = True
            course.save(update_fields=['admin_hidden', 'updated_at'])
    elif content_action == CopyrightCase.ContentAction.LESSON_HIDDEN:
        if lesson:
            lesson.is_deleted = True
            lesson.deleted_at = timezone.now()
            lesson.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
        elif course:
            course.admin_hidden = True
            course.save(update_fields=['admin_hidden', 'updated_at'])
    elif content_action in (CopyrightCase.ContentAction.ACCESS_SUSPENDED, CopyrightCase.ContentAction.TAKEDOWN):
        if lesson:
            lesson.is_deleted = True
            lesson.deleted_at = timezone.now()
            lesson.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
        elif course:
            course.admin_hidden = True
            course.is_hard_blocked = True
            course.save(update_fields=['admin_hidden', 'is_hard_blocked', 'updated_at'])
    elif content_action == CopyrightCase.ContentAction.RESTORED:
        if course:
            course.admin_hidden = False
            course.is_hard_blocked = False
            course.save(update_fields=['admin_hidden', 'is_hard_blocked', 'updated_at'])
        if lesson:
            lesson.is_deleted = False
            lesson.deleted_at = None
            lesson.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])

    case.content_action = content_action
    case.save(update_fields=['content_action', 'updated_at'])


def _recalculate_pending_payout(payout):
    from instructor_earnings.models import InstructorEarning
    from instructor_payouts.models import InstructorPayout

    if not payout or payout.status != InstructorPayout.PayoutStatusChoices.PENDING:
        return

    remaining = (
        InstructorEarning.objects
        .filter(
            instructor_payout=payout,
            status=InstructorEarning.StatusChoices.AVAILABLE,
            is_deleted=False,
        )
        .exclude(copyright_holds__status=InstructorEarningHold.Status.ACTIVE)
    )
    total = sum((earning.net_amount for earning in remaining), Decimal('0.00'))
    if total <= 0:
        InstructorEarning.objects.filter(instructor_payout=payout).update(instructor_payout=None)
        payout.status = InstructorPayout.PayoutStatusChoices.CANCELLED
        payout.amount = Decimal('0.00')
        payout.net_amount = Decimal('0.00')
        payout.processed_date = timezone.now()
        payout.notes = ((payout.notes or '') + '\nAuto-cancelled because all earnings were held.').strip()
        payout.save(update_fields=['status', 'amount', 'net_amount', 'processed_date', 'notes', 'updated_at'])
        return

    fee = payout.fee or Decimal('0.00')
    if fee > total:
        fee = Decimal('0.00')
    payout.amount = total
    payout.fee = fee
    payout.net_amount = total - fee
    payout.save(update_fields=['amount', 'fee', 'net_amount', 'updated_at'])


def hold_case_earnings(case, actor, reason='Copyright report hold'):
    from instructor_earnings.models import InstructorEarning
    from instructor_payouts.models import InstructorPayout

    if not case.course_id or not case.instructor_id:
        return {'held_count': 0, 'held_amount': '0.00'}

    held_count = 0
    held_amount = Decimal('0.00')
    payouts_to_recalc = set()
    earnings = (
        InstructorEarning.objects
        .select_for_update()
        .filter(
            course_id=case.course_id,
            instructor_id=case.instructor_id,
            status__in=[InstructorEarning.StatusChoices.PENDING, InstructorEarning.StatusChoices.AVAILABLE],
            is_deleted=False,
        )
        .select_related('instructor_payout')
    )
    for earning in earnings:
        hold, created = InstructorEarningHold.objects.get_or_create(
            case=case,
            earning=earning,
            defaults={
                'course_id': case.course_id,
                'instructor_id': case.instructor_id,
                'status': InstructorEarningHold.Status.ACTIVE,
                'reason': reason,
                'created_by': actor,
            },
        )
        if not created and hold.status != InstructorEarningHold.Status.ACTIVE:
            hold.status = InstructorEarningHold.Status.ACTIVE
            hold.released_by = None
            hold.released_at = None
            hold.adjusted_at = None
            hold.reason = reason
            hold.save(update_fields=['status', 'released_by', 'released_at', 'adjusted_at', 'reason', 'updated_at'])
        if created or hold.status == InstructorEarningHold.Status.ACTIVE:
            held_count += 1
            held_amount += earning.net_amount

        payout = earning.instructor_payout
        if payout and payout.status == InstructorPayout.PayoutStatusChoices.PENDING:
            payouts_to_recalc.add(payout.id)
            earning.instructor_payout = None
            earning.save(update_fields=['instructor_payout', 'updated_at'])

    case.financial_action = CopyrightCase.FinancialAction.HOLD
    case.save(update_fields=['financial_action', 'updated_at'])

    for payout_id in payouts_to_recalc:
        payout = InstructorPayout.objects.filter(id=payout_id).first()
        _recalculate_pending_payout(payout)

    return {'held_count': held_count, 'held_amount': str(held_amount)}


def release_case_holds(case, actor):
    updated = 0
    now = timezone.now()
    for hold in case.earning_holds.select_for_update().filter(status=InstructorEarningHold.Status.ACTIVE):
        hold.status = InstructorEarningHold.Status.RELEASED
        hold.released_by = actor
        hold.released_at = now
        hold.save(update_fields=['status', 'released_by', 'released_at', 'updated_at'])
        updated += 1
    case.financial_action = CopyrightCase.FinancialAction.RELEASED
    case.save(update_fields=['financial_action', 'updated_at'])
    return updated


def adjust_case_earnings(case, actor):
    from instructor_earnings.models import InstructorEarning
    from instructor_payouts.models import InstructorPayout

    if not case.course_id or not case.instructor_id:
        return {'cancelled_count': 0, 'manual_follow_up': False}

    payouts_to_recalc = set()
    cancelled_count = 0
    unpaid = (
        InstructorEarning.objects
        .select_for_update()
        .filter(
            course_id=case.course_id,
            instructor_id=case.instructor_id,
            status__in=[InstructorEarning.StatusChoices.PENDING, InstructorEarning.StatusChoices.AVAILABLE],
            is_deleted=False,
        )
        .select_related('instructor_payout')
    )
    for earning in unpaid:
        payout = earning.instructor_payout
        if payout and payout.status == InstructorPayout.PayoutStatusChoices.PENDING:
            payouts_to_recalc.add(payout.id)
        earning.status = InstructorEarning.StatusChoices.CANCELLED
        earning.instructor_payout = None
        earning.save(update_fields=['status', 'instructor_payout', 'updated_at'])
        cancelled_count += 1

    now = timezone.now()
    case.earning_holds.filter(status=InstructorEarningHold.Status.ACTIVE).update(
        status=InstructorEarningHold.Status.ADJUSTED,
        adjusted_at=now,
        updated_at=now,
    )

    for payout_id in payouts_to_recalc:
        payout = InstructorPayout.objects.filter(id=payout_id).first()
        _recalculate_pending_payout(payout)

    paid_exists = InstructorEarning.objects.filter(
        course_id=case.course_id,
        instructor_id=case.instructor_id,
        status=InstructorEarning.StatusChoices.PAID,
        is_deleted=False,
    ).exists()

    case.manual_follow_up = paid_exists
    case.financial_action = (
        CopyrightCase.FinancialAction.MANUAL_FOLLOW_UP
        if paid_exists
        else CopyrightCase.FinancialAction.ADJUSTED
    )
    case.last_action_by = actor
    case.save(update_fields=['manual_follow_up', 'financial_action', 'last_action_by', 'updated_at'])
    return {'cancelled_count': cancelled_count, 'manual_follow_up': paid_exists}


def _sync_reports_final(case, report_status, action, notes, admin):
    Report.objects.filter(
        target_type=case.target_type,
        target_id=case.target_id,
        reason=Report.Reason.COPYRIGHT,
        status__in=[Report.Status.PENDING, Report.Status.REVIEWING],
    ).update(
        status=report_status,
        resolved_by=admin,
        action_taken=action,
        resolution_notes=notes or '',
        resolved_at=timezone.now(),
        updated_at=timezone.now(),
    )


def _notify_decision(case, actor, message):
    reporter = case.created_by
    instructor_user = case.instructor.user if case.instructor else None
    for user, path in [
        (reporter, f'/reports/my/{case.id}'),
        (instructor_user, f'/instructor/reports/{case.id}'),
    ]:
        _notify_user(
            user,
            case,
            title='Copyright case decision',
            message=message,
            code='copyright_case_decision',
            action_url=path,
            sender=actor,
            email_kind='decision',
        )


def admin_action(case_id, actor, action, message='', severity=None, deadline_days=7, share_reporter_evidence=False):
    with transaction.atomic():
        case = CopyrightCase.objects.select_for_update().select_related(
            'course', 'lesson', 'instructor__user', 'created_by'
        ).get(id=case_id)
        visibility = CopyrightCaseMessage.Visibility.ADMIN_ONLY
        response_type = action
        now = timezone.now()

        if action == 'request_reporter_info':
            case.status = CopyrightCase.Status.NEEDS_REPORTER_INFO
            case.reporter_deadline_at = now + timedelta(days=deadline_days or 7)
            case.last_action_by = actor
            visibility = CopyrightCaseMessage.Visibility.SHARED_WITH_REPORTER
            case.save(update_fields=['status', 'reporter_deadline_at', 'last_action_by', 'updated_at'])
        elif action == 'request_instructor_response':
            case.status = CopyrightCase.Status.AWAITING_INSTRUCTOR_RESPONSE
            case.instructor_deadline_at = now + timedelta(days=deadline_days or 7)
            case.last_action_by = actor
            if severity:
                case.severity = severity
            visibility = CopyrightCaseMessage.Visibility.SHARED_WITH_INSTRUCTOR
            if share_reporter_evidence:
                case.messages.filter(actor_role=CopyrightCaseMessage.ActorRole.REPORTER).update(
                    visibility=CopyrightCaseMessage.Visibility.SHARED_WITH_INSTRUCTOR
                )
            if case.severity == CopyrightCase.Severity.MEDIUM:
                _apply_content_action(case, CopyrightCase.ContentAction.SALE_SUSPENDED)
                hold_case_earnings(case, actor, message or 'Medium copyright risk')
            elif case.severity == CopyrightCase.Severity.HIGH:
                action_to_apply = (
                    CopyrightCase.ContentAction.LESSON_HIDDEN
                    if case.target_type == Report.TargetType.LESSON
                    else CopyrightCase.ContentAction.ACCESS_SUSPENDED
                )
                _apply_content_action(case, action_to_apply)
                hold_case_earnings(case, actor, message or 'High copyright risk')
            case.save(update_fields=['status', 'instructor_deadline_at', 'severity', 'last_action_by', 'updated_at'])
        elif action == 'suspend_sale_hold':
            case.severity = severity or CopyrightCase.Severity.MEDIUM
            case.status = CopyrightCase.Status.UNDER_REVIEW
            case.last_action_by = actor
            case.save(update_fields=['severity', 'status', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.SALE_SUSPENDED)
            hold_case_earnings(case, actor, message or 'Copyright report sale suspension')
        elif action == 'hide_lesson_hold':
            case.severity = severity or CopyrightCase.Severity.HIGH
            case.status = CopyrightCase.Status.UNDER_REVIEW
            case.last_action_by = actor
            case.save(update_fields=['severity', 'status', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.LESSON_HIDDEN)
            hold_case_earnings(case, actor, message or 'Copyright report lesson hidden')
        elif action == 'suspend_access_hold':
            case.severity = severity or CopyrightCase.Severity.HIGH
            case.status = CopyrightCase.Status.UNDER_REVIEW
            case.last_action_by = actor
            case.save(update_fields=['severity', 'status', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.ACCESS_SUSPENDED)
            hold_case_earnings(case, actor, message or 'Copyright report access suspension')
        elif action == 'confirm_takedown':
            case.status = CopyrightCase.Status.TAKEDOWN
            case.severity = CopyrightCase.Severity.CONFIRMED
            case.resolved_by = actor
            case.resolved_at = now
            case.last_action_by = actor
            case.save(update_fields=['status', 'severity', 'resolved_by', 'resolved_at', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.TAKEDOWN)
            adjust_case_earnings(case, actor)
            _sync_reports_final(case, Report.Status.RESOLVED, 'copyright_takedown', message, actor)
        elif action == 'reject_restore':
            case.status = CopyrightCase.Status.RESOLVED_REJECTED
            case.resolved_by = actor
            case.resolved_at = now
            case.last_action_by = actor
            case.save(update_fields=['status', 'resolved_by', 'resolved_at', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.RESTORED)
            release_case_holds(case, actor)
            _sync_reports_final(case, Report.Status.DISMISSED, 'copyright_rejected', message, actor)
        elif action == 'close_insufficient':
            case.status = CopyrightCase.Status.INSUFFICIENT_INFO
            case.resolved_by = actor
            case.resolved_at = now
            case.last_action_by = actor
            case.save(update_fields=['status', 'resolved_by', 'resolved_at', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.RESTORED)
            release_case_holds(case, actor)
            _sync_reports_final(case, Report.Status.DISMISSED, 'copyright_insufficient_info', message, actor)
        elif action == 'escalate_legal':
            case.status = CopyrightCase.Status.ESCALATED_LEGAL
            case.severity = CopyrightCase.Severity.LEGAL
            case.last_action_by = actor
            case.save(update_fields=['status', 'severity', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.ACCESS_SUSPENDED)
            hold_case_earnings(case, actor, message or 'Copyright legal escalation')
        elif action == 'restore_release':
            case.status = CopyrightCase.Status.RESTORED
            case.resolved_by = actor
            case.resolved_at = now
            case.last_action_by = actor
            case.save(update_fields=['status', 'resolved_by', 'resolved_at', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.RESTORED)
            release_case_holds(case, actor)
            _sync_reports_final(case, Report.Status.DISMISSED, 'copyright_restored', message, actor)
        else:
            raise ValidationError({'action': 'Unsupported copyright action.'})

        _create_case_message(
            case,
            actor=actor,
            actor_role=CopyrightCaseMessage.ActorRole.ADMIN,
            message=message,
            response_type=response_type,
            visibility=visibility,
        )

    case = _case_queryset().get(id=case.id)

    if action == 'request_reporter_info':
        _notify_user(
            case.created_by,
            case,
            title='Copyright report needs more information',
            message=message or f'Please provide more information for "{_target_title(case)}".',
            code='copyright_reporter_info_required',
            action_url=f'/reports/my/{case.id}',
            sender=actor,
            email_kind='reporter_info',
            deadline=case.reporter_deadline_at,
        )
    elif action == 'request_instructor_response':
        instructor_user = case.instructor.user if case.instructor else None
        _notify_user(
            instructor_user,
            case,
            title='Copyright response required',
            message=message or f'Please respond to the copyright report for "{_target_title(case)}".',
            code='copyright_response_required',
            action_url=f'/instructor/reports/{case.id}',
            sender=actor,
            email_kind='instructor_response',
            deadline=case.instructor_deadline_at,
        )
    elif action in {'confirm_takedown', 'reject_restore', 'close_insufficient', 'restore_release'}:
        _notify_decision(
            case,
            actor,
            message or f'Copyright case for "{_target_title(case)}" has been decided: {case.status}.',
        )
    elif action == 'escalate_legal':
        _notify_decision(
            case,
            actor,
            message or f'Copyright case for "{_target_title(case)}" has been escalated for legal review.',
        )
    return case


INSTRUCTOR_OVERDUE_NOTICE = 'instructor_overdue_notice'


def process_overdue_cases(actor=None):
    """Quét các case bản quyền quá hạn và xử lý theo chính sách:
    - Reporter quá hạn bổ sung thông tin -> tự đóng 'thiếu thông tin' (khôi phục nội dung + release hold).
    - Instructor quá hạn phản hồi -> chỉ nhắc admin (đăng ghi chú hệ thống + thông báo), không tự đổi nội dung/earning.
    """
    now = timezone.now()
    auto_closed = 0
    admin_notified = 0

    reporter_overdue = CopyrightCase.objects.filter(
        status=CopyrightCase.Status.NEEDS_REPORTER_INFO,
        reporter_deadline_at__isnull=False,
        reporter_deadline_at__lt=now,
    ).values_list('id', flat=True)
    for case_id in list(reporter_overdue):
        admin_action(
            case_id,
            actor,
            'close_insufficient',
            message='Tự động đóng do người báo cáo quá hạn bổ sung thông tin.',
        )
        auto_closed += 1

    instructor_overdue = CopyrightCase.objects.filter(
        status=CopyrightCase.Status.AWAITING_INSTRUCTOR_RESPONSE,
        instructor_deadline_at__isnull=False,
        instructor_deadline_at__lt=now,
    )
    for case in instructor_overdue:
        if case.messages.filter(response_type=INSTRUCTOR_OVERDUE_NOTICE).exists():
            continue
        _create_case_message(
            case,
            actor=actor,
            actor_role=CopyrightCaseMessage.ActorRole.SYSTEM,
            message='Giảng viên đã quá hạn phản hồi. Cần admin xem xét xử lý (takedown / chuyển pháp lý / ngừng truy cập).',
            response_type=INSTRUCTOR_OVERDUE_NOTICE,
            visibility=CopyrightCaseMessage.Visibility.ADMIN_ONLY,
        )
        _notify_admins(
            case,
            title='Case bản quyền quá hạn phản hồi',
            message=f'Giảng viên quá hạn phản hồi cho "{_target_title(case)}". Cần xử lý thủ công.',
            code='copyright_case_instructor_overdue',
        )
        admin_notified += 1

    return {'auto_closed': auto_closed, 'admin_notified': admin_notified}
