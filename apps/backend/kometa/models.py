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
