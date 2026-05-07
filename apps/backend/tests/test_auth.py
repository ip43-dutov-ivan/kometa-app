from rest_framework import status
from rest_framework.test import APITestCase

from .factories import create_user


class AuthEndpointTests(APITestCase):
    def test_login_returns_access_and_refresh_tokens(self):
        user = create_user(email='login.user@example.com')

        response = self.client.post(
            '/api/v1/auth/login',
            {'email': user.email, 'password': 'testpass123'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('accessToken', response.json())
        self.assertIn('refreshToken', response.json())
        self.assertEqual(response.json()['user']['id'], user.id)

    def test_refresh_returns_new_access_token(self):
        user = create_user(email='refresh.user@example.com')
        login_response = self.client.post(
            '/api/v1/auth/login',
            {'email': user.email, 'password': 'testpass123'},
            format='json',
        )

        response = self.client.post(
            '/api/v1/auth/refresh',
            {'refreshToken': login_response.json()['refreshToken']},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('accessToken', response.json())
        self.assertNotIn('refreshToken', response.json())

    def test_refresh_rejects_invalid_token(self):
        response = self.client.post(
            '/api/v1/auth/refresh',
            {'refreshToken': 'not-a-token'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
