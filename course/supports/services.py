from rest_framework.exceptions import ValidationError
from utils.roles import is_active_admin

from .models import Support
from .serializers import SupportSerializer


def _is_admin(user):
    return is_active_admin(user)


def _assert_support_access(support, actor):
    if _is_admin(actor) or support.user_id == actor.id:
        return
    raise ValidationError("Bạn không có quyền truy cập ticket này.")


def _validate_course_deletion_request(payload, actor):
    """course_deletion_request: phải chọn course của chính mình (hoặc admin) + có lý do."""
    from courses.models import Course

    course_id = payload.get('course')
    if not course_id:
        raise ValidationError({"course": "Yêu cầu gỡ khóa học phải chọn khóa học."})
    if not (str(payload.get('message') or '').strip()):
        raise ValidationError({"message": "Vui lòng nêu lý do/mô tả yêu cầu."})
    try:
        course = Course.objects.get(id=course_id, is_deleted=False)
    except Course.DoesNotExist:
        raise ValidationError({"course": "Khóa học không tồn tại."})
    if _is_admin(actor):
        return
    instructor = getattr(actor, 'instructor', None)
    if not instructor or course.instructor_id != instructor.id:
        raise ValidationError("Bạn chỉ có thể gửi yêu cầu gỡ khóa học của chính mình.")


def create_support(data, actor):
    payload = dict(data)
    payload.pop('user', None)
    payload.pop('admin', None)
    payload.setdefault('name', actor.full_name)
    payload.setdefault('email', actor.email)
    if payload.get('ticket_type') == 'course_deletion_request':
        _validate_course_deletion_request(payload, actor)
    serializer = SupportSerializer(data=payload)
    if serializer.is_valid(raise_exception=True):
        support = serializer.save(user=actor)
        return SupportSerializer(support).data
    raise ValidationError(serializer.errors)


def resolve_support_request(support_id, action, actor, notes=''):
    """Admin thẩm định ticket (đặc biệt course_deletion_request) và thực thi
    side effect qua service course hiện có thay vì sửa field rời rạc."""
    if not _is_admin(actor):
        raise ValidationError("Bạn không có quyền xử lý yêu cầu hỗ trợ.")
    try:
        support = Support.objects.get(id=support_id)
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")

    action = (action or '').strip().lower()
    valid_actions = {'reject', 'archive', 'hide', 'hard_block', 'delete'}
    if action not in valid_actions:
        raise ValidationError({"action": f"Hành động không hợp lệ. Dùng: {', '.join(sorted(valid_actions))}"})

    # Nhãn quyết định ticket -> action chuẩn của course moderation.
    course_action_map = {'hide': 'suspend_sale', 'hard_block': 'freeze'}

    action_taken = None
    financial_summary = {}
    if action != 'reject':
        if not support.course_id:
            raise ValidationError({"course": "Ticket không gắn khóa học để xử lý."})
        if action == 'delete':
            from courses.services import delete_course
            delete_course(support.course_id, requesting_user=actor)
        else:
            from courses.services import moderate_course
            moderate_course(
                support.course_id,
                course_action_map.get(action, action),
                reason=notes or 'Xử lý yêu cầu hỗ trợ',
                actor=actor,
            )
        action_taken = action
        if action == 'hard_block':
            from payments.refund_services import force_refund_recent_course_purchases
            financial_summary['refund'] = force_refund_recent_course_purchases(
                support.course,
                actor,
                reason=notes or 'Forced refund because course access was permanently blocked',
            )

    support.status = 'resolved'
    support.resolution = {
        'decision': action,
        'action_taken': action_taken,
        'notes': (notes or '').strip(),
        'resolved_by': actor.id,
        'financial': financial_summary,
    }
    admin = getattr(actor, 'admin', None)
    if admin:
        support.admin = admin
    support.save(update_fields=['status', 'resolution', 'admin', 'updated_at'])

    from activity_logs.services import log_activity
    log_activity(
        user_id=actor.id,
        action="UPDATE",
        entity_type="Support",
        entity_id=support.id,
        description=f"Admin resolved support #{support.id} with action '{action}'",
    )
    return SupportSerializer(support).data

def get_support_by_id(support_id, actor):
    try:
        support = Support.objects.get(id=support_id)
        _assert_support_access(support, actor)
        return SupportSerializer(support).data
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error retrieving support request: {str(e)}")

def get_supports_by_user(user_id, actor):
    try:
        if not _is_admin(actor) and actor.id != int(user_id):
            raise ValidationError("Bạn không có quyền xem ticket của người dùng khác.")
        supports = Support.objects.filter(user=user_id)
        return supports
    except Exception as e:
        raise ValidationError(f"Error retrieving support requests: {str(e)}")

def get_all_supports(actor):
    try:
        if _is_admin(actor):
            return Support.objects.all()
        return Support.objects.filter(user=actor)
    except Exception as e:
        raise ValidationError(f"Error retrieving all support requests: {str(e)}")


def update_support(support_id, data, actor):
    try:
        support = Support.objects.get(id=support_id)
        _assert_support_access(support, actor)
        payload = dict(data)
        payload.pop('user', None)
        if not _is_admin(actor):
            for field in ('admin', 'status', 'priority'):
                payload.pop(field, None)
        serializer = SupportSerializer(support, data=payload, partial=True)
        if serializer.is_valid(raise_exception=True):
            updated_support = serializer.save()
            return SupportSerializer(updated_support).data
        raise ValidationError(serializer.errors)
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error updating support request: {str(e)}")


def update_admin_id(support_id, admin_id, actor):
    if not _is_admin(actor):
        raise ValidationError("Bạn không có quyền gán ticket cho admin.")
    try:
        from admins.models import Admin
        support = Support.objects.get(id=support_id)
        support.admin = Admin.objects.get(id=admin_id)
        support.save()
        return SupportSerializer(support).data
    except Support.DoesNotExist:
        raise ValidationError("Support request not found")
    except Exception as e:
        raise ValidationError(f"Error updating admin ID: {str(e)}")


def delete_support(support_id, actor):
    try:
        supports = Support.objects.all()
        support = supports.get(id=support_id)
        _assert_support_access(support, actor)
        support.delete()
        return {"message": "Support request deleted successfully"}
    except Exception as e:
        raise ValidationError(f"Error deleting support request: {str(e)}")
