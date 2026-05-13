from rest_framework import status
from rest_framework.test import APITestCase

from kometa.models import TaskResponse

from .factories import create_task, create_user, task_payload
from .helpers import auth_client


class TaskWorkflowTests(APITestCase):
    def setUp(self):
        self.owner = create_user(email='owner@example.com', name='Task Owner')
        self.provider1 = create_user(email='provider1@example.com', name='Provider 1')
        self.provider2 = create_user(email='provider2@example.com', name='Provider 2')
        self.admin = create_user(
            email='admin@example.com',
            name='Admin User',
            is_staff=True,
        )
        self.owner_client = auth_client(self.owner)
        self.provider1_client = auth_client(self.provider1)
        self.provider2_client = auth_client(self.provider2)
        self.admin_client = auth_client(self.admin)

    def test_task_response_completion_feedback_and_report_workflow(self):
        task_response = self.owner_client.post(
            '/api/v1/tasks',
            task_payload(
                title='Fix a computer',
                description='My computer is broken',
                category='IT',
                location={
                    'label': 'Home',
                    'isRemote': False,
                    'latitude': 50.45,
                    'longitude': 30.52,
                },
                compensation={'type': 'credits', 'amount': 25},
            ),
            format='json',
        )
        self.assertEqual(task_response.status_code, status.HTTP_201_CREATED)
        task_id = task_response.json()['id']

        provider1_response = self.provider1_client.post(
            f'/api/v1/tasks/{task_id}/responses',
            {'comment': 'I can fix your computer today'},
            format='json',
        )
        self.assertEqual(provider1_response.status_code, status.HTTP_201_CREATED)
        response1_id = provider1_response.json()['id']

        provider_responses = self.provider1_client.get('/api/v1/me/responses?status=pending&limit=10')
        self.assertEqual(provider_responses.status_code, status.HTTP_200_OK)
        self.assertEqual(provider_responses.json()['pageInfo']['total'], 1)

        provider2_response = self.provider2_client.post(
            f'/api/v1/tasks/{task_id}/responses',
            {'comment': 'I am also available'},
            format='json',
        )
        self.assertEqual(provider2_response.status_code, status.HTTP_201_CREATED)

        list_responses = self.owner_client.get(f'/api/v1/tasks/{task_id}/responses?limit=10')
        self.assertEqual(list_responses.status_code, status.HTTP_200_OK)
        self.assertEqual(list_responses.json()['pageInfo']['total'], 2)

        accept_response = self.owner_client.post(
            f'/api/v1/tasks/{task_id}/responses/{response1_id}/accept',
            {},
            format='json',
        )
        self.assertEqual(accept_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(accept_response.json()['responseId'], response1_id)
        self.assertTrue(accept_response.json()['conversationId'])

        task_detail = self.owner_client.get(f'/api/v1/tasks/{task_id}')
        self.assertEqual(task_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(task_detail.json()['status'], 'matched')
        self.assertEqual(task_detail.json()['selectedResponseId'], response1_id)

        start_response = self.provider1_client.post(f'/api/v1/tasks/{task_id}/start', {}, format='json')
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        self.assertEqual(start_response.json()['status'], 'inProgress')

        matches_response = self.owner_client.get('/api/v1/matches?activeOnly=true&limit=20&offset=0')
        self.assertEqual(matches_response.status_code, status.HTTP_200_OK)
        self.assertEqual(matches_response.json()['pageInfo']['total'], 1)
        conversation_id = accept_response.json()['conversationId']

        conversations_response = self.owner_client.get('/api/v1/conversations?limit=20&offset=0')
        self.assertEqual(conversations_response.status_code, status.HTTP_200_OK)
        self.assertEqual(conversations_response.json()['pageInfo']['total'], 1)

        conversation_response = self.owner_client.get(f'/api/v1/conversations/{conversation_id}')
        self.assertEqual(conversation_response.status_code, status.HTTP_200_OK)
        self.assertEqual(conversation_response.json()['id'], conversation_id)

        message_response = self.owner_client.post(
            f'/api/v1/conversations/{conversation_id}/messages',
            {'body': 'Hello, I am ready to start.'},
            format='json',
        )
        self.assertEqual(message_response.status_code, status.HTTP_201_CREATED)

        messages_response = self.owner_client.get(
            f'/api/v1/conversations/{conversation_id}/messages?limit=50',
        )
        self.assertEqual(messages_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(messages_response.json()['items']), 1)

        completion_response = self.provider1_client.post(
            f'/api/v1/tasks/{task_id}/completion-requests',
            {'note': 'I have completed the work'},
            format='json',
        )
        self.assertEqual(completion_response.status_code, status.HTTP_201_CREATED)
        completion_request_id = completion_response.json()['completionRequest']['id']
        self.assertEqual(completion_response.json()['task']['status'], 'completionRequested')

        list_completion_requests = self.owner_client.get(
            f'/api/v1/tasks/{task_id}/completion-requests',
        )
        self.assertEqual(list_completion_requests.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_completion_requests.json()), 1)
        self.assertEqual(list_completion_requests.json()[0]['id'], completion_request_id)

        confirm_response = self.owner_client.post(
            f'/api/v1/tasks/{task_id}/completion-requests/{completion_request_id}/confirm',
            {},
            format='json',
        )
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm_response.json()['completionRequest']['status'], 'confirmed')
        self.assertEqual(confirm_response.json()['task']['status'], 'completed')
        self.owner.refresh_from_db()
        self.provider1.refresh_from_db()
        self.assertEqual(self.owner.credit_reserved, 0)
        self.assertEqual(self.owner.credit_balance, 75)
        self.assertEqual(self.provider1.credit_balance, 125)

        owner_feedback = self.owner_client.post(
            f'/api/v1/tasks/{task_id}/feedback',
            {'rating': 5, 'comment': 'Great work!'},
            format='json',
        )
        self.assertEqual(owner_feedback.status_code, status.HTTP_201_CREATED)

        provider_feedback = self.provider1_client.post(
            f'/api/v1/tasks/{task_id}/feedback',
            {'rating': 4, 'comment': 'Clear instructions.'},
            format='json',
        )
        self.assertEqual(provider_feedback.status_code, status.HTTP_201_CREATED)

        feedback_response = self.owner_client.get(f'/api/v1/tasks/{task_id}/feedback?limit=20&offset=0')
        self.assertEqual(feedback_response.status_code, status.HTTP_200_OK)
        self.assertEqual(feedback_response.json()['pageInfo']['total'], 2)

        report_response = self.provider1_client.post(
            '/api/v1/reports',
            {
                'reportedUserId': str(self.owner.id),
                'taskId': task_id,
                'reason': 'Unsafe behavior during task coordination.',
            },
            format='json',
        )
        self.assertEqual(report_response.status_code, status.HTTP_201_CREATED)
        report_id = report_response.json()['id']

        admin_reports = self.admin_client.get('/api/v1/admin/reports?status=open&limit=20&offset=0')
        self.assertEqual(admin_reports.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_reports.json()['pageInfo']['total'], 1)

        resolve_response = self.admin_client.patch(
            f'/api/v1/admin/reports/{report_id}',
            {'status': 'resolved', 'resolutionNote': 'Handled manually.'},
            format='json',
        )
        self.assertEqual(resolve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(resolve_response.json()['status'], 'resolved')

        block_response = self.admin_client.post(
            f'/api/v1/admin/users/{self.owner.id}/block',
            {'reason': 'Repeated unsafe behavior.'},
            format='json',
        )
        self.assertEqual(block_response.status_code, status.HTTP_200_OK)
        self.assertEqual(block_response.json()['accountStatus'], 'blocked')

    def test_task_category_filter_accepts_static_ids_and_legacy_labels(self):
        self.owner_client.post(
            '/api/v1/tasks',
            task_payload(category='home_tech'),
            format='json',
        )
        self.owner_client.post(
            '/api/v1/tasks',
            task_payload(category='Home tech'),
            format='json',
        )
        self.owner_client.post(
            '/api/v1/tasks',
            task_payload(category='education'),
            format='json',
        )

        response = self.owner_client.get('/api/v1/tasks?category=home_tech&limit=10')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['pageInfo']['total'], 2)

    def test_task_owner_cannot_respond_to_own_task(self):
        task = create_task(owner=self.owner)

        response = self.owner_client.post(
            f'/api/v1/tasks/{task.id}/responses',
            {'comment': 'I can do my own task'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_cannot_report_self(self):
        response = self.owner_client.post(
            '/api/v1/reports',
            {
                'reportedUserId': str(self.owner.id),
                'reason': 'Self report should not be allowed.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_report_requires_existing_task_when_task_id_is_supplied(self):
        response = self.owner_client.post(
            '/api/v1/reports',
            {
                'reportedUserId': str(self.provider1.id),
                'taskId': '00000000-0000-0000-0000-000000000000',
                'reason': 'Task does not exist.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_can_cancel_open_task_and_pending_responses_are_declined(self):
        task = create_task(owner=self.owner)
        task_response = TaskResponse.objects.create(
            task=task,
            provider=self.provider1,
            comment='I can help.',
        )

        response = self.owner_client.delete(f'/api/v1/tasks/{task.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['status'], 'cancelled')
        task_response.refresh_from_db()
        self.assertEqual(task_response.status, 'declined')
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.credit_balance, 100)
        self.assertEqual(self.owner.credit_reserved, 0)

    def test_non_owner_cannot_cancel_task(self):
        task = create_task(owner=self.owner)

        response = self.provider1_client.delete(f'/api/v1/tasks/{task.id}')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_open_task_cannot_be_cancelled(self):
        task = create_task(owner=self.owner, status='matched')

        response = self.owner_client.delete(f'/api/v1/tasks/{task.id}')

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_owner_cannot_request_completion_for_matched_task(self):
        task = create_task(owner=self.owner, status='matched')
        task_response = TaskResponse.objects.create(
            task=task,
            provider=self.provider1,
            comment='I can help.',
            status='accepted',
        )
        task.selected_response = task_response
        task.save()

        response = self.owner_client.post(
            f'/api/v1/tasks/{task.id}/completion-requests',
            {'note': 'Looks done to me.'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_cannot_start_matched_task(self):
        task = create_task(owner=self.owner, status='matched')
        task_response = TaskResponse.objects.create(
            task=task,
            provider=self.provider1,
            comment='I can help.',
            status='accepted',
        )
        task.selected_response = task_response
        task.save()

        response = self.owner_client.post(f'/api/v1/tasks/{task.id}/start', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_task_update_endpoint_is_not_available(self):
        task = create_task(owner=self.owner)

        response = self.owner_client.patch(
            f'/api/v1/tasks/{task.id}',
            task_payload(title='Updated title'),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_completion_concern_does_not_transfer_credits(self):
        task = create_task(owner=self.owner, status='matched')
        task_response = TaskResponse.objects.create(
            task=task,
            provider=self.provider1,
            comment='I can help.',
            status='accepted',
        )
        task.selected_response = task_response
        task.save()

        completion_response = self.provider1_client.post(
            f'/api/v1/tasks/{task.id}/completion-requests',
            {'note': 'Done.'},
            format='json',
        )
        self.assertEqual(completion_response.status_code, status.HTTP_201_CREATED)
        completion_request_id = completion_response.json()['completionRequest']['id']

        concern_response = self.owner_client.post(
            f'/api/v1/tasks/{task.id}/completion-requests/{completion_request_id}/concerns',
            {'reason': 'Needs one more change.'},
            format='json',
        )

        self.assertEqual(concern_response.status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        self.provider1.refresh_from_db()
        self.assertEqual(self.owner.credit_balance, 75)
        self.assertEqual(self.owner.credit_reserved, 25)
        self.assertEqual(self.provider1.credit_balance, 100)

    def test_completion_confirmation_cannot_pay_twice(self):
        task = create_task(owner=self.owner, status='matched')
        task_response = TaskResponse.objects.create(
            task=task,
            provider=self.provider1,
            comment='I can help.',
            status='accepted',
        )
        task.selected_response = task_response
        task.save()

        completion_response = self.provider1_client.post(
            f'/api/v1/tasks/{task.id}/completion-requests',
            {'note': 'Done.'},
            format='json',
        )
        completion_request_id = completion_response.json()['completionRequest']['id']

        first_response = self.owner_client.post(
            f'/api/v1/tasks/{task.id}/completion-requests/{completion_request_id}/confirm',
            {},
            format='json',
        )
        second_response = self.owner_client.post(
            f'/api/v1/tasks/{task.id}/completion-requests/{completion_request_id}/confirm',
            {},
            format='json',
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.owner.refresh_from_db()
        self.provider1.refresh_from_db()
        self.assertEqual(self.owner.credit_reserved, 0)
        self.assertEqual(self.provider1.credit_balance, 125)
