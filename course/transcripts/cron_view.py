from django.http import JsonResponse

from utils.cron import read_payload, check_cron_key


def process_transcript_jobs_view(request):
    """Xử lý toàn bộ transcript job đang QUEUED (rút cạn hàng đợi mỗi lần chạy).
    Bảo vệ bằng CRON_SECRET_KEY. Job lỗi chuyển sang FAILED nên vòng lặp luôn dừng.
    """
    payload, error = read_payload(request)
    if error:
        return error
    if not check_cron_key(request, payload):
        return JsonResponse({"error": "Invalid key"}, status=403)

    from transcripts.services import run_next_transcript_job

    processed = []
    while True:
        job = run_next_transcript_job()
        if not job:
            break
        processed.append({"job_id": job.id, "status": job.status})

    return JsonResponse({
        "message": "Transcript queue drained.",
        "processed": len(processed),
        "jobs": processed,
    })
