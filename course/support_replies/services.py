from rest_framework.exceptions import ValidationError
from .models import SupportReply
from .serializers import SupportReplySerializer
from supports.models import Support
from utils.roles import is_active_admin
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging


logger = logging.getLogger(__name__)


def _broadcast_support_reply(ticket_id, reply_data):
    channel_layer = get_channel_layer()
    if not channel_layer or not ticket_id:
        return
    async_to_sync(channel_layer.group_send)(
        f"support_{ticket_id}",
        {"type": "send_support_reply", "data": {"action": "reply_created", "reply": reply_data}},
    )


def _is_admin(user):
    return is_active_admin(user)


def _assert_reply_access(reply, actor):
    if _is_admin(actor) or reply.user_id == actor.id or reply.support.user_id == actor.id:
        return
    raise ValidationError({"error": "Bạn không có quyền truy cập phản hồi này."})


def _assert_support_access(support, actor):
    if _is_admin(actor) or support.user_id == actor.id:
        return
    raise ValidationError({"error": "Bạn không có quyền truy cập ticket này."})


def create_support_reply(data, actor):
    try:
        support_id = data.get('support')
        if not support_id:
            raise ValidationError({"error": "support is required."})
        support = Support.objects.get(id=support_id)
        _assert_support_access(support, actor)
        payload = dict(data)
        payload.pop('user', None)
        payload.pop('admin', None)
        serializer = SupportReplySerializer(data=payload)
        if serializer.is_valid(raise_exception=True):
            save_kwargs = {'user': actor}
            if _is_admin(actor):
                save_kwargs['admin'] = actor.admin
            support_reply = serializer.save(**save_kwargs)
            _send_admin_reply_notification(support_reply)
            reply_data = SupportReplySerializer(support_reply).data
            try:
                _broadcast_support_reply(support_reply.support_id, dict(reply_data))
            except Exception:
                pass
            return reply_data
    except Support.DoesNotExist:
        raise ValidationError({"error": "Support request not found."})
    except ValidationError as e:
        raise ValidationError({"error": "Invalid data provided.", "details": e.detail})


def _send_admin_reply_notification(reply):
    if not reply.admin_id:
        return
    ticket = reply.support
    recipient = ticket.user
    if not recipient or not recipient.email:
        return
    try:
        from utils.mailer.mailer import send_email

        sent = send_email(
            subject=f'[Ticket #{ticket.id}] Support reply: {ticket.subject}',
            to=recipient.email,
            template_name='support_reply_notification.html',
            context={
                'ticket_id': ticket.id,
                'user_name': recipient.full_name or recipient.email,
                'ticket_subject': ticket.subject,
                'reply_message': reply.message,
                'ticket_status': ticket.status,
            },
        )
        if not sent:
            logger.warning('Failed to send support reply notification for ticket %s', ticket.id)
    except Exception as exc:
        logger.warning('Failed to send support reply notification: %s', exc)


def get_support_replies(support_id, actor):
    try:
        support = Support.objects.get(id=support_id)
        _assert_support_access(support, actor)
        replies = SupportReply.objects.filter(support=support_id)
        return replies
    except Support.DoesNotExist:
        raise ValidationError({"error": "Support request not found."})
def get_support_reply_by_id(reply_id, actor):
    try:
        reply = SupportReply.objects.get(id=reply_id)
        _assert_reply_access(reply, actor)
        serializer = SupportReplySerializer(reply)
        return serializer.data
    except SupportReply.DoesNotExist:
        raise ValidationError({"error": "Support reply not found."})
def delete_support_reply(reply_id, actor):
    try:
        reply = SupportReply.objects.get(id=reply_id)
        _assert_reply_access(reply, actor)
        reply.delete()
        return {"message": "Support reply deleted successfully."}
    except SupportReply.DoesNotExist:
        raise ValidationError({"error": "Support reply not found."})
