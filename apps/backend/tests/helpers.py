from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def auth_client(user):
    token = str(RefreshToken.for_user(user).access_token)
    client = APIClient(HTTP_HOST='127.0.0.1')
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client
