from django.core.management.base import BaseCommand
from investigation.models import Suspect

class Command(BaseCommand):
    help = 'Nightly check to escalate suspects to MOST_WANTED if active for over 30 days.'

    def handle(self, *args, **kwargs):
        # 1. Grab all suspects currently in the initial phase
        suspects = Suspect.objects.filter(status=Suspect.SuspectStatus.UNDER_SURVEILLANCE)
        updated_count = 0

        self.stdout.write("Running nightly Most Wanted check...")

        for suspect in suspects:
            old_status = suspect.status
            
            # 2. Trigger your existing logic
            # This recalculates their threat score and automatically changes their 
            # status to MOST_WANTED if their oldest case is > 30 days old.
            suspect.calculate_metrics()
            
            # 3. Log it if they were escalated
            if old_status != suspect.status:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f"ESCALATED: {suspect.alias} is now MOST WANTED."))

        self.stdout.write(self.style.SUCCESS(f'Nightly update complete. {updated_count} suspect(s) escalated.'))