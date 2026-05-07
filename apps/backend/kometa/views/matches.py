from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from ..models import Match
from ..serializers import MatchSerializer


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
