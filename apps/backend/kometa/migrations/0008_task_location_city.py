import re
import unicodedata

from django.db import migrations, models


def slugify(value):
    normalized = unicodedata.normalize('NFKD', value)
    ascii_value = normalized.encode('ascii', 'ignore').decode('ascii')
    slug = re.sub(r'[^a-z0-9]+', '-', ascii_value.lower()).strip('-')
    return slug


def backfill_location_cities(apps, schema_editor):
    Task = apps.get_model('kometa', 'Task')

    for task in Task.objects.all():
        if task.location_is_remote:
            task.location_city_id = 'remote'
            task.location_city_label = 'Remote'
            task.location_country_code = ''
        else:
            city_label = task.location_label.split(',')[0].strip()
            city_slug = slugify(city_label)
            if city_slug:
                task.location_city_id = f'ua-{city_slug}'
                task.location_city_label = city_label
                task.location_country_code = 'UA'

        task.save(update_fields=[
            'location_city_id',
            'location_city_label',
            'location_country_code',
        ])


class Migration(migrations.Migration):

    dependencies = [
        ('kometa', '0007_task_structured_location'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='location_city_id',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='task',
            name='location_city_label',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='task',
            name='location_country_code',
            field=models.CharField(blank=True, max_length=2),
        ),
        migrations.RunPython(backfill_location_cities, migrations.RunPython.noop),
    ]
