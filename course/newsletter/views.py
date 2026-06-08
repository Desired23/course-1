from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError

from utils.pagination import paginate_queryset
from utils.permissions import RolePermissionFactory
from .serializers import (
    SubscriberSerializer,
    SubscribeSerializer,
    CampaignSerializer,
    CampaignCreateSerializer,
)
from .services import (
    subscribe_email,
    get_subscribers,
    get_campaigns,
    send_campaign,
)


class NewsletterSubscribeView(APIView):
    permission_classes = []
    throttle_scope = 'burst'

    def post(self, request):
        serializer = SubscribeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        try:
            subscribe_email(serializer.validated_data['email'])
            return Response(
                {"message": "Đăng ký bản tin thành công!"},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)


class NewsletterSubscriberListView(APIView):
    permission_classes = [RolePermissionFactory('admin')]
    throttle_scope = 'burst'

    def get(self, request):
        subscribers = get_subscribers()

        search = (request.query_params.get('search') or '').strip()
        if search:
            subscribers = subscribers.filter(email__icontains=search)

        return paginate_queryset(subscribers, request, SubscriberSerializer)


class NewsletterSendView(APIView):
    permission_classes = [RolePermissionFactory('admin')]
    throttle_scope = 'burst'

    def post(self, request):
        serializer = CampaignCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        result = send_campaign(
            subject=data['subject'],
            content=data['content'],
            audience=data['audience'],
            admin_user=request.user,
        )
        return Response(
            {
                "message": "Bản tin đang được gửi ở chế độ nền.",
                "recipient_count": result['recipient_count'],
            },
            status=status.HTTP_202_ACCEPTED,
        )


class NewsletterCampaignListView(APIView):
    permission_classes = [RolePermissionFactory('admin')]
    throttle_scope = 'burst'

    def get(self, request):
        campaigns = get_campaigns()
        return paginate_queryset(campaigns, request, CampaignSerializer)
