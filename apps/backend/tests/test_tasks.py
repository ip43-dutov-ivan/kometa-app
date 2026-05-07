from rest_framework import status
from rest_framework.test import APITestCase

from .factories import create_user, task_payload
from .helpers import auth_client


class TaskEndpointTests(APITestCase):
    def setUp(self):
        self.owner = create_user(email='task-owner@example.com', name='Task Owner')
        self.other_user = create_user(email='other@example.com', name='Other User')
        self.owner_client = auth_client(self.owner)
        self.other_client = auth_client(self.other_user)

    def test_create_retrieve_list_and_filter_tasks(self):
        create_response = self.owner_client.post(
            '/api/v1/tasks/',
            task_payload(),
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        task_id = create_response.json()['id']

        retrieve_response = self.owner_client.get(f'/api/v1/tasks/{task_id}/')
        self.assertEqual(retrieve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(retrieve_response.json()['id'], task_id)

        list_response = self.owner_client.get('/api/v1/tasks/?limit=10&offset=0')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.json()['pageInfo']['total'], 1)

        owner_response = self.owner_client.get('/api/v1/tasks/?owner=me')
        self.assertEqual(owner_response.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_response.json()['pageInfo']['total'], 1)

        available_response = self.other_client.get('/api/v1/tasks/?available=true&limit=10')
        self.assertEqual(available_response.status_code, status.HTTP_200_OK)
        self.assertEqual(available_response.json()['pageInfo']['total'], 1)

    def test_owner_can_update_open_task(self):
        create_response = self.owner_client.post(
            '/api/v1/tasks/',
            task_payload(),
            format='json',
        )
        task_id = create_response.json()['id']

        update_response = self.owner_client.patch(
            f'/api/v1/tasks/{task_id}/',
            {'title': 'Build a website - Updated'},
            format='json',
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.json()['title'], 'Build a website - Updated')

    def test_non_owner_cannot_update_task(self):
        create_response = self.owner_client.post(
            '/api/v1/tasks/',
            task_payload(),
            format='json',
        )
        task_id = create_response.json()['id']

        update_response = self.other_client.patch(
            f'/api/v1/tasks/{task_id}/',
            {'title': 'Hacked'},
            format='json',
        )

        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tasks_require_authentication(self):
        response = self.client.get('/api/v1/tasks/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
