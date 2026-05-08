import logging

from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from ..models import Feedback, Task
from ..serializers import FeedbackSerializer, TaskSerializer

logger = logging.getLogger(__name__)

LEGACY_TASK_CATEGORY_LABELS = {
    'design': ['Design', 'Design review'],
    'education': ['Education'],
    'errands': ['Errands'],
    'home_tech': ['Home tech'],
    'other': ['General'],
}


class TaskViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,
):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

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
        location_city_param = self.request.query_params.get('locationCity', None)
        owner_param = self.request.query_params.get('owner', None)
        involved_param = self.request.query_params.get('involved', None)
        available_param = self.request.query_params.get('available', None)

        if status_param:
            queryset = queryset.filter(status=status_param)
        if category_param:
            category_query = Q(category__iexact=category_param)
            for legacy_label in LEGACY_TASK_CATEGORY_LABELS.get(category_param, []):
                category_query |= Q(category__iexact=legacy_label)
            queryset = queryset.filter(category_query)
        if location_param:
            queryset = queryset.filter(location_label__icontains=location_param)
        if location_city_param:
            if location_city_param == 'remote':
                queryset = queryset.filter(location_is_remote=True)
            else:
                queryset = queryset.filter(location_city_id=location_city_param)
        if owner_param == 'me':
            queryset = queryset.filter(owner=self.request.user)
        if involved_param == 'me':
            queryset = queryset.filter(
                Q(owner=self.request.user) | Q(selected_response__provider=self.request.user)
            )
        if available_param == 'true':
            queryset = (
                queryset
                .filter(status='open')
                .exclude(owner=self.request.user)
                .exclude(responses__provider=self.request.user)
                .distinct()
            )

        return queryset

    @action(detail=False, methods=['get'], url_path='location-facets')
    def location_facets(self, request):
        queryset = self.get_queryset()

        facets = (
            queryset.exclude(location_city_id='')
            .values('location_city_id', 'location_city_label')
            .annotate(count=Count('id'))
            .order_by('location_city_label')
        )

        return Response([
            {
                'id': facet['location_city_id'],
                'label': facet['location_city_label'],
                'count': facet['count'],
            }
            for facet in facets
        ])

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

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if task.owner != request.user:
            logger.warning(
                'Task delete denied task_id=%s actor_id=%s owner_id=%s reason=not_owner',
                task.id,
                request.user.id,
                task.owner_id,
            )
            return Response(
                {'detail': 'Only the task owner can delete this task.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if task.status != 'open':
            logger.warning(
                'Task delete denied task_id=%s actor_id=%s status=%s reason=invalid_status',
                task.id,
                request.user.id,
                task.status,
            )
            return Response(
                {'detail': 'Only open tasks can be deleted.'},
                status=status.HTTP_409_CONFLICT
            )

        declined_count = task.responses.filter(status='pending').update(status='declined')
        task.status = 'cancelled'
        task.save(update_fields=['status', 'updated_at'])
        logger.info(
            'Task cancelled task_id=%s owner_id=%s declined_responses=%s',
            task.id,
            request.user.id,
            declined_count,
        )
        serializer = self.get_serializer(task)
        return Response(serializer.data)

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
        if task.selected_response is None:
            return Response(
                {'detail': 'Task has no matched provider.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if task.selected_response.provider != request.user:
            logger.warning(
                'Task start denied task_id=%s actor_id=%s owner_id=%s provider_id=%s reason=not_provider',
                task.id,
                request.user.id,
                task.owner_id,
                task.selected_response.provider_id,
            )
            return Response(
                {'detail': 'Only the matched provider can start this task.'},
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

