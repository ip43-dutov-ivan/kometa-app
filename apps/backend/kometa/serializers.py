from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate
from .models import CompletionRequest, Conversation, Feedback, Match, Task, TaskResponse, User

class UserSerializer(serializers.ModelSerializer):
    completedTasks = serializers.IntegerField(source='completed_tasks', read_only=True)
    accountStatus = serializers.CharField(source='account_status', read_only=True)
    avatarUrl = serializers.URLField(source='avatar_url', allow_blank=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'name', 'location', 'bio', 'skills', 'interests',
            'rating', 'completedTasks', 'accountStatus', 'avatarUrl'
        ]
        read_only_fields = ['id', 'rating', 'completedTasks', 'accountStatus']

class FeedbackSerializer(serializers.ModelSerializer):
    authorId = serializers.CharField(source='author_id', read_only=True)
    receiverId = serializers.CharField(source='receiver_id', read_only=True)
    taskId = serializers.CharField(source='task_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Feedback
        fields = [
            'id', 'taskId', 'authorId', 'receiverId', 'rating', 'comment', 'createdAt'
        ]

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message='A user with that email already exists.',
            )
        ],
    )
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'password', 'name', 'location', 'bio']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],  # use email as username
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            location=validated_data['location'],
            bio=validated_data.get('bio', ''),
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        if email and password:
            user = authenticate(username=email, password=password)
            if user:
                if user.is_active:
                    data['user'] = user
                else:
                    raise serializers.ValidationError('User account is disabled.')
            else:
                raise serializers.ValidationError('Unable to log in with provided credentials.')
        else:
            raise serializers.ValidationError('Must include email and password.')

        return data
class TaskSerializer(serializers.ModelSerializer):
    ownerId = serializers.CharField(source='owner_id', read_only=True)
    selectedResponseId = serializers.CharField(source='selected_response_id', read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'category', 'location', 'compensation',
            'status', 'ownerId', 'selectedResponseId', 'createdAt', 'updatedAt'
        ]
        read_only_fields = ['id', 'status', 'ownerId', 'selectedResponseId', 'createdAt', 'updatedAt']

    def validate_compensation(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Compensation must be an object.')

        if value.get('type') != 'money':
            raise serializers.ValidationError('Compensation type must be "money".')
        if value.get('currency') != 'UAH':
            raise serializers.ValidationError('Compensation currency must be "UAH".')

        amount = value.get('amount')
        if amount is None or not isinstance(amount, (int, float)) or amount <= 0:
            raise serializers.ValidationError('Compensation amount must be a positive number.')

        return value


class TaskResponseSerializer(serializers.ModelSerializer):
    taskId = serializers.CharField(source='task_id', read_only=True)
    providerId = serializers.CharField(source='provider_id', read_only=True)
    providerName = serializers.CharField(source='provider.name', read_only=True)
    providerLocation = serializers.CharField(source='provider.location', read_only=True)
    providerAvatarUrl = serializers.URLField(source='provider.avatar_url', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = TaskResponse
        fields = [
            'id', 'taskId', 'providerId', 'providerName', 'providerLocation', 'providerAvatarUrl',
            'comment', 'status', 'createdAt'
        ]
        read_only_fields = ['id', 'taskId', 'providerId', 'providerName', 'providerLocation', 'providerAvatarUrl', 'createdAt']


class CompletionRequestSerializer(serializers.ModelSerializer):
    taskId = serializers.CharField(source='task_id', read_only=True)
    requestedByUserId = serializers.CharField(source='requested_by_id', read_only=True)
    confirmedByUserId = serializers.CharField(source='confirmed_by_id', read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    concernReason = serializers.CharField(source='concern_reason', allow_blank=True, required=False)

    class Meta:
        model = CompletionRequest
        fields = [
            'id', 'taskId', 'requestedByUserId', 'confirmedByUserId', 'status',
            'note', 'concernReason', 'createdAt', 'updatedAt'
        ]
        read_only_fields = ['id', 'taskId', 'requestedByUserId', 'confirmedByUserId', 'status', 'createdAt', 'updatedAt']


class MatchSerializer(serializers.ModelSerializer):
    taskId = serializers.CharField(source='task_id', read_only=True)
    responseId = serializers.CharField(source='response_id', read_only=True)
    ownerId = serializers.CharField(source='owner_id', read_only=True)
    providerId = serializers.CharField(source='provider_id', read_only=True)
    conversationId = serializers.CharField(source='conversation_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'taskId', 'responseId', 'ownerId', 'providerId', 'conversationId', 'createdAt'
        ]
        read_only_fields = ['id', 'taskId', 'responseId', 'ownerId', 'providerId', 'conversationId', 'createdAt']
