from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import TaskResponse
from ..serializers import TaskResponseSerializer


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
