from rest_framework import status
from rest_framework.test import APITestCase

from kometa.models import Feedback

from .factories import create_user
from .helpers import auth_client


class UserEndpointTests(APITestCase):
    def setUp(self):
        self.user = create_user(
            email='test.user@example.com',
            name='Test User',
            location='Kyiv',
            bio='Test bio',
        )
        self.client = auth_client(self.user)

    def test_can_read_and_update_own_profile(self):
        me_response = self.client.get('/api/v1/users/me')
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.json()['name'], 'Test User')

        detail_response = self.client.get(f'/api/v1/users/{self.user.id}')
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.json()['id'], self.user.id)

        update_response = self.client.patch(
            '/api/v1/users/me',
            {
                'name': 'Updated Test User',
                'location': 'Lviv',
                'bio': 'Updated bio',
                'skills': ['english tutoring', 'laptop setup'],
                'interests': ['education', 'technology'],
                'avatarUrl': 'https://example.com/avatar.png',
            },
            format='json',
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.json()['name'], 'Updated Test User')
        self.assertEqual(update_response.json()['skills'], ['english tutoring', 'laptop setup'])

    def test_user_feedback_is_paginated(self):
        Feedback.objects.create(
            task_id='task-1',
            author=self.user,
            receiver=self.user,
            rating=5,
            comment='Self feedback',
        )

        response = self.client.get(f'/api/v1/users/{self.user.id}/feedback?limit=20&offset=0')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['pageInfo']['total'], 1)
        self.assertEqual(response.json()['items'][0]['rating'], 5)
