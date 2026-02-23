from rest_framework.exceptions import ValidationError
from .models import SupportReply
from .serializers import SupportReplySerializer


def create_support_reply(data):
    try:
        serializer = SupportReplySerializer(data=data)
        if serializer.is_valid(raise_exception=True):
            support_reply = serializer.save()
            return support_reply
    except ValidationError as e:
        raise ValidationError({"error": "Invalid data provided.", "details": e.detail})
def get_support_replies(support_id):
    try:
        replies = SupportReply.objects.filter(support=support_id)
        return replies
    except SupportReply.DoesNotExist:
        raise ValidationError({"error": "Support request not found."})
def get_support_reply_by_id(reply_id):
    try:
        reply = SupportReply.objects.get(id=reply_id)
        serializer = SupportReplySerializer(reply)
        return serializer.data
    except SupportReply.DoesNotExist:
        raise ValidationError({"error": "Support reply not found."})
def delete_support_reply(reply_id):
    try:
        reply = SupportReply.objects.get(id=reply_id)
        reply.delete()
        return {"message": "Support reply deleted successfully."}
    except SupportReply.DoesNotExist:
        raise ValidationError({"error": "Support reply not found."})
