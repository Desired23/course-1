import jwt
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User

from .services import get_search_suggestions, track_search_event


def _get_optional_authenticated_user(request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get('token_type') == 'refresh':
            return None
        user = User.objects.select_related('instructor', 'admin').get(id=payload["user_id"])
        if user.status != User.StatusChoices.ACTIVE:
            return None
        return user
    except Exception:
        return None


class SearchSuggestionsView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'search'

    def get(self, request):
        user = _get_optional_authenticated_user(request)
        return Response(get_search_suggestions(user=user), status=status.HTTP_200_OK)


class SearchTrackView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'search'

    def post(self, request):
        try:
            user = _get_optional_authenticated_user(request)
            event = track_search_event(
                query=request.data.get('query', ''),
                source=request.data.get('source', ''),
                user=user,
            )
            return Response(
                {
                    'message': 'Search tracked successfully.',
                    'id': event.id,
                },
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response({"errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)

