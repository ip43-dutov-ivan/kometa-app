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
