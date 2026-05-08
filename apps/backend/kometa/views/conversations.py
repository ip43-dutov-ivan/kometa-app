import logging
from datetime import datetime

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from ..chat_realtime import (
    create_conversation_message,
    mark_conversation_read,
    publish_conversation_read_sync,
    publish_chat_message_sync,
    serialize_chat_message,
)
from ..models import Conversation, ConversationMessage, ConversationReadState
from ..serializers import ConversationSerializer, ConversationMessageSerializer

logger = logging.getLogger(__name__)


class ConversationViewSet(ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return Conversation.objects.all()

    def get_participant_conversations(self):
        user_id = self.request.user.id
        return [
            conversation for conversation in Conversation.objects.all()
            if user_id in conversation.participant_ids
        ]

    def list(self, request, *args, **kwargs):
        conversations = self.get_participant_conversations()
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

    def retrieve(self, request, pk=None, *args, **kwargs):
        try:
            conversation = Conversation.objects.get(id=pk)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.id not in conversation.participant_ids:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(conversation)
        return Response(serializer.data)

    def unread_summary(self, request):
        conversations = self.get_participant_conversations()
        unread_counts = {
            str(conversation.id): self.get_unread_count(conversation, request.user)
            for conversation in conversations
        }
        return Response({
            'totalUnreadCount': sum(unread_counts.values()),
            'unreadCountsByConversationId': unread_counts,
        })

    def read(self, request, pk=None):
        try:
            conversation = Conversation.objects.get(id=pk)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.id not in conversation.participant_ids:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        last_read_at = mark_conversation_read(conversation, request.user)
        publish_conversation_read_sync(conversation, request.user.id, last_read_at)
        return Response({
            'conversationId': str(conversation.id),
            'unreadCount': self.get_unread_count(conversation, request.user),
        })

    def get_unread_count(self, conversation, user):
        queryset = ConversationMessage.objects.filter(conversation=conversation).exclude(sender=user)
        read_state = ConversationReadState.objects.filter(
            conversation=conversation,
            user=user,
        ).first()
        if read_state:
            queryset = queryset.filter(created_at__gt=read_state.last_read_at)
        return queryset.count()


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

        message = create_conversation_message(conversation, request.user, body.strip())
        message_data = serialize_chat_message(message)
        publish_chat_message_sync(conversation, message_data)

        logger.info(
            'Conversation message created conversation_id=%s message_id=%s sender_id=%s',
            conversation.id,
            message.id,
            request.user.id,
        )

        return Response(message_data, status=status.HTTP_201_CREATED)
