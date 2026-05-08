import json
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.exceptions import ValidationError as DjangoValidationError

from .chat_realtime import (
    authenticate_token,
    create_conversation_message,
    publish_chat_message,
    serialize_chat_message,
)
from .models import Conversation

logger = logging.getLogger(__name__)


class ConversationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        qs = self.scope.get('query_string', b'').decode()
        token = parse_qs(qs).get('token', [None])[0]

        self.user = await self._authenticate(token)
        if self.user is None:
            await self.close(code=4001)
            return

        conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.conversation = await self._get_conversation_for_user(self.user, conversation_id)
        if self.conversation is None:
            await self.close(code=4003)
            return

        self.group_name = f'conversation_{conversation_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info('WS connect user=%s conversation=%s', self.user.id, conversation_id)

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, ValueError):
            await self._send_error('invalid_json', 'Invalid JSON.')
            return

        if data.get('type') != 'message.create':
            await self._send_error('unknown_type', 'Unknown message type.')
            return

        body = str(data.get('body', '')).strip()
        if not body:
            await self._send_error('body_required', 'Message body is required.')
            return

        client_message_id = str(data.get('clientMessageId', ''))
        message_data = await self._persist_and_serialize(body)
        await publish_chat_message(self.conversation, message_data, client_message_id)

    async def chat_message(self, event):
        await self.send(json.dumps({
            'type': 'message.created',
            'message': event['message'],
            'clientMessageId': event.get('clientMessageId', ''),
        }))

    async def _send_error(self, code, message):
        await self.send(json.dumps({'type': 'error', 'code': code, 'message': message}))

    @database_sync_to_async
    def _authenticate(self, token):
        return authenticate_token(token)

    @database_sync_to_async
    def _get_conversation_for_user(self, user, conversation_id):
        try:
            conv = Conversation.objects.get(id=conversation_id)
        except (Conversation.DoesNotExist, ValueError, DjangoValidationError):
            return None
        if user.id not in conv.participant_ids:
            return None
        return conv

    @database_sync_to_async
    def _persist_and_serialize(self, body):
        msg = create_conversation_message(self.conversation, self.user, body)
        return serialize_chat_message(msg)


class UserInboxConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        qs = self.scope.get('query_string', b'').decode()
        token = parse_qs(qs).get('token', [None])[0]

        self.user = await database_sync_to_async(authenticate_token)(token)
        if self.user is None:
            await self.close(code=4001)
            return

        self.group_name = f'user_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info('WS inbox connect user=%s', self.user.id)

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        await self._send_error('read_only_socket', 'Inbox socket does not accept client events.')

    async def user_chat_message(self, event):
        await self.send(json.dumps({
            'type': 'chat.message.created',
            'message': event['message'],
            'conversationId': event['conversationId'],
            'taskId': event['taskId'],
            'clientMessageId': event.get('clientMessageId', ''),
        }))

    async def _send_error(self, code, message):
        await self.send(json.dumps({'type': 'error', 'code': code, 'message': message}))
