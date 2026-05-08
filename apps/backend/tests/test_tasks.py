from rest_framework import status
from rest_framework.test import APITestCase

from .factories import create_task, create_user, task_payload
from .helpers import auth_client


class TaskEndpointTests(APITestCase):
    def setUp(self):
        self.owner = create_user(email='task-owner@example.com', name='Task Owner')
        self.other_user = create_user(email='other@example.com', name='Other User')
        self.owner_client = auth_client(self.owner)
        self.other_client = auth_client(self.other_user)

    def test_create_retrieve_list_and_filter_tasks(self):
        create_response = self.owner_client.post(
            '/api/v1/tasks',
            task_payload(location={
                'label': 'Kyiv, KPI',
                'isRemote': False,
                'latitude': 50.4499,
                'longitude': 30.4615,
                'cityId': 'ua-kyiv',
                'cityLabel': 'Kyiv',
                'countryCode': 'UA',
            }),
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        create_data = create_response.json()
        task_id = create_data['id']
        self.assertEqual(create_data['location']['label'], 'Kyiv, KPI')
        self.assertFalse(create_data['location']['isRemote'])
        self.assertEqual(create_data['location']['latitude'], 50.4499)
        self.assertEqual(create_data['location']['longitude'], 30.4615)
        self.assertEqual(create_data['location']['cityId'], 'ua-kyiv')
        self.assertEqual(create_data['location']['cityLabel'], 'Kyiv')

        retrieve_response = self.owner_client.get(f'/api/v1/tasks/{task_id}')
        self.assertEqual(retrieve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(retrieve_response.json()['id'], task_id)

        list_response = self.owner_client.get('/api/v1/tasks?limit=10&offset=0')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.json()['pageInfo']['total'], 1)

        owner_response = self.owner_client.get('/api/v1/tasks?owner=me')
        self.assertEqual(owner_response.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_response.json()['pageInfo']['total'], 1)

        available_response = self.other_client.get('/api/v1/tasks?available=true&limit=10')
        self.assertEqual(available_response.status_code, status.HTTP_200_OK)
        self.assertEqual(available_response.json()['pageInfo']['total'], 1)

        location_response = self.other_client.get('/api/v1/tasks?location=KPI&limit=10')
        self.assertEqual(location_response.status_code, status.HTTP_200_OK)
        self.assertEqual(location_response.json()['pageInfo']['total'], 1)

        city_response = self.other_client.get('/api/v1/tasks?locationCity=ua-kyiv&limit=10')
        self.assertEqual(city_response.status_code, status.HTTP_200_OK)
        self.assertEqual(city_response.json()['pageInfo']['total'], 1)

        facets_response = self.other_client.get('/api/v1/tasks/location-facets?available=true&status=open')
        self.assertEqual(facets_response.status_code, status.HTTP_200_OK)
        self.assertEqual(facets_response.json(), [{'id': 'ua-kyiv', 'label': 'Kyiv', 'count': 1}])

    def test_task_update_methods_are_not_available(self):
        task = create_task(owner=self.owner)

        patch_response = self.owner_client.patch(
            f'/api/v1/tasks/{task.id}',
            {'title': 'Build a website - Updated'},
            format='json',
        )
        put_response = self.owner_client.put(
            f'/api/v1/tasks/{task.id}',
            task_payload(title='Build a website - Updated'),
            format='json',
        )

        self.assertEqual(patch_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(put_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        task.refresh_from_db()
        self.assertNotEqual(task.title, 'Build a website - Updated')

    def test_remote_task_does_not_require_coordinates(self):
        create_response = self.owner_client.post(
            '/api/v1/tasks',
            task_payload(location={'label': 'Remote', 'isRemote': True}),
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            create_response.json()['location'],
            {'label': 'Remote', 'isRemote': True, 'cityId': 'remote', 'cityLabel': 'Remote'},
        )

    def test_physical_task_requires_coordinates(self):
        create_response = self.owner_client.post(
            '/api/v1/tasks',
            task_payload(location={'label': 'Kyiv, KPI', 'isRemote': False}),
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('latitude', create_response.json()['location'])

    def test_rejects_invalid_location_coordinates(self):
        create_response = self.owner_client.post(
            '/api/v1/tasks',
            task_payload(location={
                'label': 'Invalid',
                'isRemote': False,
                'latitude': 91,
                'longitude': 30,
            }),
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('latitude', create_response.json()['location'])

    def test_tasks_require_authentication(self):
        response = self.client.get('/api/v1/tasks')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
