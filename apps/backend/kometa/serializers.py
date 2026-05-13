import re
import unicodedata

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import CompletionRequest, Conversation, ConversationMessage, ConversationReadState, Feedback, Match, Report, Task, TaskResponse, User

class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    completedTasks = serializers.IntegerField(source='completed_tasks', read_only=True)
    accountStatus = serializers.CharField(source='account_status', read_only=True)
    avatarUrl = serializers.URLField(source='avatar_url', allow_blank=True, required=False)
    creditBalance = serializers.IntegerField(source='credit_balance', read_only=True)
    creditReserved = serializers.IntegerField(source='credit_reserved', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'name', 'location', 'bio', 'skills', 'interests',
            'rating', 'completedTasks', 'accountStatus', 'avatarUrl',
            'creditBalance', 'creditReserved'
        ]
        read_only_fields = ['id', 'rating', 'completedTasks', 'accountStatus', 'creditBalance', 'creditReserved']

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
    name = serializers.CharField(required=False, allow_blank=True, default='')
    location = serializers.CharField(required=False, allow_blank=True, default='')
    bio = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ['email', 'password', 'name', 'location', 'bio']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data.get('name', ''),
            location=validated_data.get('location', ''),
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
    location = serializers.DictField(write_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'category', 'location', 'compensation',
            'status', 'ownerId', 'selectedResponseId', 'createdAt', 'updatedAt'
        ]
        read_only_fields = ['id', 'status', 'ownerId', 'selectedResponseId', 'createdAt', 'updatedAt']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        location = {
            'label': instance.location_label,
            'isRemote': instance.location_is_remote,
        }
        if instance.location_latitude is not None:
            location['latitude'] = instance.location_latitude
        if instance.location_longitude is not None:
            location['longitude'] = instance.location_longitude
        if instance.location_city_id:
            location['cityId'] = instance.location_city_id
        if instance.location_city_label:
            location['cityLabel'] = instance.location_city_label
        if instance.location_country_code:
            location['countryCode'] = instance.location_country_code
        data['location'] = location
        return data

    def validate_location(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Location must be an object.')

        label = str(value.get('label', '')).strip()
        if not label:
            raise serializers.ValidationError({'label': 'Location label is required.'})

        is_remote = bool(value.get('isRemote', False))
        if is_remote:
            return {
                'label': label,
                'isRemote': True,
                'latitude': None,
                'longitude': None,
                'cityId': 'remote',
                'cityLabel': 'Remote',
                'countryCode': '',
            }

        latitude = value.get('latitude')
        longitude = value.get('longitude')
        if latitude is None:
            raise serializers.ValidationError({'latitude': 'Latitude is required for physical locations.'})
        if longitude is None:
            raise serializers.ValidationError({'longitude': 'Longitude is required for physical locations.'})

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (TypeError, ValueError):
            raise serializers.ValidationError('Latitude and longitude must be numbers.')

        if latitude < -90 or latitude > 90:
            raise serializers.ValidationError({'latitude': 'Latitude must be between -90 and 90.'})
        if longitude < -180 or longitude > 180:
            raise serializers.ValidationError({'longitude': 'Longitude must be between -180 and 180.'})

        city_label = str(value.get('cityLabel', '')).strip() or label.split(',')[0].strip()
        country_code = str(value.get('countryCode', '')).strip().upper()[:2]

        return {
            'label': label,
            'isRemote': False,
            'latitude': latitude,
            'longitude': longitude,
            'cityId': str(value.get('cityId', '')).strip() or self.get_fallback_city_id(city_label, country_code),
            'cityLabel': city_label,
            'countryCode': country_code,
        }

    def create(self, validated_data):
        location = validated_data.pop('location')
        self.apply_location(validated_data, location)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        location = validated_data.pop('location', None)
        if location is not None:
            self.apply_location(validated_data, location)
        return super().update(instance, validated_data)

    def apply_location(self, data, location):
        data['location_label'] = location['label']
        data['location_is_remote'] = location['isRemote']
        data['location_latitude'] = location['latitude']
        data['location_longitude'] = location['longitude']
        data['location_city_id'] = location['cityId']
        data['location_city_label'] = location['cityLabel']
        data['location_country_code'] = location['countryCode']

    def get_fallback_city_id(self, city_label, country_code):
        normalized = unicodedata.normalize('NFKD', city_label)
        ascii_value = normalized.encode('ascii', 'ignore').decode('ascii')
        city_slug = re.sub(r'[^a-z0-9]+', '-', ascii_value.lower()).strip('-')
        if not city_slug:
            return ''

        return f'{country_code.lower() if country_code else "place"}-{city_slug}'

    def validate_compensation(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Compensation must be an object.')

        if value.get('type') != 'credits':
            raise serializers.ValidationError('Compensation type must be "credits".')

        amount = value.get('amount')
        if amount is None or not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0:
            raise serializers.ValidationError('Compensation amount must be a positive integer.')

        return {'type': 'credits', 'amount': amount}


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
    participantIds = serializers.SerializerMethodField()
    lastMessageAt = serializers.DateTimeField(source='last_message_at', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    unreadCount = serializers.SerializerMethodField()
    readStates = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'taskId', 'participantIds', 'lastMessageAt', 'createdAt', 'unreadCount', 'readStates']
        read_only_fields = ['id', 'taskId', 'participantIds', 'lastMessageAt', 'createdAt', 'unreadCount', 'readStates']

    def get_unreadCount(self, instance):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 0

        queryset = instance.messages.exclude(sender_id=request.user.id)
        read_state = ConversationReadState.objects.filter(
            conversation=instance,
            user=request.user,
        ).first()
        if read_state:
            queryset = queryset.filter(created_at__gt=read_state.last_read_at)

        return queryset.count()

    def get_participantIds(self, instance):
        return [str(participant_id) for participant_id in instance.participant_ids]

    def get_readStates(self, instance):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return []
        if request.user.id not in instance.participant_ids:
            return []

        return [
            {
                'userId': str(read_state.user_id),
                'lastReadAt': serializers.DateTimeField().to_representation(read_state.last_read_at),
            }
            for read_state in instance.read_states.all()
            if read_state.user_id in instance.participant_ids
        ]


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

            request = self.context.get('request')
            reported_user_id = data.get('reported_user_id')
            if request and reported_user_id and str(reported_user_id) == str(request.user.id):
                raise serializers.ValidationError({'reportedUserId': 'Users cannot report themselves.'})

            task_id = data.get('task_id')
            if task_id:
                try:
                    task_exists = Task.objects.filter(id=task_id).exists()
                except (ValueError, DjangoValidationError):
                    task_exists = False
                if not task_exists:
                    raise serializers.ValidationError({'taskId': 'Task not found.'})
        return data

    def create(self, validated_data):
        validated_data['reporter'] = self.context['request'].user
        return super().create(validated_data)
