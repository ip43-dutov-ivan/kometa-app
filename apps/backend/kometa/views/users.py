import logging
import os
import uuid

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from ..models import Feedback, User
from ..serializers import FeedbackSerializer, UserSerializer

logger = logging.getLogger(__name__)


class UserViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'patch', 'delete'])
    def me(self, request):
        if request.method == 'GET':
            serializer = UserSerializer(request.user)
            return Response(serializer.data)

        if request.method == 'DELETE':
            user = request.user
            user_id = user.id

            avatar_url = user.avatar_url
            if avatar_url:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(avatar_url)
                    url_path = parsed.path
                    media_url = settings.MEDIA_URL.rstrip('/')
                    if url_path.startswith(media_url):
                        relative = url_path[len(media_url):].lstrip('/')
                        file_path = os.path.join(settings.MEDIA_ROOT, relative)
                        if os.path.isfile(file_path):
                            os.remove(file_path)
                except Exception:
                    logger.warning('Failed to delete avatar file for user_id=%s', user_id)

            user.delete()
            logger.info('User account deleted user_id=%s', user_id)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info('User profile updated user_id=%s', request.user.id)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='upload-avatar')
    def upload_avatar(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if not file.content_type.startswith('image/'):
            return Response({'detail': 'File must be an image.'}, status=status.HTTP_400_BAD_REQUEST)

        if file.size > 5 * 1024 * 1024:
            return Response({'detail': 'File size must not exceed 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file.name)[1].lower() or '.jpg'
        filename = f'{uuid.uuid4()}{ext}'
        avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
        os.makedirs(avatar_dir, exist_ok=True)

        file_path = os.path.join(avatar_dir, filename)
        with open(file_path, 'wb+') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        avatar_url = request.build_absolute_uri(f'{settings.MEDIA_URL}avatars/{filename}')
        request.user.avatar_url = avatar_url
        request.user.save(update_fields=['avatar_url'])
        logger.info('Avatar uploaded user_id=%s', request.user.id)

        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=['get'], url_path='feedback')
    def feedback(self, request, pk=None):
        user = self.get_object()
        feedback_qs = Feedback.objects.filter(receiver=user)
        total = feedback_qs.count()

        try:
            limit = int(request.query_params.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        try:
            offset = int(request.query_params.get('offset', 0))
        except (TypeError, ValueError):
            offset = 0

        limit = max(1, min(limit, 100))
        offset = max(0, offset)

        items = feedback_qs[offset:offset + limit]
        serializer = FeedbackSerializer(items, many=True)

        return Response({
            'items': serializer.data,
            'pageInfo': {
                'limit': limit,
                'offset': offset,
                'total': total,
                'hasMore': offset + limit < total,
            },
        })

    @action(detail=True, methods=['post'], url_path='block')
    def block(self, request, pk=None):
        if not request.user.is_staff:
            logger.warning(
                'Admin action denied action=block actor_id=%s target_user_id=%s',
                request.user.id,
                pk,
            )
            return Response(
                {'detail': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        user = self.get_object()
        reason = request.data.get('reason', '')
        user.account_status = 'blocked'
        user.blocked_reason = reason
        user.blocked_at = timezone.now()
        user.save()
        logger.info(
            'User blocked actor_id=%s target_user_id=%s',
            request.user.id,
            user.id,
        )
        serializer = UserSerializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='unblock')
    def unblock(self, request, pk=None):
        if not request.user.is_staff:
            logger.warning(
                'Admin action denied action=unblock actor_id=%s target_user_id=%s',
                request.user.id,
                pk,
            )
            return Response(
                {'detail': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        user = self.get_object()
        user.account_status = 'active'
        user.blocked_reason = ''
        user.blocked_at = None
        user.save()
        logger.info(
            'User unblocked actor_id=%s target_user_id=%s',
            request.user.id,
            user.id,
        )
        serializer = UserSerializer(user)
        return Response(serializer.data)
