from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate
from .models import Feedback, User

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