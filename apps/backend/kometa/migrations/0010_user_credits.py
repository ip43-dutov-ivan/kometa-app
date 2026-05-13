from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('kometa', '0009_conversationreadstate'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='credit_balance',
            field=models.PositiveIntegerField(default=100),
        ),
        migrations.AddField(
            model_name='user',
            name='credit_reserved',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
