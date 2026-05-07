import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    skills = models.JSONField(default=list)  # list of strings
    interests = models.JSONField(default=list)  # list of strings
    rating = models.FloatField(default=0.0)
    completed_tasks = models.PositiveIntegerField(default=0)
    account_status = models.CharField(
        max_length=20,
        choices=[('active', 'Active'), ('blocked', 'Blocked')],
        default='active'
    )
    avatar_url = models.URLField(blank=True)
    blocked_reason = models.TextField(blank=True)
    blocked_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name


class Feedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.CharField(max_length=255)
    author = models.ForeignKey(
        User,
        related_name='feedback_given',
        on_delete=models.CASCADE,
    )
    receiver = models.ForeignKey(
        User,
        related_name='feedback_received',
        on_delete=models.CASCADE,
    )
    rating = models.IntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Feedback from {self.author_id} to {self.receiver_id}'


class Task(models.Model):
    TASK_STATUS_CHOICES = [
        ('open', 'Open'),
        ('matched', 'Matched'),
        ('inProgress', 'In Progress'),
        ('completionRequested', 'Completion Requested'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    compensation = models.JSONField()  # { "type": "money", "amount": 350, "currency": "UAH" }
    status = models.CharField(max_length=20, choices=TASK_STATUS_CHOICES, default='open')
    owner = models.ForeignKey(User, related_name='tasks_owned', on_delete=models.CASCADE)
    selected_response = models.ForeignKey(
        'TaskResponse',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='selected_for_task'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class TaskResponse(models.Model):
    RESPONSE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('withdrawn', 'Withdrawn'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, related_name='responses', on_delete=models.CASCADE)
    provider = models.ForeignKey(User, related_name='task_responses', on_delete=models.CASCADE)
    comment = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=RESPONSE_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Response from {self.provider_id} for {self.task_id}'


class CompletionRequest(models.Model):
    COMPLETION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('concernRaised', 'Concern Raised'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, related_name='completion_requests', on_delete=models.CASCADE)
    requested_by = models.ForeignKey(User, related_name='completion_requests_created', on_delete=models.CASCADE)
    confirmed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        related_name='completion_requests_confirmed',
        on_delete=models.SET_NULL
    )
    status = models.CharField(max_length=20, choices=COMPLETION_STATUS_CHOICES, default='pending')
    note = models.TextField(blank=True)
    concern_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Completion request for {self.task_id}'


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        related_name='conversations',
        on_delete=models.CASCADE,
    )
    participant_ids = models.JSONField(default=list)
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Conversation for task {self.task_id}'


class ConversationMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        related_name='messages',
        on_delete=models.CASCADE,
    )
    sender = models.ForeignKey(
        User,
        related_name='sent_messages',
        on_delete=models.CASCADE,
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Message from {self.sender_id} in {self.conversation_id}'


class Match(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        related_name='matches',
        on_delete=models.CASCADE,
    )
    response = models.ForeignKey(
        TaskResponse,
        related_name='selected_match',
        on_delete=models.CASCADE,
    )
    owner = models.ForeignKey(
        User,
        related_name='matches_owner',
        on_delete=models.CASCADE,
    )
    provider = models.ForeignKey(
        User,
        related_name='matches_provider',
        on_delete=models.CASCADE,
    )
    conversation = models.ForeignKey(
        Conversation,
        null=True,
        blank=True,
        related_name='matches',
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Match for task {self.task_id} between {self.owner_id} and {self.provider_id}'


class Report(models.Model):
    REPORT_STATUS_CHOICES = [
        ('open', 'Open'),
        ('reviewing', 'Reviewing'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        User,
        related_name='reports_filed',
        on_delete=models.CASCADE,
    )
    reported_user = models.ForeignKey(
        User,
        related_name='reports_received',
        on_delete=models.CASCADE,
    )
    task = models.ForeignKey(
        Task,
        null=True,
        blank=True,
        related_name='reports',
        on_delete=models.SET_NULL,
    )
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=REPORT_STATUS_CHOICES, default='open')
    resolution_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Report by {self.reporter_id} on {self.reported_user_id}'
