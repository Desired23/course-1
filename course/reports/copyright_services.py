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


def _course_flags(course):
    if not course:
        return None
    return {
        'status': course.status,
        'admin_hidden': course.admin_hidden,
        'is_hard_blocked': course.is_hard_blocked,
    }


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
            import threading
            # Resolve everything that touches the ORM here (request thread); the
            # worker thread only performs the blocking SMTP send.
            full_url = _frontend_url(action_url)
            course_title = _target_title(case)
            user_email = user.email
            user_name = user.full_name

            def _send():
                try:
                    if email_kind == 'reporter_info':
                        send_copyright_reporter_info_required(user_email, user_name, course_title, full_url, deadline)
                    elif email_kind == 'instructor_response':
                        send_copyright_instructor_response_required(user_email, user_name, course_title, full_url, deadline)
                    elif email_kind == 'decision':
                        send_copyright_case_decision(user_email, user_name, course_title, message, full_url)
                except Exception:
                    pass

            threading.Thread(target=_send, daemon=True).start()
        except Exception:
            pass


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
    for user in [reporter, instructor_user]:
        _notify_user(
            user,
            case,
            title='Copyright case decision',
            message=message,
            code='copyright_case_decision',
            action_url=None,
            sender=actor,
            email_kind='decision',
        )


STRIKE_BAN_THRESHOLD = 3


def _create_strike(case, actor, reason=''):
    from .models import InstructorStrike
    if not case.instructor_id:
        return None
    existing = InstructorStrike.objects.filter(source_case=case, revoked_at__isnull=True).first()
    if existing:
        return existing
    return InstructorStrike.objects.create(
        instructor_id=case.instructor_id,
        source_case=case,
        reason=reason or f'Copyright takedown case #{case.id}',
        severity='copyright',
        created_by=actor,
    )


def _active_strike_count(instructor_id):
    from .models import InstructorStrike
    return InstructorStrike.objects.filter(instructor_id=instructor_id, revoked_at__isnull=True).count()


def _ban_instructor_for_strikes(case, actor):
    """Strike thứ 3: ban tài khoản + ẩn TOÀN BỘ course của instructor khỏi marketplace.
    Không hard-block các course không vi phạm (học viên cũ vẫn học được)."""
    from courses.models import Course

    instructor = case.instructor
    user = instructor.user if instructor else None
    if user and user.status != 'banned':
        user.status = 'banned'
        user.save(update_fields=['status'])
        from users.services import invalidate_all_sessions
        invalidate_all_sessions(user.id)
    hidden = (
        Course.objects
        .filter(instructor_id=case.instructor_id, is_deleted=False, admin_hidden=False)
        .exclude(id=case.course_id)
        .update(admin_hidden=True, updated_at=timezone.now())
    )
    return {'banned_user_id': user.id if user else None, 'courses_hidden': hidden}


def _handle_strike_consequences(case, actor, count_as_strike=True):
    result = {'strike_created': False, 'active_strikes': None, 'auto_banned': False}

    if count_as_strike and case.instructor_id:
        strike = _create_strike(case, actor)
        result['strike_created'] = bool(strike)
        active = _active_strike_count(case.instructor_id)
        result['active_strikes'] = active
        if active >= STRIKE_BAN_THRESHOLD:
            result['ban'] = _ban_instructor_for_strikes(case, actor)
            result['auto_banned'] = True
    return result


def _handle_takedown_consequences(case, actor, count_as_strike=True, with_refund=True):
    """Hệ quả của takedown: forced refund (Plan 4) + strike/auto-ban (Plan 5).

    Cả refund lẫn strike đều optional — admin có thể bỏ qua và xử lý riêng ở
    trang quản lý refund / quản lý vi phạm.
    """
    result = _handle_strike_consequences(case, actor, count_as_strike=count_as_strike)

    if with_refund and case.course_id:
        try:
            from payments.refund_services import force_refund_recent_course_purchases
            result['refund'] = force_refund_recent_course_purchases(case.course, actor, source_case=case)
        except Exception as exc:
            result['refund'] = {'error': str(exc)}

    return result


def get_or_create_admin_case(course_id, actor):
    """Tìm (hoặc tạo) một copyright case cho khóa học, do admin chủ động mở
    (không gắn report của người dùng). Dùng khi admin xử lý vi phạm trực tiếp
    từ trang quản lý khóa học — để vẫn chạy qua cùng pipeline case/hold/refund."""
    from courses.models import Course

    course = (
        Course.objects
        .filter(id=course_id, is_deleted=False)
        .select_related('instructor__user')
        .first()
    )
    if not course:
        raise ValidationError({'course': 'Course not found.'})

    with transaction.atomic():
        case = (
            CopyrightCase.objects
            .select_for_update()
            .filter(target_type=Report.TargetType.COURSE, target_id=course_id)
            .exclude(status__in=FINAL_STATUSES)
            .first()
        )
        if not case:
            case = CopyrightCase.objects.create(
                target_type=Report.TargetType.COURSE,
                target_id=course_id,
                course=course,
                instructor=course.instructor,
                created_by=actor,
                last_action_by=actor,
            )
    return case


def admin_action(case_id, actor, action, message='', severity=None,
                 count_as_strike=True, with_refund=True, with_hold=True):
    with transaction.atomic():
        case = CopyrightCase.objects.select_for_update().select_related(
            'course', 'lesson', 'instructor__user', 'created_by'
        ).get(id=case_id)
        visibility = CopyrightCaseMessage.Visibility.ADMIN_ONLY
        response_type = action
        now = timezone.now()
        prev_flags = _course_flags(case.course)
        financial_summary = {}

        if action == 'suspend_sale':
            case.severity = severity or CopyrightCase.Severity.MEDIUM
            case.status = CopyrightCase.Status.UNDER_REVIEW
            case.last_action_by = actor
            case.save(update_fields=['severity', 'status', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.SALE_SUSPENDED)
            if with_hold:
                financial_summary = hold_case_earnings(case, actor, message or 'Copyright report sale suspension')
        elif action == 'freeze':
            case.severity = severity or CopyrightCase.Severity.HIGH
            case.status = CopyrightCase.Status.UNDER_REVIEW
            case.last_action_by = actor
            case.save(update_fields=['severity', 'status', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.ACCESS_SUSPENDED)
            if with_hold:
                financial_summary = hold_case_earnings(case, actor, message or 'Copyright report access suspension')
            financial_summary['strike'] = _handle_strike_consequences(
                case, actor, count_as_strike=count_as_strike
            )
        elif action == 'takedown':
            case.status = CopyrightCase.Status.TAKEDOWN
            case.severity = CopyrightCase.Severity.CONFIRMED
            case.resolved_by = actor
            case.resolved_at = now
            case.last_action_by = actor
            case.save(update_fields=['status', 'severity', 'resolved_by', 'resolved_at', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.TAKEDOWN)
            if with_hold:
                financial_summary = adjust_case_earnings(case, actor)
            financial_summary['takedown'] = _handle_takedown_consequences(
                case, actor, count_as_strike=count_as_strike, with_refund=with_refund
            )
            _sync_reports_final(case, Report.Status.RESOLVED, 'copyright_takedown', message, actor)
        elif action == 'restore':
            case.status = CopyrightCase.Status.RESTORED
            case.resolved_by = actor
            case.resolved_at = now
            case.last_action_by = actor
            case.save(update_fields=['status', 'resolved_by', 'resolved_at', 'last_action_by', 'updated_at'])
            _apply_content_action(case, CopyrightCase.ContentAction.RESTORED)
            financial_summary = {'released_holds': release_case_holds(case, actor)}
            _sync_reports_final(case, Report.Status.DISMISSED, 'copyright_restored', message, actor)
        else:
            raise ValidationError({'action': 'Unsupported copyright action.'})

        if case.course_id:
            case.course.refresh_from_db()
        audit_metadata = {
            'previous_course_flags': prev_flags,
            'next_course_flags': _course_flags(case.course),
            'financial': financial_summary,
        }
        _create_case_message(
            case,
            actor=actor,
            actor_role=CopyrightCaseMessage.ActorRole.ADMIN,
            message=message,
            response_type=response_type,
            metadata=audit_metadata,
            visibility=visibility,
        )

    case = _case_queryset().get(id=case.id)

    if action in {'takedown', 'restore'}:
        _notify_decision(
            case,
            actor,
            message or f'Copyright case for "{_target_title(case)}" has been decided: {case.status}.',
        )
    return case
