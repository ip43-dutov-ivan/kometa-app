#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from kometa.models import User
User.objects.all().delete()
print('Database cleared')
