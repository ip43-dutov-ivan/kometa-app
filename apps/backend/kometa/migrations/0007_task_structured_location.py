from django.db import migrations, models


def backfill_remote_locations(apps, schema_editor):
    Task = apps.get_model('kometa', 'Task')
    Task.objects.filter(location_label__iexact='Remote').update(location_is_remote=True)


class Migration(migrations.Migration):

    dependencies = [
        ('kometa', '0006_user_blocked_at_user_blocked_reason_report'),
    ]

    operations = [
        migrations.RenameField(
            model_name='task',
            old_name='location',
            new_name='location_label',
        ),
        migrations.AddField(
            model_name='task',
            name='location_latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='location_longitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='location_is_remote',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_remote_locations, migrations.RunPython.noop),
    ]
