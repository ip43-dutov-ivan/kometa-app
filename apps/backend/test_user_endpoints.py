import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from kometa.models import User, Feedback
from rest_framework_simplejwt.tokens import RefreshToken

print('Running backend User endpoints validation script...')

email = 'test.user@example.com'
User.objects.filter(email=email).delete()
user = User.objects.create_user(
    username=email,
    email=email,
    password='password123',
    name='Test User',
    location='Kyiv',
    bio='Test bio',
)

refresh = RefreshToken.for_user(user)
token = str(refresh.access_token)
print('\nACCESS_TOKEN=' + token)

http_host = os.environ.get('TEST_HTTP_HOST', '127.0.0.1')
client = Client(HTTP_HOST=http_host, HTTP_AUTHORIZATION=f'Bearer {token}')

print(f'Using HTTP_HOST={http_host}')
print(f'Testing user id={user.id}\n')

paths = [
    '/api/v1/users/me/',
    f'/api/v1/users/{user.id}/',
    f'/api/v1/users/{user.id}/feedback/?limit=20&offset=0',
]
for path in paths:
    response = client.get(path)
    print('GET', path, response.status_code)
    print(response.content.decode('utf-8'))
    print('-' * 60)

response = client.patch(
    '/api/v1/users/me/',
    data=json.dumps({
        'name': 'Updated Test User',
        'location': 'Lviv',
        'bio': 'Updated bio',
        'skills': ['english tutoring', 'laptop setup'],
        'interests': ['education', 'technology'],
        'avatarUrl': 'https://example.com/avatar.png',
    }),
    content_type='application/json'
)
print('PATCH /api/v1/users/me/', response.status_code)
print(response.content.decode('utf-8'))
print('-' * 60)

Feedback.objects.filter(author=user, receiver=user, task_id='task-1').delete()
Feedback.objects.create(task_id='task-1', author=user, receiver=user, rating=5, comment='Self feedback')
response = client.get(f'/api/v1/users/{user.id}/feedback/?limit=20&offset=0')
print('GET feedback', response.status_code)
print(response.content.decode('utf-8'))
print('\nUser endpoints validation complete.')
