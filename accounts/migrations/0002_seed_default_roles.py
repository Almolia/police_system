from django.db import migrations

def create_default_roles(apps, schema_editor):
    # Get the Role model dynamically
    Role = apps.get_model('accounts', 'Role')
    
    roles_data = [
        {'name': 'Citizen', 'codename': 'CITIZEN', 'id': 1},
        {'name': 'Police Cadet', 'codename': 'CADET', 'id': 2},
        {'name': 'Police Officer', 'codename': 'OFFICER', 'id': 3},
        {'name': 'Detective', 'codename': 'DETECTIVE', 'id': 4},
        {'name': 'Sergeant', 'codename': 'SERGEANT', 'id': 5},
        {'name': 'Captain', 'codename': 'CAPTAIN', 'id': 6},
        {'name': 'Chief of Police', 'codename': 'CHIEF', 'id': 7},
        {'name': 'Judge', 'codename': 'JUDGE', 'id': 8},
        {'name': 'System Admin', 'codename': 'ADMIN', 'id': 9},
        {'name': 'System Admin', 'codename': 'CORONER', 'id': 10},
    ]
    
    for role in roles_data:
        Role.objects.get_or_create(
            codename=role['codename'], 
            defaults={'name': role['name'], 'id': role['id']}
        )

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'), 
    ]

    operations = [
        migrations.RunPython(create_default_roles),
    ]