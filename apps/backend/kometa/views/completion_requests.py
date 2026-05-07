import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from ..models import CompletionRequest, Task
from ..serializers import CompletionRequestSerializer, TaskSerializer

logger = logging.getLogger(__name__)


class CompletionRequestViewSet(ModelViewSet):
    serializer_class = CompletionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get('task_id')
        if task_id:
            return CompletionRequest.objects.filter(task_id=task_id)
        return CompletionRequest.objects.all()

    def create(self, request, task_id=None):
        """Request completion for a task"""
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response(
                {'detail': 'Task not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if task.status not in ['matched', 'inProgress']:
            return Response(
                {'detail': 'Task must be in matched or inProgress status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if task.selected_response is None:
            return Response(
                {'detail': 'Task has no matched provider.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_owner = task.owner == request.user
        is_provider = task.selected_response.provider == request.user

        if not (is_owner or is_provider):
            logger.warning(
                'Completion request denied task_id=%s actor_id=%s owner_id=%s provider_id=%s reason=not_participant',
                task.id,
                request.user.id,
                task.owner_id,
                task.selected_response.provider_id,
            )
            return Response(
                {'detail': 'Only matched participants can request completion.'},
                status=status.HTTP_403_FORBIDDEN
            )

        note = request.data.get('note', '')
        completion_request = CompletionRequest.objects.create(
            task=task,
            requested_by=request.user,
            note=note,
            status='pending'
        )

        # Update task status to completionRequested
        old_status = task.status
        task.status = 'completionRequested'
        task.save()
        logger.info(
            'Completion requested task_id=%s completion_request_id=%s actor_id=%s old_status=%s new_status=%s',
            task.id,
            completion_request.id,
            request.user.id,
            old_status,
            task.status,
        )

        serializer = self.get_serializer(completion_request)
        task_serializer = TaskSerializer(task)

        return Response({
            'completionRequest': serializer.data,
            'task': task_serializer.data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm(self, request, task_id=None, pk=None):
        """Confirm completion of a task"""
        try:
            task = Task.objects.get(id=task_id)
            completion_request = CompletionRequest.objects.get(id=pk, task=task)
        except (Task.DoesNotExist, CompletionRequest.DoesNotExist):
            return Response(
                {'detail': 'Task or completion request not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if task.status != 'completionRequested':
            return Response(
                {'detail': 'Task must be in completionRequested status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if task.selected_response is None:
            return Response(
                {'detail': 'Task has no matched provider.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Can only be confirmed by the other participant
        is_owner = task.owner == request.user
        is_provider = task.selected_response.provider == request.user
        is_requester = completion_request.requested_by == request.user

        if not ((is_owner or is_provider) and not is_requester):
            logger.warning(
                'Completion confirm denied task_id=%s completion_request_id=%s actor_id=%s requester_id=%s reason=not_other_participant',
                task.id,
                completion_request.id,
                request.user.id,
                completion_request.requested_by_id,
            )
            return Response(
                {'detail': 'Only the other matched participant can confirm completion.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Confirm the request
        completion_request.status = 'confirmed'
        completion_request.confirmed_by = request.user
        completion_request.save()

        # Update task to completed
        old_status = task.status
        task.status = 'completed'
        task.save()
        logger.info(
            'Completion confirmed task_id=%s completion_request_id=%s actor_id=%s requester_id=%s old_status=%s new_status=%s',
            task.id,
            completion_request.id,
            request.user.id,
            completion_request.requested_by_id,
            old_status,
            task.status,
        )

        serializer = self.get_serializer(completion_request)
        task_serializer = TaskSerializer(task)

        return Response({
            'completionRequest': serializer.data,
            'task': task_serializer.data,
        })

    @action(detail=True, methods=['post'])
    def concerns(self, request, task_id=None, pk=None):
        """Raise a concern about task completion"""
        try:
            task = Task.objects.get(id=task_id)
            completion_request = CompletionRequest.objects.get(id=pk, task=task)
        except (Task.DoesNotExist, CompletionRequest.DoesNotExist):
            return Response(
                {'detail': 'Task or completion request not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if task.status != 'completionRequested':
            return Response(
                {'detail': 'Task must be in completionRequested status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if task.selected_response is None:
            return Response(
                {'detail': 'Task has no matched provider.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Can only raise concern as the other participant
        is_owner = task.owner == request.user
        is_provider = task.selected_response.provider == request.user
        is_requester = completion_request.requested_by == request.user

        if not ((is_owner or is_provider) and not is_requester):
            logger.warning(
                'Completion concern denied task_id=%s completion_request_id=%s actor_id=%s requester_id=%s reason=not_other_participant',
                task.id,
                completion_request.id,
                request.user.id,
                completion_request.requested_by_id,
            )
            return Response(
                {'detail': 'Only the other matched participant can raise a concern.'},
                status=status.HTTP_403_FORBIDDEN
            )

        reason = request.data.get('reason', '')
        completion_request.status = 'concernRaised'
        completion_request.concern_reason = reason
        completion_request.save()

        # Task goes back to inProgress
        old_status = task.status
        task.status = 'inProgress'
        task.save()
        logger.info(
            'Completion concern raised task_id=%s completion_request_id=%s actor_id=%s requester_id=%s old_status=%s new_status=%s',
            task.id,
            completion_request.id,
            request.user.id,
            completion_request.requested_by_id,
            old_status,
            task.status,
        )

        serializer = self.get_serializer(completion_request)
        task_serializer = TaskSerializer(task)

        return Response({
            'completionRequest': serializer.data,
            'task': task_serializer.data,
        })
