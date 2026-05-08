import logging
from datetime import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from ..models import Conversation, ConversationMessage
from ..serializers import ConversationSerializer, ConversationMessageSerializer

logger = logging.getLogger(__name__)


class ConversationViewSet(ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        return Conversation.objects.all()

    def list(self, request, *args, **kwargs):
        user_id = request.user.id
        conversations = [
            conversation for conversation in Conversation.objects.all()
            if user_id in conversation.participant_ids
        ]
        total = len(conversations)

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

        items = conversations[offset:offset + limit]
        serializer = self.get_serializer(items, many=True)
        return Response({
            'items': serializer.data,
            'pageInfo': {
                'limit': limit,
                'offset': offset,
                'total': total,
                'hasMore': offset + limit < total,
            },
        })


class ConversationMessageViewSet(ModelViewSet):
    queryset = ConversationMessage.objects.all()
    serializer_class = ConversationMessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_conversation(self):
        conversation_id = self.kwargs.get('conversation_id')
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return None
        if self.request.user.id not in conversation.participant_ids:
            return None
        return conversation

    def get_queryset(self):
        conversation = self.get_conversation()
        if not conversation:
            return ConversationMessage.objects.none()
        return ConversationMessage.objects.filter(conversation=conversation)

    def list(self, request, conversation_id=None):
        conversation = self.get_conversation()
        if not conversation:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()
        before = request.query_params.get('before', None)
        if before:
            try:
                if before.endswith('Z'):
                    before = before[:-1]
                before_dt = datetime.fromisoformat(before)
            except ValueError:
                return Response({'detail': 'Invalid before timestamp.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = queryset.filter(created_at__lt=before_dt)

        queryset = queryset.order_by('-created_at')

        try:
            limit = int(request.query_params.get('limit', 50))
        except (TypeError, ValueError):
            limit = 50

        limit = max(1, min(limit, 100))
        total = queryset.count()
        items = queryset[:limit]
        serializer = self.get_serializer(items, many=True)
        return Response({
            'items': serializer.data,
            'pageInfo': {
                'limit': limit,
                'offset': 0,
                'total': total,
                'hasMore': total > limit,
            },
        })

    def create(self, request, conversation_id=None):
        conversation = self.get_conversation()
        if not conversation:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        body = request.data.get('body', '')
        if not isinstance(body, str) or not body.strip():
            return Response({'detail': 'Message body is required.'}, status=status.HTTP_400_BAD_REQUEST)

        message = ConversationMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            body=body.strip(),
        )
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=['last_message_at'])

        logger.info(
            'Conversation message created conversation_id=%s message_id=%s sender_id=%s',
            conversation.id,
            message.id,
            request.user.id,
        )

        serializer = self.get_serializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
