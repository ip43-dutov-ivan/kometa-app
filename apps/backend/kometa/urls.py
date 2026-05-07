from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.auth import register, login, logout, refresh
from .views.users import UserViewSet
from .views.conversations import ConversationViewSet, ConversationMessageViewSet
from .views.completion_requests import CompletionRequestViewSet
from .views.matches import MatchViewSet
from .views.my_responses import MyResponsesView
from .views.reports import ReportViewSet
from .views.task_responses import TaskResponseViewSet
from .views.tasks import TaskViewSet

app_name = 'kometa'

router = DefaultRouter(trailing_slash=False)
router.register(r'users', UserViewSet, basename='users')
router.register(r'tasks', TaskViewSet, basename='tasks')
router.register(r'matches', MatchViewSet, basename='matches')
router.register(r'conversations', ConversationViewSet, basename='conversations')
router.register(r'reports', ReportViewSet, basename='reports')

urlpatterns = [
    # Auth
    path('auth/register', register, name='register'),
    path('auth/login', login, name='login'),
    path('auth/refresh', refresh, name='refresh'),
    path('auth/logout', logout, name='logout'),

    # Users & Tasks
    path('', include(router.urls)),
    
    # Task responses (nested under tasks)
    path('tasks/<str:task_id>/responses', TaskResponseViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='task-responses-list'),
    path('tasks/<str:task_id>/responses/<str:pk>/accept', TaskResponseViewSet.as_view({
        'post': 'accept'
    }), name='task-response-accept'),
    
    # Completion requests (nested under tasks)
    path('tasks/<str:task_id>/completion-requests', CompletionRequestViewSet.as_view({
        'post': 'create'
    }), name='task-completion-requests'),
    path('tasks/<str:task_id>/completion-requests/<str:pk>/confirm', CompletionRequestViewSet.as_view({
        'post': 'confirm'
    }), name='task-completion-confirm'),
    path('tasks/<str:task_id>/completion-requests/<str:pk>/concerns', CompletionRequestViewSet.as_view({
        'post': 'concerns'
    }), name='task-completion-concerns'),
    path('conversations/<str:conversation_id>/messages', ConversationMessageViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='conversation-messages'),
    path('me/responses', MyResponsesView.as_view(), name='my-responses'),
    path('admin/reports', ReportViewSet.as_view({'get': 'list'}), name='admin-reports-list'),
    path('admin/reports/<str:pk>', ReportViewSet.as_view({'patch': 'update'}), name='admin-reports-detail'),
    path('admin/users/<str:pk>/block', UserViewSet.as_view({'post': 'block'}), name='admin-user-block'),
    path('admin/users/<str:pk>/unblock', UserViewSet.as_view({'post': 'unblock'}), name='admin-user-unblock'),
]
