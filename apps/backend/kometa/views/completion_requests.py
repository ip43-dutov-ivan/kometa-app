import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from django.db import transaction

from ..models import CompletionRequest, Task, User
from ..serializers import CompletionRequestSerializer, TaskSerializer
from .tasks import get_credit_amount

logger = logging.getLogger(__name__)


class CompletionRequestViewSet(ModelViewSet):
    serializer_class = CompletionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get('task_id')
        if task_id:
            return CompletionRequest.objects.filter(task_id=task_id)
        return CompletionRequest.objects.all()

    def list(self, request, task_id=None):
        """List completion requests for matched task participants"""
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response(
                {'detail': 'Task not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        is_owner = task.owner == request.user
        is_provider = (
            task.selected_response is not None
            and task.selected_response.provider == request.user
        )

        if not (is_owner or is_provider):
            return Response(
                {'detail': 'Only matched participants can view completion requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

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

        if not is_provider:
            logger.warning(
                'Completion request denied task_id=%s actor_id=%s owner_id=%s provider_id=%s reason=not_provider',
                task.id,
                request.user.id,
                task.owner_id,
                task.selected_response.provider_id,
            )
            detail = (
                'Only the matched provider can request completion.'
                if is_owner
                else 'Only matched participants can request completion.'
            )
            return Response(
                {'detail': detail},
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
        with transaction.atomic():
            try:
                task = (
                    Task.objects
                    .select_for_update()
                    .select_related('owner')
                    .get(id=task_id)
                )
                completion_request = (
                    CompletionRequest.objects
                    .select_for_update()
                    .get(id=pk, task=task)
                )
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

            if completion_request.status != 'pending':
                return Response(
                    {'detail': 'Completion request must be pending.'},
                    status=status.HTTP_409_CONFLICT
                )

            if task.selected_response is None:
                return Response(
                    {'detail': 'Task has no matched provider.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            provider = task.selected_response.provider
            if task.owner_id == provider.id:
                return Response(
                    {'detail': 'Task owner cannot receive their own credit payout.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Can only be confirmed by the other participant
            is_owner = task.owner == request.user
            is_provider = provider == request.user
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

            amount = get_credit_amount(task.compensation)
            if amount is None:
                return Response(
                    {'detail': 'Task has invalid credit compensation.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            owner = User.objects.select_for_update().get(pk=task.owner_id)
            provider = User.objects.select_for_update().get(pk=provider.pk)
            if owner.credit_reserved < amount:
                return Response(
                    {'detail': 'Task owner does not have enough reserved credits for payout.'},
                    status=status.HTTP_409_CONFLICT
                )

            owner.credit_reserved -= amount
            provider.credit_balance += amount
            owner.save(update_fields=['credit_reserved'])
            provider.save(update_fields=['credit_balance'])

            # Confirm the request
            completion_request.status = 'confirmed'
            completion_request.confirmed_by = request.user
            completion_request.save()

            # Update task to completed
            old_status = task.status
            task.status = 'completed'
            task.save()
            logger.info(
                'Completion confirmed task_id=%s completion_request_id=%s actor_id=%s requester_id=%s old_status=%s new_status=%s paid_credits=%s',
                task.id,
                completion_request.id,
                request.user.id,
                completion_request.requested_by_id,
                old_status,
                task.status,
                amount,
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
