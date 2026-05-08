import json
from unittest import IsolatedAsyncioTestCase

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import override_settings
from rest_framework_simplejwt.tokens import RefreshToken

from kometa.models import Conversation, ConversationMessage

from .factories import create_task, create_user

CHANNEL_LAYERS_INMEMORY = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}


@override_settings(CHANNEL_LAYERS=CHANNEL_LAYERS_INMEMORY)
class ConversationConsumerTests(IsolatedAsyncioTestCase):
    databases = ('default',)

    async def asyncSetUp(self):
        self.owner = await database_sync_to_async(create_user)(email='ws_owner@example.com')
        self.provider = await database_sync_to_async(create_user)(email='ws_provider@example.com')
        self.outsider = await database_sync_to_async(create_user)(email='ws_outsider@example.com')
        task = await database_sync_to_async(create_task)(owner=self.owner)
        self.conversation = await database_sync_to_async(Conversation.objects.create)(
            task=task,
            participant_ids=[self.owner.id, self.provider.id],
        )

    async def asyncTearDown(self):
        from kometa.models import Task
        from kometa.models import User as KUser

        conv_id = self.conversation.id
        task_id = self.conversation.task_id
        emails = ['ws_owner@example.com', 'ws_provider@example.com', 'ws_outsider@example.com']

        await database_sync_to_async(
            lambda: ConversationMessage.objects.filter(conversation_id=conv_id).delete()
        )()
        await database_sync_to_async(
            lambda: Conversation.objects.filter(id=conv_id).delete()
        )()
        await database_sync_to_async(
            lambda: Task.objects.filter(id=task_id).delete()
        )()
        await database_sync_to_async(
            lambda: KUser.objects.filter(email__in=emails).delete()
        )()

    def _token(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def _url(self, token=''):
        return f'/ws/conversations/{self.conversation.id}/?token={token}'

    async def _connect(self, user):
        from config.asgi import application
        token = await database_sync_to_async(self._token)(user)
        comm = WebsocketCommunicator(application, self._url(token))
        connected, _ = await comm.connect()
        return comm, connected

    async def test_unauthenticated_connect_rejected(self):
        from config.asgi import application
        comm = WebsocketCommunicator(application, self._url(''))
        connected, _ = await comm.connect()
        self.assertFalse(connected)
        await comm.disconnect()

    async def test_invalid_token_rejected(self):
        from config.asgi import application
        comm = WebsocketCommunicator(application, self._url('not.a.token'))
        connected, _ = await comm.connect()
        self.assertFalse(connected)
        await comm.disconnect()

    async def test_non_participant_rejected(self):
        comm, connected = await self._connect(self.outsider)
        self.assertFalse(connected)
        await comm.disconnect()

    async def test_participant_connects(self):
        comm, connected = await self._connect(self.owner)
        self.assertTrue(connected)
        await comm.disconnect()

    async def test_message_persisted_and_broadcast_to_both(self):
        owner_comm, owner_ok = await self._connect(self.owner)
        provider_comm, provider_ok = await self._connect(self.provider)
        self.assertTrue(owner_ok)
        self.assertTrue(provider_ok)

        await owner_comm.send_json_to({
            'type': 'message.create',
            'body': 'Hello provider!',
            'clientMessageId': 'cid-1',
        })

        owner_event = await owner_comm.receive_json_from()
        provider_event = await provider_comm.receive_json_from()

        self.assertEqual(owner_event['type'], 'message.created')
        self.assertEqual(owner_event['message']['body'], 'Hello provider!')
        self.assertEqual(owner_event['clientMessageId'], 'cid-1')

        self.assertEqual(provider_event['type'], 'message.created')
        self.assertEqual(provider_event['message']['body'], 'Hello provider!')

        count = await database_sync_to_async(
            lambda: ConversationMessage.objects.filter(conversation=self.conversation).count()
        )()
        self.assertEqual(count, 1)

        await owner_comm.disconnect()
        await provider_comm.disconnect()

    async def test_empty_body_returns_error(self):
        comm, connected = await self._connect(self.owner)
        self.assertTrue(connected)

        await comm.send_json_to({
            'type': 'message.create',
            'body': '   ',
            'clientMessageId': 'cid-2',
        })

        event = await comm.receive_json_from()
        self.assertEqual(event['type'], 'error')
        self.assertEqual(event['code'], 'body_required')

        count = await database_sync_to_async(
            lambda: ConversationMessage.objects.filter(conversation=self.conversation).count()
        )()
        self.assertEqual(count, 0)

        await comm.disconnect()

    async def test_unknown_event_type_returns_error(self):
        comm, connected = await self._connect(self.owner)
        self.assertTrue(connected)

        await comm.send_json_to({'type': 'invalid.event'})
        event = await comm.receive_json_from()
        self.assertEqual(event['type'], 'error')
        self.assertEqual(event['code'], 'unknown_type')

        await comm.disconnect()
