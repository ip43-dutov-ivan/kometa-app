from kometa.models import Task, User


def create_user(email='user@example.com', **overrides):
    defaults = {
        'username': email,
        'email': email,
        'password': 'testpass123',
        'name': 'Test User',
        'location': 'Test City',
    }
    defaults.update(overrides)
    return User.objects.create_user(**defaults)


def task_payload(**overrides):
    payload = {
        'title': 'Build a website',
        'description': 'I need a website for my business',
        'category': 'web-development',
        'location': 'Remote',
        'compensation': {
            'type': 'money',
            'amount': 500,
            'currency': 'UAH',
        },
    }
    payload.update(overrides)
    return payload


def create_task(owner, **overrides):
    defaults = task_payload()
    defaults.update(overrides)
    return Task.objects.create(owner=owner, **defaults)
