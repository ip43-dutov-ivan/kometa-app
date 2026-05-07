import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from ..models import Report
from ..serializers import ReportSerializer

logger = logging.getLogger(__name__)


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
