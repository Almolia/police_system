from django.db import migrations

def create_default_roles(apps, schema_editor):
    # We use apps.get_model so we don't accidentally trigger current models 
    # if we roll back in the future. It's safer.
    Role = apps.get_model('accounts', 'Role')
    
    roles = [
        {"name": "Citizen", "codename": "CITIZEN"},
        {"name": "Police Cadet", "codename": "CADET"},
        {"name": "Police Officer", "codename": "OFFICER"},
        {"name": "Detective", "codename": "DETECTIVE"},
        {"name": "Sergeant", "codename": "SERGEANT"},
        {"name": "Captain", "codename": "CAPTAIN"},
        {"name": "Chief of Police", "codename": "CHIEF"},
        {"name": "Judge", "codename": "JUDGE"},
    ]
    
    for r in roles:
        Role.objects.get_or_create(codename=r['codename'], defaults={'name': r['name']})

class Migration(migrations.Migration):

    dependencies = [
        # This makes sure the tables are created BEFORE it tries to inject data
        ('accounts', '0001_initial'), 
    ]

    operations = [
        migrations.RunPython(create_default_roles),
    ]