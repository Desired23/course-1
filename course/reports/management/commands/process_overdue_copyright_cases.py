from django.core.management.base import BaseCommand

from reports.copyright_services import process_overdue_cases


class Command(BaseCommand):
    help = (
        "Xử lý các case bản quyền quá hạn: reporter quá hạn -> tự đóng 'thiếu thông tin'; "
        "instructor quá hạn -> nhắc admin."
    )

    def handle(self, *args, **options):
        result = process_overdue_cases()
        self.stdout.write(
            self.style.SUCCESS(
                f"Overdue processed: auto_closed={result['auto_closed']}, "
                f"admin_notified={result['admin_notified']}"
            )
        )
