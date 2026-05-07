from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.auth import register, login, logout
from .views.users import UserViewSet
from .views.conversations import ConversationViewSet, ConversationMessageViewSet
from .views.tasks import MatchViewSet, TaskViewSet, TaskResponseViewSet, CompletionRequestViewSet, MyResponsesView

app_name = 'kometa'

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'tasks', TaskViewSet, basename='tasks')
router.register(r'matches', MatchViewSet, basename='matches')
router.register(r'conversations', ConversationViewSet, basename='conversations')

urlpatterns = [
    # Auth
    path('auth/register', register, name='register'),
    path('auth/login', login, name='login'),
    path('auth/logout', logout, name='logout'),

    # Users & Tasks
    path('', include(router.urls)),
    
    # Task responses (nested under tasks)
    path('tasks/<str:task_id>/responses/', TaskResponseViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='task-responses-list'),
    path('tasks/<str:task_id>/responses/<str:pk>/accept/', TaskResponseViewSet.as_view({
        'post': 'accept'
    }), name='task-response-accept'),
    
    # Completion requests (nested under tasks)
    path('tasks/<str:task_id>/completion-requests/', CompletionRequestViewSet.as_view({
        'post': 'create'
    }), name='task-completion-requests'),
    path('tasks/<str:task_id>/completion-requests/<str:pk>/confirm/', CompletionRequestViewSet.as_view({
        'post': 'confirm'
    }), name='task-completion-confirm'),
    path('tasks/<str:task_id>/completion-requests/<str:pk>/concerns/', CompletionRequestViewSet.as_view({
        'post': 'concerns'
    }), name='task-completion-concerns'),
    path('conversations/<str:conversation_id>/messages/', ConversationMessageViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='conversation-messages'),
    path('me/responses/', MyResponsesView.as_view(), name='my-responses'),
]
