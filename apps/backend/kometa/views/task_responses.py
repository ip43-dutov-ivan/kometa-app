import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from ..models import Conversation, Match, Task, TaskResponse
from ..serializers import TaskResponseSerializer

logger = logging.getLogger(__name__)


class TaskResponseViewSet(ModelViewSet):
    serializer_class = TaskResponseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get('task_id')
        if task_id:
            return TaskResponse.objects.filter(task_id=task_id)
        return TaskResponse.objects.all()

    def list(self, request, task_id=None):
        """List responses for a task (owner-only)"""
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response(
                {'detail': 'Task not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if task.owner != request.user:
            logger.warning(
                'Task responses list denied task_id=%s actor_id=%s owner_id=%s reason=not_owner',
                task.id,
                request.user.id,
                task.owner_id,
            )
            return Response(
                {'detail': 'Only task owner can view responses.'},
                status=status.HTTP_403_FORBIDDEN
            )

        status_param = request.query_params.get('status', None)
        responses_query = task.responses.all()
        if status_param:
            responses_query = responses_query.filter(status=status_param)

        try:
            limit = int(request.query_params.get('limit', 20))
            offset = int(request.query_params.get('offset', 0))
        except (TypeError, ValueError):
            limit, offset = 20, 0

        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        total = responses_query.count()
        items = responses_query[offset:offset + limit]

        serializer = self.get_serializer(items, many=True)
        return Response({
            'items': serializer.data,
            'pageInfo': {
                'limit': limit,
                'offset': offset,
                'total': total,
                'hasMore': offset + limit < total,
            },
        })

    def create(self, request, task_id=None):
        """Submit a response to a task"""
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response(
                {'detail': 'Task not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if task.owner == request.user:
            logger.warning(
                'Task response denied task_id=%s actor_id=%s reason=owner_cannot_respond',
                task.id,
                request.user.id,
            )
            return Response(
                {'detail': 'Task owner cannot submit a response.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if task.status != 'open':
            logger.warning(
                'Task response denied task_id=%s actor_id=%s status=%s reason=invalid_status',
                task.id,
                request.user.id,
                task.status,
            )
            return Response(
                {'detail': 'Can only respond to open tasks.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user already responded
        existing_response = TaskResponse.objects.filter(task=task, provider=request.user).first()
        if existing_response:
            logger.warning(
                'Task response denied task_id=%s actor_id=%s existing_response_id=%s reason=duplicate_response',
                task.id,
                request.user.id,
                existing_response.id,
            )
            return Response(
                {'detail': 'You have already submitted a response for this task.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        comment = request.data.get('comment', '')
        response_obj = TaskResponse.objects.create(
            task=task,
            provider=request.user,
            comment=comment,
            status='pending'
        )
        logger.info(
            'Task response created task_id=%s response_id=%s provider_id=%s status=%s',
            task.id,
            response_obj.id,
            request.user.id,
            response_obj.status,
        )
        serializer = self.get_serializer(response_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def accept(self, request, task_id=None, pk=None):
        """Accept a response to a task"""
        try:
            task = Task.objects.get(id=task_id)
            response_obj = TaskResponse.objects.get(id=pk, task=task)
        except (Task.DoesNotExist, TaskResponse.DoesNotExist):
            return Response(
                {'detail': 'Task or response not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if task.owner != request.user:
            logger.warning(
                'Task response accept denied task_id=%s response_id=%s actor_id=%s owner_id=%s reason=not_owner',
                task.id,
                response_obj.id,
                request.user.id,
                task.owner_id,
            )
            return Response(
                {'detail': 'Only task owner can accept responses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if task.status != 'open':
            logger.warning(
                'Task response accept denied task_id=%s response_id=%s actor_id=%s status=%s reason=invalid_status',
                task.id,
                response_obj.id,
                request.user.id,
                task.status,
            )
            return Response(
                {'detail': 'Can only accept responses for open tasks.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Decline other pending responses
        task.responses.filter(status='pending').exclude(id=pk).update(status='declined')

        # Accept this response
        response_obj.status = 'accepted'
        response_obj.save()

        # Create conversation and match
        conversation = Conversation.objects.create(
            task=task,
            participant_ids=[task.owner_id, response_obj.provider_id]
        )
        match = Match.objects.create(
            task=task,
            response=response_obj,
            owner=task.owner,
            provider=response_obj.provider,
            conversation=conversation
        )

        # Update task to matched and set selected response
        task.status = 'matched'
        task.selected_response = response_obj
        task.save()
        logger.info(
            'Task response accepted task_id=%s response_id=%s match_id=%s conversation_id=%s owner_id=%s provider_id=%s old_status=open new_status=%s',
            task.id,
            response_obj.id,
            match.id,
            conversation.id,
            task.owner_id,
            response_obj.provider_id,
            task.status,
        )

        serializer = self.get_serializer(response_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
