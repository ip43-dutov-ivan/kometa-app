from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from kometa.models import Conversation, ConversationMessage, ConversationReadState

from .factories import create_task, create_user
from .helpers import auth_client


class ConversationUnreadTests(APITestCase):
    def setUp(self):
        self.owner = create_user(email='unread_owner@example.com', name='Owner')
        self.provider = create_user(email='unread_provider@example.com', name='Provider')
        self.outsider = create_user(email='unread_outsider@example.com', name='Outsider')
        self.task = create_task(owner=self.owner)
        self.conversation = Conversation.objects.create(
            task=self.task,
            participant_ids=[self.owner.id, self.provider.id],
        )
        self.owner_client = auth_client(self.owner)
        self.provider_client = auth_client(self.provider)
        self.outsider_client = auth_client(self.outsider)

    def test_unread_summary_counts_messages_from_other_participants(self):
        ConversationMessage.objects.create(
            conversation=self.conversation,
            sender=self.owner,
            body='First unread message.',
        )
        ConversationMessage.objects.create(
            conversation=self.conversation,
            sender=self.provider,
            body='Own message should not count.',
        )

        response = self.provider_client.get('/api/v1/me/chat-summary')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['totalUnreadCount'], 1)
        self.assertEqual(
            response.json()['unreadCountsByConversationId'][str(self.conversation.id)],
            1,
        )

    def test_mark_conversation_read_clears_unread_count(self):
        ConversationMessage.objects.create(
            conversation=self.conversation,
            sender=self.owner,
            body='Please confirm.',
        )

        read_response = self.provider_client.post(
            f'/api/v1/conversations/{self.conversation.id}/read',
            {},
            format='json',
        )
        summary_response = self.provider_client.get('/api/v1/me/chat-summary')

        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.json()['unreadCount'], 0)
        self.assertEqual(summary_response.json()['totalUnreadCount'], 0)

    def test_conversation_response_includes_unread_count_since_last_read(self):
        older_message = ConversationMessage.objects.create(
            conversation=self.conversation,
            sender=self.owner,
            body='Already read.',
        )
        older_message.created_at = timezone.now() - timedelta(minutes=10)
        older_message.save(update_fields=['created_at'])
        ConversationReadState.objects.create(
            conversation=self.conversation,
            user=self.provider,
            last_read_at=timezone.now() - timedelta(minutes=5),
        )
        ConversationMessage.objects.create(
            conversation=self.conversation,
            sender=self.owner,
            body='New unread message.',
        )

        response = self.provider_client.get(f'/api/v1/conversations/{self.conversation.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['participantIds'], [str(self.owner.id), str(self.provider.id)])
        self.assertEqual(response.json()['unreadCount'], 1)
        self.assertEqual(response.json()['readStates'][0]['userId'], str(self.provider.id))
        self.assertTrue(response.json()['readStates'][0]['lastReadAt'])

    def test_outsider_cannot_mark_conversation_read(self):
        response = self.outsider_client.post(
            f'/api/v1/conversations/{self.conversation.id}/read',
            {},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
