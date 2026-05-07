from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate
from .models import CompletionRequest, Conversation, ConversationMessage, Feedback, Match, Report, Task, TaskResponse, User

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


class ConversationSerializer(serializers.ModelSerializer):
    taskId = serializers.CharField(source='task_id', read_only=True)
    participantIds = serializers.ListField(source='participant_ids', child=serializers.IntegerField(), read_only=True)
    lastMessageAt = serializers.DateTimeField(source='last_message_at', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'taskId', 'participantIds', 'lastMessageAt', 'createdAt']
        read_only_fields = ['id', 'taskId', 'participantIds', 'lastMessageAt', 'createdAt']


class ConversationMessageSerializer(serializers.ModelSerializer):
    conversationId = serializers.CharField(source='conversation_id', read_only=True)
    senderId = serializers.CharField(source='sender_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = ConversationMessage
        fields = ['id', 'conversationId', 'senderId', 'body', 'createdAt']
        read_only_fields = ['id', 'conversationId', 'senderId', 'createdAt']


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


class ReportSerializer(serializers.ModelSerializer):
    reporterId = serializers.CharField(source='reporter_id', read_only=True)
    reportedUserId = serializers.CharField(source='reported_user_id', required=False)
    taskId = serializers.CharField(source='task_id', allow_null=True, required=False)
    reason = serializers.CharField(required=False)
    resolutionNote = serializers.CharField(source='resolution_note', allow_blank=True, required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'reporterId', 'reportedUserId', 'taskId', 'reason', 'status',
            'resolutionNote', 'createdAt', 'updatedAt'
        ]
        read_only_fields = ['id', 'reporterId', 'createdAt', 'updatedAt']

    def validate(self, data):
        if self.instance is None:  # create
            if 'reported_user_id' not in data:
                raise serializers.ValidationError({'reportedUserId': 'This field is required.'})
            if 'reason' not in data:
                raise serializers.ValidationError({'reason': 'This field is required.'})
        return data

    def create(self, validated_data):
        validated_data['reporter'] = self.context['request'].user
        return super().create(validated_data)
