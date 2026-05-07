from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from ..models import Feedback, User
from ..serializers import FeedbackSerializer, UserSerializer

class UserViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'GET':
            serializer = UserSerializer(request.user)
            return Response(serializer.data)

        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=['get'], url_path='feedback')
    def feedback(self, request, pk=None):
        user = self.get_object()
        feedback_qs = Feedback.objects.filter(receiver=user)
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

    @action(detail=True, methods=['post'], url_path='block')
    def block(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        user = self.get_object()
        reason = request.data.get('reason', '')
        user.account_status = 'blocked'
        user.blocked_reason = reason
        from django.utils import timezone
        user.blocked_at = timezone.now()
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='unblock')
    def unblock(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        user = self.get_object()
        user.account_status = 'active'
        user.blocked_reason = ''
        user.blocked_at = None
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)