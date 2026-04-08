import time

from django.core.management.base import BaseCommand

from transcripts.services import run_next_transcript_job


class Command(BaseCommand):
    help = "Process queued transcript jobs from the database-backed queue."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Process at most one queued job.")
        parser.add_argument("--sleep", type=float, default=5.0, help="Sleep interval in seconds between polls.")

    def handle(self, *args, **options):
        run_once = options["once"]
        sleep_seconds = max(0.5, float(options["sleep"]))

        while True:
            job = run_next_transcript_job()
            if job:
                self.stdout.write(self.style.SUCCESS(f"Processed transcript job {job.id} with final status={job.status}"))
            elif run_once:
                self.stdout.write("No queued transcript jobs found.")
                return

            if run_once:
                return
            time.sleep(sleep_seconds)
