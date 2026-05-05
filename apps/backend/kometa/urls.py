from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.auth import register, login, logout
from .views.users import UserViewSet

app_name = 'kometa'

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    # Auth
    path('auth/register', register, name='register'),
    path('auth/login', login, name='login'),
    path('auth/logout', logout, name='logout'),

    # Users
    path('', include(router.urls)),
]