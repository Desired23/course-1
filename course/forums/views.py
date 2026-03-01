from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .services import (
    create_forum,
    get_forum_by_id,
    get_forums_by_course_id,
    get_all_forums,
    update_forum,
    delete_forum,
)
from utils.permissions import RolePermissionFactory
from utils.pagination import paginate_queryset
from .serializers import ForumSerializer

class ForumListView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]
    throttle_scope = 'burst'
    def get(self, request):
        try:
            if 'course_id' in request.query_params:
                course_id = request.query_params.get('course_id')
                forums = get_forums_by_course_id(course_id)
                return paginate_queryset(forums, request, ForumSerializer)
            elif 'forum_id' in request.query_params:
                forum_id = request.query_params.get('forum_id')
                forum = get_forum_by_id(forum_id)
                return Response(forum, status=status.HTTP_200_OK)
            else:
                forums = get_all_forums()
                return paginate_queryset(forums, request, ForumSerializer)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        try:
            forum = create_forum(request.data)
            return Response(forum, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, forum_id):
        try:
            updated_forum = update_forum(forum_id, request.data)
            return Response(updated_forum, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, forum_id):
        try:
            result = delete_forum(forum_id)
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"errors": str(e)}, status=status.HTTP_404_NOT_FOUND)