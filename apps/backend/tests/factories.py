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
        'location': {
            'label': 'Remote',
            'isRemote': True,
        },
        'compensation': {
            'type': 'credits',
            'amount': 25,
        },
    }
    payload.update(overrides)
    return payload


def create_task(owner, **overrides):
    defaults = task_payload()
    defaults.update(overrides)
    location = defaults.pop('location')
    defaults.update({
        'location_label': location['label'],
        'location_is_remote': location.get('isRemote', False),
        'location_latitude': location.get('latitude'),
        'location_longitude': location.get('longitude'),
        'location_city_id': location.get('cityId', 'remote' if location.get('isRemote', False) else ''),
        'location_city_label': location.get('cityLabel', 'Remote' if location.get('isRemote', False) else ''),
        'location_country_code': location.get('countryCode', ''),
    })
    task = Task.objects.create(owner=owner, **defaults)
    amount = defaults.get('compensation', {}).get('amount')
    if defaults.get('compensation', {}).get('type') == 'credits' and task.status not in ['completed', 'cancelled']:
        owner.credit_balance -= amount
        owner.credit_reserved += amount
        owner.save(update_fields=['credit_balance', 'credit_reserved'])
    return task
