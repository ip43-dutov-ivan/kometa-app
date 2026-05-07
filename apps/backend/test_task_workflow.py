#!/usr/bin/env python
"""Test Task endpoints with responses and completion workflow"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from kometa.models import User, Task, TaskResponse

# Create test client
client = APIClient(HTTP_HOST='127.0.0.1')

# Create test users
task_owner, _ = User.objects.get_or_create(
    username='owner@example.com',
    defaults={
        'email': 'owner@example.com',
        'name': 'Task Owner',
        'location': 'Test City',
    }
)
task_owner.set_password('testpass123')
task_owner.save()

provider1, _ = User.objects.get_or_create(
    username='provider1@example.com',
    defaults={
        'email': 'provider1@example.com',
        'name': 'Provider 1',
        'location': 'Provider City',
    }
)
provider1.set_password('testpass123')
provider1.save()

provider2, _ = User.objects.get_or_create(
    username='provider2@example.com',
    defaults={
        'email': 'provider2@example.com',
        'name': 'Provider 2',
        'location': 'Provider City',
    }
)
provider2.set_password('testpass123')
provider2.save()

# Generate JWT tokens
owner_token = str(RefreshToken.for_user(task_owner).access_token)
provider1_token = str(RefreshToken.for_user(provider1).access_token)
provider2_token = str(RefreshToken.for_user(provider2).access_token)

# Create a task
print("=== Creating Task ===")
response = client.post(
    '/api/v1/tasks/',
    {
        'title': 'Fix a computer',
        'description': 'My computer is broken',
        'category': 'IT',
        'location': 'Home',
        'compensation': {'type': 'money', 'amount': 200, 'currency': 'UAH'}
    },
    HTTP_AUTHORIZATION=f'Bearer {owner_token}',
    format='json'
)
print(f"Status: {response.status_code}")
task_id = response.json()['id']
print(f"Task ID: {task_id}\n")

# Provider 1 submits a response
print("=== Provider 1 Submits Response ===")
response = client.post(
    f'/api/v1/tasks/{task_id}/responses/',
    {'comment': 'I can fix your computer today'},
    HTTP_AUTHORIZATION=f'Bearer {provider1_token}',
    format='json'
)
print(f"Status: {response.status_code}")
response1_id = response.json()['id']
print(f"Response ID: {response1_id}")
print(f"Response: {response.json()}\n")

# Provider 1 lists own responses
print("=== Provider 1 Lists My Responses ===")
response = client.get(
    '/api/v1/me/responses/?status=pending&limit=10',
    HTTP_AUTHORIZATION=f'Bearer {provider1_token}',
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

# Provider 2 submits a response
print("=== Provider 2 Submits Response ===")
response = client.post(
    f'/api/v1/tasks/{task_id}/responses/',
    {'comment': 'I am also available'},
    HTTP_AUTHORIZATION=f'Bearer {provider2_token}',
    format='json'
)
print(f"Status: {response.status_code}")
response2_id = response.json()['id']
print(f"Response: {response.json()}\n")

# Owner lists responses for task
print("=== Owner Lists Responses ===")
response = client.get(
    f'/api/v1/tasks/{task_id}/responses/?limit=10',
    HTTP_AUTHORIZATION=f'Bearer {owner_token}',
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

# Owner accepts provider 1's response
print("=== Owner Accepts Provider 1 Response ===")
response = client.post(
    f'/api/v1/tasks/{task_id}/responses/{response1_id}/accept/',
    {},
    HTTP_AUTHORIZATION=f'Bearer {owner_token}',
    format='json'
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

# Check task status is now matched
print("=== Check Task Status (should be matched) ===")
response = client.get(
    f'/api/v1/tasks/{task_id}/',
    HTTP_AUTHORIZATION=f'Bearer {owner_token}',
)
print(f"Status: {response.status_code}")
task_data = response.json()
print(f"Task Status: {task_data['status']}")
print(f"Selected Response ID: {task_data['selectedResponseId']}\n")

# Owner starts the task
print("=== Owner Starts Task ===")
response = client.post(
    f'/api/v1/tasks/{task_id}/start/',
    {},
    HTTP_AUTHORIZATION=f'Bearer {owner_token}',
    format='json'
)
print(f"Status: {response.status_code}")
print(f"Task Status: {response.json()['status']}\n")

# Owner lists matches
print("=== Owner Lists Matches ===")
response = client.get(
    '/api/v1/matches/?activeOnly=true&limit=20&offset=0',
    HTTP_AUTHORIZATION=f'Bearer {owner_token}',
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

match_items = response.json().get('items', [])
if match_items:
    conversation_id = match_items[0]['conversationId']

    # Owner lists conversations
    print("=== Owner Lists Conversations ===")
    response = client.get(
        '/api/v1/conversations/?limit=20&offset=0',
        HTTP_AUTHORIZATION=f'Bearer {owner_token}',
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")

    # Owner gets conversation metadata
    print("=== Owner Gets Conversation Metadata ===")
    response = client.get(
        f'/api/v1/conversations/{conversation_id}/',
        HTTP_AUTHORIZATION=f'Bearer {owner_token}',
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")

    # Owner sends a chat message
    print("=== Owner Sends Chat Message ===")
    response = client.post(
        f'/api/v1/conversations/{conversation_id}/messages/',
        {'body': 'Hello, I am ready to start.'},
        HTTP_AUTHORIZATION=f'Bearer {owner_token}',
        format='json'
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")

    # Owner lists chat messages
    print("=== Owner Lists Chat Messages ===")
    response = client.get(
        f'/api/v1/conversations/{conversation_id}/messages/?limit=50',
        HTTP_AUTHORIZATION=f'Bearer {owner_token}',
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")

# Provider requests completion
print("=== Provider Requests Completion ===")
response = client.post(
    f'/api/v1/tasks/{task_id}/completion-requests/',
    {'note': 'I have completed the work'},
    HTTP_AUTHORIZATION=f'Bearer {provider1_token}',
    format='json'
)
print(f"Status: {response.status_code}")
if response.status_code == 201:
    completion_request_id = response.json()['completionRequest']['id']
    print(f"Completion Request ID: {completion_request_id}")
    print(f"Completion Request: {response.json()['completionRequest']}")
    print(f"Task Status: {response.json()['task']['status']}\n")
    
    # Owner confirms completion
    print("=== Owner Confirms Completion ===")
    response = client.post(
        f'/api/v1/tasks/{task_id}/completion-requests/{completion_request_id}/confirm/',
        {},
        HTTP_AUTHORIZATION=f'Bearer {owner_token}',
        format='json'
    )
    print(f"Status: {response.status_code}")
    print(f"Completion Request: {response.json()['completionRequest']}")
    print(f"Task Status: {response.json()['task']['status']}\n")
else:
    print(f"Error: {response.json()}\n")

print("=== Test Completed ===")
