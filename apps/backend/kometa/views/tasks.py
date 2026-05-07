import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from ..models import Task, TaskResponse, CompletionRequest, Conversation, Feedback, Match, Report
from ..serializers import TaskSerializer, TaskResponseSerializer, CompletionRequestSerializer, FeedbackSerializer, MatchSerializer, ReportSerializer

logger = logging.getLogger(__name__)


class TaskViewSet(ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        task = serializer.save(owner=self.request.user)
        logger.info(
            'Task created task_id=%s owner_id=%s status=%s',
            task.id,
            self.request.user.id,
            task.status,
        )

    def get_queryset(self):
        queryset = Task.objects.all()
        status_param = self.request.query_params.get('status', None)
        category_param = self.request.query_params.get('category', None)
        location_param = self.request.query_params.get('location', None)
        owner_param = self.request.query_params.get('owner', None)
        involved_param = self.request.query_params.get('involved', None)
        available_param = self.request.query_params.get('available', None)

        if status_param:
            queryset = queryset.filter(status=status_param)
        if category_param:
            queryset = queryset.filter(category__icontains=category_param)
        if location_param:
            queryset = queryset.filter(location__icontains=location_param)
        if owner_param == 'me':
            queryset = queryset.filter(owner=self.request.user)
        if involved_param == 'me':
            queryset = queryset.filter(
                Q(owner=self.request.user) | Q(selected_response__provider=self.request.user)
            )
        if available_param == 'true':
            queryset = queryset.filter(status='open').exclude(owner=self.request.user)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        total = queryset.count()

        try:
            limit = int(request.query_params.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        try:
            offset = int(request.query_params.get('offset', 0))
        except (TypeError, ValueError):
            offset = 0

        limit = max(1, min(limit, 100))
        offset = max(0, offset)

        items = queryset[offset:offset + limit]
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

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if task.owner != request.user:
            logger.warning(
                'Task update denied task_id=%s actor_id=%s owner_id=%s reason=not_owner',
                task.id,
                request.user.id,
                task.owner_id,
            )
            return Response(
                {'detail': 'Only the task owner can update this task.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if task.status != 'open':
            logger.warning(
                'Task update denied task_id=%s actor_id=%s status=%s reason=invalid_status',
                task.id,
                request.user.id,
                task.status,
            )
            return Response(
                {'detail': 'Can only update tasks in open status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(task, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            logger.info(
                'Task updated task_id=%s owner_id=%s status=%s',
                task.id,
                request.user.id,
                task.status,
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        task = self.get_object()
        if task.status != 'matched':
            logger.warning(
                'Task start denied task_id=%s actor_id=%s status=%s reason=invalid_status',
                task.id,
                request.user.id,
                task.status,
            )
            return Response(
                {'detail': 'Can only start tasks in matched status.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if task.owner != request.user and task.selected_response.provider != request.user:
            logger.warning(
                'Task start denied task_id=%s actor_id=%s owner_id=%s provider_id=%s reason=not_participant',
                task.id,
                request.user.id,
                task.owner_id,
                task.selected_response.provider_id,
            )
            return Response(
                {'detail': 'Only the task owner or provider can start this task.'},
                status=status.HTTP_403_FORBIDDEN
            )

        old_status = task.status
        task.status = 'inProgress'
        task.save()
        logger.info(
            'Task started task_id=%s actor_id=%s old_status=%s new_status=%s',
            task.id,
            request.user.id,
            old_status,
            task.status,
        )
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='feedback')
    def feedback(self, request, pk=None):
        task = self.get_object()
        if task.status != 'completed':
            return Response(
                {'detail': 'Feedback is allowed only after task is completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if task.owner == request.user:
            receiver = task.selected_response.provider if task.selected_response else None
        elif task.selected_response and task.selected_response.provider == request.user:
            receiver = task.owner
        else:
            return Response(
                {'detail': 'Only matched participants can access feedback.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method == 'POST':
            if receiver is None:
                return Response(
                    {'detail': 'Task has no matched provider.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            existing_feedback = Feedback.objects.filter(task_id=str(task.id), author=request.user).first()
            if existing_feedback:
                return Response(
                    {'detail': 'Feedback already submitted for this task.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            rating = request.data.get('rating')
            comment = request.data.get('comment', '')
            if rating is None:
                return Response(
                    {'detail': 'Rating is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                rating = int(rating)
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'Rating must be an integer.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if rating < 1 or rating > 5:
                return Response(
                    {'detail': 'Rating must be between 1 and 5.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            feedback = Feedback.objects.create(
                task_id=str(task.id),
                author=request.user,
                receiver=receiver,
                rating=rating,
                comment=comment,
            )
            logger.info(
                'Feedback created feedback_id=%s task_id=%s author_id=%s receiver_id=%s rating=%s',
                feedback.id,
                task.id,
                request.user.id,
                receiver.id,
                rating,
            )
            serializer = FeedbackSerializer(feedback)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        feedback_qs = Feedback.objects.filter(task_id=str(task.id))
        total = feedback_qs.count()

        try:
            limit = int(request.query_params.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        try:
            offset = int(request.query_params.get('offset', 0))
        except (TypeError, ValueError):
            offset = 0

        limit = max(1, min(limit, 100))
        offset = max(0, offset)

        items = feedback_qs[offset:offset + limit]
        serializer = FeedbackSerializer(items, many=True)
        return Response({
            'items': serializer.data,
            'pageInfo': {
                'limit': limit,
                'offset': offset,
                'total': total,
                'hasMore': offset + limit < total,
            },
        })


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


class MyResponsesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        responses_query = TaskResponse.objects.filter(provider=request.user)
        status_param = request.query_params.get('status', None)
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

        serializer = TaskResponseSerializer(items, many=True)
        return Response({
            'items': serializer.data,
            'pageInfo': {
                'limit': limit,
                'offset': offset,
                'total': total,
                'hasMore': offset + limit < total,
            },
        })


class MatchViewSet(ModelViewSet):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Match.objects.filter(
            Q(owner=self.request.user) | Q(provider=self.request.user)
        )
        active_only = self.request.query_params.get('activeOnly', None)
        if active_only == 'true':
            queryset = queryset.filter(
                task__status__in=['matched', 'inProgress', 'completionRequested']
            )
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        total = queryset.count()

        try:
            limit = int(request.query_params.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        try:
            offset = int(request.query_params.get('offset', 0))
        except (TypeError, ValueError):
            offset = 0

        limit = max(1, min(limit, 100))
        offset = max(0, offset)

        items = queryset[offset:offset + limit]
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


class ReportViewSet(ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_staff:
            # Non-admin can only see their own reports
            return Report.objects.filter(reporter=self.request.user)
        # Admin can see all
        queryset = Report.objects.all()
        status_param = self.request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    def list(self, request, *args, **kwargs):
        if not request.user.is_staff:
            logger.warning(
                'Admin action denied action=list_reports actor_id=%s',
                request.user.id,
            )
            return Response(
                {'detail': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        queryset = self.get_queryset()
        total = queryset.count()

        try:
            limit = int(request.query_params.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        try:
            offset = int(request.query_params.get('offset', 0))
        except (TypeError, ValueError):
            offset = 0

        limit = max(1, min(limit, 100))
        offset = max(0, offset)

        items = queryset[offset:offset + limit]
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            report = serializer.save()
            logger.info(
                'Report created report_id=%s reporter_id=%s reported_user_id=%s task_id=%s status=%s',
                report.id,
                report.reporter_id,
                report.reported_user_id,
                report.task_id,
                report.status,
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            logger.warning(
                'Admin action denied action=update_report actor_id=%s report_id=%s',
                request.user.id,
                kwargs.get('pk'),
            )
            return Response(
                {'detail': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        partial = kwargs.pop('partial', False)
        report = self.get_object()
        old_status = report.status
        serializer = self.get_serializer(report, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        logger.info(
            'Report updated report_id=%s actor_id=%s old_status=%s new_status=%s',
            report.id,
            request.user.id,
            old_status,
            serializer.instance.status,
        )
        return Response(serializer.data)
