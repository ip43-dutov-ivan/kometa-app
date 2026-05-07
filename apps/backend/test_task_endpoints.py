#!/usr/bin/env python
"""Test Task endpoints"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from kometa.models import User, Task

# Create test client
client = APIClient(HTTP_HOST='127.0.0.1')

# Create test users
test_user = User.objects.create_user(
    username='tasktest@example.com',
    email='tasktest@example.com',
    password='testpass123',
    name='Task Tester',
    location='Test City',
)

other_user = User.objects.create_user(
    username='other@example.com',
    email='other@example.com',
    password='testpass123',
    name='Other User',
    location='Other City',
)

# Generate JWT tokens
refresh = RefreshToken.for_user(test_user)
access_token = str(refresh.access_token)

other_refresh = RefreshToken.for_user(other_user)
other_access_token = str(other_refresh.access_token)

# Test 1: Create a task (POST /tasks)
print("Test 1: Create a task")
response = client.post(
    '/api/v1/tasks/',
    {
        'title': 'Build a website',
        'description': 'I need a website for my business',
        'category': 'web-development',
        'location': 'Remote',
        'compensation': {
            'type': 'money',
            'amount': 500,
            'currency': 'UAH',
        }
    },
    HTTP_AUTHORIZATION=f'Bearer {access_token}',
    format='json'
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

if response.status_code == 201:
    task_id = response.json()['id']
    
    # Test 2: Get the task (GET /tasks/{id})
    print("Test 2: Get the task")
    response = client.get(
        f'/api/v1/tasks/{task_id}/',
        HTTP_AUTHORIZATION=f'Bearer {access_token}',
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    
    # Test 3: List tasks
    print("Test 3: List all tasks")
    response = client.get(
        '/api/v1/tasks/?limit=10&offset=0',
        HTTP_AUTHORIZATION=f'Bearer {access_token}',
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    
    # Test 4: Filter tasks - available (not owner, open status)
    print("Test 4: List available tasks (as other user)")
    response = client.get(
        '/api/v1/tasks/?available=true&limit=10',
        HTTP_AUTHORIZATION=f'Bearer {other_access_token}',
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    
    # Test 5: Update the task (PATCH /tasks/{id})
    print("Test 5: Update the task (as owner)")
    response = client.patch(
        f'/api/v1/tasks/{task_id}/',
        {'title': 'Build a website - Updated'},
        HTTP_AUTHORIZATION=f'Bearer {access_token}',
        format='json'
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    
    # Test 6: Try to update as non-owner
    print("Test 6: Try to update task as non-owner (should fail)")
    response = client.patch(
        f'/api/v1/tasks/{task_id}/',
        {'title': 'Hacked!'},
        HTTP_AUTHORIZATION=f'Bearer {other_access_token}',
        format='json'
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    
    # Test 7: Filter by owner
    print("Test 7: List own tasks")
    response = client.get(
        '/api/v1/tasks/?owner=me',
        HTTP_AUTHORIZATION=f'Bearer {access_token}',
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    
    # Test 8: Test authentication required
    print("Test 8: Try to access without token (should fail)")
    response = client.get('/api/v1/tasks/')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")

print("All tests completed!")
