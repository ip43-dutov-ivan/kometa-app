from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

from .models import ConversationMessage
from .serializers import ConversationMessageSerializer

User = get_user_model()


def authenticate_token(token):
    if not token:
        return None

    try:
        validated = UntypedToken(token)
        user_id = validated.payload.get('user_id')
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return None


def create_conversation_message(conversation, sender, body):
    message = ConversationMessage.objects.create(
        conversation=conversation,
        sender=sender,
        body=body,
    )
    conversation.last_message_at = timezone.now()
    conversation.save(update_fields=['last_message_at'])
    return message


def serialize_chat_message(message):
    return dict(ConversationMessageSerializer(message).data)


async def publish_chat_message(conversation, message_data, client_message_id=''):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    conversation_id = str(conversation.id)
    task_id = str(conversation.task_id)
    sender_id = str(message_data['senderId'])

    await channel_layer.group_send(
        f'conversation_{conversation_id}',
        {
            'type': 'chat.message',
            'message': message_data,
            'clientMessageId': client_message_id,
        },
    )

    for participant_id in conversation.participant_ids:
        if str(participant_id) == sender_id:
            continue

        await channel_layer.group_send(
            f'user_{participant_id}',
            {
                'type': 'user.chat_message',
                'message': message_data,
                'conversationId': conversation_id,
                'taskId': task_id,
                'clientMessageId': client_message_id,
            },
        )


def publish_chat_message_sync(conversation, message_data, client_message_id=''):
    async_to_sync(publish_chat_message)(conversation, message_data, client_message_id)
