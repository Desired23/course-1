import logging
import jwt
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
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
    create_advisor_draft_path,
    create_learning_path,
    get_learning_path_advisor_stats,
    get_learning_path_for_admin,
    get_learning_path_for_user,
    get_learning_paths_for_user,
    merge_advisor_messages,
    upsert_path_conversation,
    update_learning_path_from_advisor,
)
from .models import LearningPath


logger = logging.getLogger(__name__)


def advisor_response(data, status_code, contract_version):
    response = Response(data, status=status_code)
    response['X-Advisor-Contract'] = contract_version
    return response


def get_optional_user(request):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return User.objects.select_related('instructor', 'admin').get(id=payload['user_id'])
    except Exception:
        return None


class LearningPathAdvisorChatView(APIView):
    def post(self, request):
        contract_version = resolve_advisor_contract_version(request)
        serializer = LearningPathAdvisorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        optional_user = get_optional_user(request)
        path_id = payload.get('path_id')
        persist_conversation = bool(payload.get('persist_conversation'))
        if path_id and not optional_user:
            return advisor_response(
                wrap_http_error(contract_version, code='unauthorized', message='Authentication required for path recalculation context.'),
                status.HTTP_401_UNAUTHORIZED,
                contract_version,
            )

        try:
            path = None
            merged_messages = payload.get('messages') or []
            if path_id:
                path = get_learning_path_for_user(path_id, optional_user)
                existing_messages = []
                if hasattr(path, 'conversation') and path.conversation:
                    existing_messages = path.conversation.messages or []
                merged_messages = merge_advisor_messages(existing_messages, merged_messages)

            result = advisor_chat(
                goal_text=payload['goal_text'],
                weekly_hours=payload.get('weekly_hours'),
                messages=merged_messages,
                known_skills=payload.get('known_skills') or [],
            )

            assistant_message = (result.get('message') or '').strip() if result.get('type') == 'question' else (result.get('summary') or '').strip()
            should_persist = bool(path) or (persist_conversation and optional_user)
            if should_persist:
                updated_messages = merge_advisor_messages(
                    merged_messages,
                    [{'role': 'assistant', 'content': assistant_message}] if assistant_message else [],
                )
                if not path:
                    path = create_advisor_draft_path(
                        user=optional_user,
                        goal_text=payload['goal_text'],
                        summary=result.get('summary') if result.get('type') == 'path' else '',
                        estimated_weeks=result.get('estimated_weeks') if result.get('type') == 'path' else 0,
                        messages=updated_messages,
                        advisor_meta=result.get('advisor_meta') or {},
                    )
                else:
                    upsert_path_conversation(path, updated_messages, result.get('advisor_meta') or {})

            if path:
                result = {**result, 'path_id': path.id}

            return advisor_response(wrap_http_success(contract_version, result), status.HTTP_200_OK, contract_version)
        except AdvisorUpstreamError as exc:
            logger.warning(
                'advisor_chat_upstream_error contract=%s path_id=%s error=%s',
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


class LearningPathAdvisorChatStreamView(APIView):
    def post(self, request):
        contract_version = resolve_advisor_contract_version(request)
        serializer = LearningPathAdvisorRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        optional_user = get_optional_user(request)
        path_id = payload.get('path_id')
        persist_conversation = bool(payload.get('persist_conversation'))
        if path_id and not optional_user:
            return advisor_response(
                wrap_http_error(contract_version, code='unauthorized', message='Authentication required for path recalculation context.'),
                status.HTTP_401_UNAUTHORIZED,
                contract_version,
            )

        try:
            path = None
            merged_messages = payload.get('messages') or []
            if path_id:
                path = get_learning_path_for_user(path_id, optional_user)
                existing_messages = []
                if hasattr(path, 'conversation') and path.conversation:
                    existing_messages = path.conversation.messages or []
                merged_messages = merge_advisor_messages(existing_messages, merged_messages)
        except ValidationError as exc:
            return advisor_response(
                wrap_http_error(contract_version, code='invalid_request', message=str(exc)),
                status.HTTP_400_BAD_REQUEST,
                contract_version,
            )

        def stream():
            nonlocal path
            try:
                for event in advisor_chat_stream(
                    goal_text=payload['goal_text'],
                    weekly_hours=payload.get('weekly_hours'),
                    messages=merged_messages,
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
                        assistant_message = (result.get('message') or '').strip() if result.get('type') == 'question' else (result.get('summary') or '').strip()
                        should_persist = bool(path) or (persist_conversation and optional_user)
                        if should_persist:
                            updated_messages = merge_advisor_messages(
                                merged_messages,
                                [{'role': 'assistant', 'content': assistant_message}] if assistant_message else [],
                            )
                            if not path:
                                path = create_advisor_draft_path(
                                    user=optional_user,
                                    goal_text=payload['goal_text'],
                                    summary=result.get('summary') if result.get('type') == 'path' else '',
                                    estimated_weeks=result.get('estimated_weeks') if result.get('type') == 'path' else 0,
                                    messages=updated_messages,
                                    advisor_meta=result.get('advisor_meta') or {},
                                )
                            else:
                                upsert_path_conversation(path, updated_messages, result.get('advisor_meta') or {})

                        if path:
                            result = {**result, 'path_id': path.id}
                        yield sse_event('final', {'result': result}, contract_version)
                        return
            except ValidationError as exc:
                logger.info('advisor_stream_validation_error contract=%s path_id=%s', contract_version, path_id)
                yield sse_event('error', {'message': str(exc), 'code': 'invalid_request'}, contract_version)
            except AdvisorUpstreamError as exc:
                logger.warning(
                    'advisor_stream_upstream_error contract=%s path_id=%s error=%s',
                    contract_version,
                    path_id,
                    str(exc),
                )
                yield sse_event('error', {'message': str(exc), 'code': 'upstream_unavailable'}, contract_version)
            except Exception as exc:
                logger.exception('advisor_stream_internal_error contract=%s path_id=%s', contract_version, path_id)
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
                messages=payload.get('messages') or [],
                advisor_meta=payload.get('advisor_meta') or {},
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
            existing_messages = []
            if hasattr(path, 'conversation') and path.conversation:
                existing_messages = path.conversation.messages or []
            merged_messages = merge_advisor_messages(existing_messages, payload.get('messages') or [])

            result = advisor_chat(
                goal_text=payload['goal_text'],
                weekly_hours=payload.get('weekly_hours'),
                messages=merged_messages,
                known_skills=payload.get('known_skills') or [],
            )
            if result.get('type') != 'path':
                question_message = result.get('message') or ''
                updated_messages = merge_advisor_messages(
                    merged_messages,
                    [{'role': 'assistant', 'content': question_message}] if question_message else [],
                )
                upsert_path_conversation(path, updated_messages, result.get('advisor_meta') or {})
                return advisor_response(wrap_http_success(contract_version, result), status.HTTP_200_OK, contract_version)
            updated_path = update_learning_path_from_advisor(path, result, merged_messages)
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


class LearningPathAdvisorStatsView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def get(self, request):
        provider = (request.query_params.get('provider') or '').strip().lower() or None
        if provider not in {None, 'gemini', 'rule_based'}:
            return Response({'errors': 'Invalid provider filter.'}, status=status.HTTP_400_BAD_REQUEST)

        limit_param = request.query_params.get('limit')
        try:
            limit = max(1, min(50, int(limit_param or 10)))
        except ValueError:
            return Response({'errors': 'Invalid limit filter.'}, status=status.HTTP_400_BAD_REQUEST)

        fallback_only = (request.query_params.get('fallback_only') or '').strip().lower() in {'1', 'true', 'yes'}
        stats = get_learning_path_advisor_stats(limit=limit, provider=provider, fallback_only=fallback_only)
        return Response(stats, status=status.HTTP_200_OK)


class LearningPathAdminDetailView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def get(self, request, path_id):
        try:
            path = get_learning_path_for_admin(path_id)
            return Response(LearningPathDetailSerializer(path).data, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({'errors': str(exc)}, status=status.HTTP_404_NOT_FOUND)


class LearningPathAdminActionView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def post(self, request, path_id):
        action = (request.data.get('action') or '').strip().lower()
        if action not in {'delete', 'archive', 'restore'}:
            return Response({'errors': 'Unsupported action.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            path = get_learning_path_for_admin(path_id)
            if action == 'delete':
                path.delete()
                return Response({'ok': True, 'action': 'delete', 'path_id': path_id}, status=status.HTTP_200_OK)

            if action == 'archive':
                path.is_archived = True
                path.save(update_fields=['is_archived', 'updated_at'])
                return Response({'ok': True, 'action': 'archive', 'path_id': path_id}, status=status.HTTP_200_OK)

            path.is_archived = False
            path.save(update_fields=['is_archived', 'updated_at'])
            return Response({'ok': True, 'action': 'restore', 'path_id': path_id}, status=status.HTTP_200_OK)
        except ValidationError as exc:
            return Response({'errors': str(exc)}, status=status.HTTP_404_NOT_FOUND)


class LearningPathAdminBulkActionView(APIView):
    permission_classes = [RolePermissionFactory(['admin'])]

    def post(self, request):
        action = (request.data.get('action') or '').strip().lower()
        path_ids = request.data.get('path_ids') or []

        if action not in {'delete', 'archive', 'restore'}:
            return Response({'errors': 'Unsupported action.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(path_ids, list) or not path_ids:
            return Response({'errors': 'path_ids must be a non-empty list.'}, status=status.HTTP_400_BAD_REQUEST)

        normalized_ids = []
        for raw_id in path_ids:
            try:
                normalized_id = int(raw_id)
            except (TypeError, ValueError):
                return Response({'errors': 'Each path_id must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)
            if normalized_id <= 0:
                return Response({'errors': 'Each path_id must be > 0.'}, status=status.HTTP_400_BAD_REQUEST)
            normalized_ids.append(normalized_id)

        existing_ids = list(
            LearningPath.objects.filter(id__in=normalized_ids)
            .values_list('id', flat=True)
        )
        if not existing_ids:
            return Response({'ok': True, 'action': action, 'affected_count': 0, 'affected_ids': []}, status=status.HTTP_200_OK)

        if action == 'archive':
            affected_count = LearningPath.objects.filter(id__in=existing_ids).update(is_archived=True)
            return Response(
                {
                    'ok': True,
                    'action': 'archive',
                    'affected_count': affected_count,
                    'affected_ids': existing_ids,
                },
                status=status.HTTP_200_OK,
            )

        if action == 'restore':
            affected_count = LearningPath.objects.filter(id__in=existing_ids).update(is_archived=False)
            return Response(
                {
                    'ok': True,
                    'action': 'restore',
                    'affected_count': affected_count,
                    'affected_ids': existing_ids,
                },
                status=status.HTTP_200_OK,
            )

        LearningPath.objects.filter(id__in=existing_ids).delete()
        return Response(
            {
                'ok': True,
                'action': 'delete',
                'deleted_count': len(existing_ids),
                'deleted_ids': existing_ids,
            },
            status=status.HTTP_200_OK,
        )
