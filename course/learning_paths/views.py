import logging
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.pagination import paginate_queryset
from utils.permissions import RolePermissionFactory

from .serializers import (
    LearningPathAdvisorRequestSerializer,
    LearningPathCreateSerializer,
    LearningPathDetailSerializer,
    LearningPathListSerializer,
)
from .contracts import resolve_advisor_contract_version, sse_event, wrap_http_error, wrap_http_success
from .services import (
    AdvisorUpstreamError,
    advisor_chat,
    advisor_chat_stream,
    create_learning_path,
    get_learning_path_for_user,
    get_learning_paths_for_user,
    update_learning_path_from_advisor,
)


logger = logging.getLogger(__name__)


def advisor_response(data, status_code, contract_version):
    response = Response(data, status=status_code)
    response['X-Advisor-Contract'] = contract_version
    return response


class LearningPathAdvisorChatView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def post(self, request):
        contract_version = resolve_advisor_contract_version(request)
        serializer = LearningPathAdvisorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            result = advisor_chat(
                goal_text=payload['goal_text'],
                weekly_hours=payload.get('weekly_hours'),
                messages=payload.get('messages') or [],
                known_skills=payload.get('known_skills') or [],
            )
            return advisor_response(wrap_http_success(contract_version, result), status.HTTP_200_OK, contract_version)
        except AdvisorUpstreamError as exc:
            logger.warning(
                'advisor_chat_upstream_error contract=%s error=%s',
                contract_version,
                str(exc),
            )
            return advisor_response(
                wrap_http_error(contract_version, code='upstream_unavailable', message=str(exc)),
                status.HTTP_503_SERVICE_UNAVAILABLE,
                contract_version,
            )
        except ValidationError as exc:
            return advisor_response(
                wrap_http_error(contract_version, code='invalid_request', message=str(exc)),
                status.HTTP_400_BAD_REQUEST,
                contract_version,
            )


class LearningPathAdvisorChatStreamView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def post(self, request):
        contract_version = resolve_advisor_contract_version(request)
        serializer = LearningPathAdvisorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        def stream():
            try:
                for event in advisor_chat_stream(
                    goal_text=payload['goal_text'],
                    weekly_hours=payload.get('weekly_hours'),
                    messages=payload.get('messages') or [],
                    known_skills=payload.get('known_skills') or [],
                ):
                    event_type = event.get('event')
                    if event_type == 'delta':
                        yield sse_event(
                            'delta',
                            {'delta': event.get('delta', ''), 'attempt': event.get('attempt')},
                            contract_version,
                        )
                        continue

                    if event_type == 'final':
                        result = event.get('result') or {}
                        yield sse_event('final', {'result': result}, contract_version)
                        return
            except ValidationError as exc:
                logger.info('advisor_stream_validation_error contract=%s', contract_version)
                yield sse_event('error', {'message': str(exc), 'code': 'invalid_request'}, contract_version)
            except AdvisorUpstreamError as exc:
                logger.warning(
                    'advisor_stream_upstream_error contract=%s error=%s',
                    contract_version,
                    str(exc),
                )
                yield sse_event('error', {'message': str(exc), 'code': 'upstream_unavailable'}, contract_version)
            except Exception as exc:
                logger.exception('advisor_stream_internal_error contract=%s', contract_version)
                yield sse_event('error', {'message': str(exc), 'code': 'internal_error'}, contract_version)

        response = StreamingHttpResponse(stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['X-Advisor-Contract'] = contract_version
        return response


class LearningPathListCreateView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def get(self, request):
        queryset = get_learning_paths_for_user(request.user)
        return paginate_queryset(queryset, request, LearningPathListSerializer)

    def post(self, request):
        serializer = LearningPathCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        try:
            path = create_learning_path(
                user=request.user,
                goal_text=payload['goal_text'],
                summary=payload['summary'],
                estimated_weeks=payload['estimated_weeks'],
                path_items=payload['path'],
            )
            return Response(LearningPathDetailSerializer(path).data, status=status.HTTP_201_CREATED)
        except ValidationError as exc:
            return Response({'errors': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class LearningPathDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def get(self, request, path_id):
        try:
            path = get_learning_path_for_user(path_id, request.user)
            return Response(LearningPathDetailSerializer(path).data, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({'errors': str(exc)}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, path_id):
        try:
            path = get_learning_path_for_user(path_id, request.user)
            path.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as exc:
            return Response({'errors': str(exc)}, status=status.HTTP_404_NOT_FOUND)


class LearningPathRecalculateView(APIView):
    permission_classes = [RolePermissionFactory(['admin', 'instructor', 'student'])]

    def post(self, request, path_id):
        contract_version = resolve_advisor_contract_version(request)
        serializer = LearningPathAdvisorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        try:
            path = get_learning_path_for_user(path_id, request.user)

            result = advisor_chat(
                goal_text=payload['goal_text'],
                weekly_hours=payload.get('weekly_hours'),
                messages=payload.get('messages') or [],
                known_skills=payload.get('known_skills') or [],
            )
            if result.get('type') != 'path':
                return advisor_response(wrap_http_success(contract_version, result), status.HTTP_200_OK, contract_version)
            updated_path = update_learning_path_from_advisor(path, result)
            return advisor_response(
                wrap_http_success(contract_version, LearningPathDetailSerializer(updated_path).data),
                status.HTTP_200_OK,
                contract_version,
            )
        except AdvisorUpstreamError as exc:
            logger.warning(
                'advisor_recalculate_upstream_error contract=%s path_id=%s error=%s',
                contract_version,
                path_id,
                str(exc),
            )
            return advisor_response(
                wrap_http_error(contract_version, code='upstream_unavailable', message=str(exc)),
                status.HTTP_503_SERVICE_UNAVAILABLE,
                contract_version,
            )
        except ValidationError as exc:
            return advisor_response(
                wrap_http_error(contract_version, code='invalid_request', message=str(exc)),
                status.HTTP_400_BAD_REQUEST,
                contract_version,
            )
