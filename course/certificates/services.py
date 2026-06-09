import io
from pathlib import Path
import uuid
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import Certificate
from .serializers import (
    CertificateSerializer,
    CertificateVerifySerializer,
)
from enrollments.models import Enrollment
from learning_progress.models import LearningProgress
from lessons.models import Lesson
from courses.models import Course
from activity_logs.services import log_activity


_CERTIFICATE_FONT_REGULAR = "CertificateUnicode"
_CERTIFICATE_FONT_BOLD = "CertificateUnicodeBold"


def _certificate_font_candidates():
    base_dir = Path(getattr(settings, "BASE_DIR", "") or "")
    yield (
        base_dir / "static" / "fonts" / "NotoSans-Regular.ttf",
        base_dir / "static" / "fonts" / "NotoSans-Bold.ttf",
    )
    yield (
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    )
    yield (
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    )
    yield (
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    )
    yield (
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf"),
    )


def _font_supports_text(font_path, text):
    from reportlab.pdfbase.ttfonts import TTFont

    font = TTFont("CertificateProbe", str(font_path))
    supported = set(font.face.charToGlyph.keys())
    return all(ord(char) in supported for char in text)


def _certificate_fonts_for_text(text):
    from reportlab import rl_config
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    if _CERTIFICATE_FONT_REGULAR in pdfmetrics.getRegisteredFontNames():
        return _CERTIFICATE_FONT_REGULAR, _CERTIFICATE_FONT_BOLD

    fallback_dir = Path(rl_config.TTFSearchPath[0]) if rl_config.TTFSearchPath else None
    if fallback_dir:
        yield_candidates = list(_certificate_font_candidates())
        yield_candidates.append((fallback_dir / "Vera.ttf", fallback_dir / "VeraBd.ttf"))
    else:
        yield_candidates = list(_certificate_font_candidates())

    for regular_path, bold_path in yield_candidates:
        if not regular_path.exists():
            continue
        try:
            if not _font_supports_text(regular_path, text):
                continue
            pdfmetrics.registerFont(TTFont(_CERTIFICATE_FONT_REGULAR, str(regular_path)))
            bold_source = bold_path if bold_path.exists() and _font_supports_text(bold_path, text) else regular_path
            pdfmetrics.registerFont(TTFont(_CERTIFICATE_FONT_BOLD, str(bold_source)))
            return _CERTIFICATE_FONT_REGULAR, _CERTIFICATE_FONT_BOLD
        except Exception:
            continue

    return "Helvetica", "Helvetica-Bold"


def issue_certificate(user, course_id):
    try:
        enrollment = Enrollment.objects.select_related('course').get(
            user=user, course_id=course_id,
            status='active', is_deleted=False
        )
    except Enrollment.DoesNotExist:
        raise ValidationError({"error": "Active enrollment not found for this course."})

    course = enrollment.course

    if not course.certificate:
        raise ValidationError({"error": "This course does not offer certificates."})

    existing = Certificate.objects.filter(
        user=user, course=course, is_deleted=False, revoked=False
    ).first()
    if existing:
        return CertificateSerializer(existing).data

    total_lessons = Lesson.objects.filter(
        coursemodule__course=course,
        coursemodule__is_deleted=False,
        is_deleted=False,
    ).count()

    if total_lessons == 0:
        raise ValidationError({"error": "Course has no lessons."})

    completed_lessons = LearningProgress.objects.filter(
        user=user, course=course,
        is_completed=True, is_deleted=False,
        lesson__is_deleted=False,
        lesson__coursemodule__is_deleted=False,
    ).count()

    if completed_lessons < total_lessons:
        raise ValidationError({
            "error": "Course not fully completed.",
            "completed": completed_lessons,
            "total": total_lessons,
            "progress_percent": round(completed_lessons / total_lessons * 100, 1),
        })

    instructor_name = None
    if course.instructor and course.instructor.user:
        instructor_name = course.instructor.user.full_name

    now = timezone.now()

    verification_code = str(uuid.uuid4())
    download_url = certificate_download_url(verification_code)

    with transaction.atomic():
        certificate = Certificate.objects.create(
            user=user,
            course=course,
            enrollment=enrollment,
            verification_code=verification_code,
            certificate_url=download_url,
            student_name=user.full_name,
            course_title=course.title,
            instructor_name=instructor_name,
            completion_date=now,
        )

        enrollment.status = 'complete'
        enrollment.completion_date = now
        enrollment.certificate = certificate.verification_code
        enrollment.certificate_issue_date = now
        enrollment.save()

    log_activity(
        user_id=user.id,
        action="CERTIFICATE_ISSUED",
        entity_type="Certificate",
        entity_id=certificate.id,
        description=f"Chứng chỉ được cấp cho khóa học: {course.title}"
    )

    try:
        from notifications.services import create_notification
        create_notification(
            receiver_id=user.id,
            title="Chứng chỉ hoàn thành khóa học",
            message=f"Chúc mừng! Bạn đã hoàn thành \"{course.title}\" và nhận được chứng chỉ.",
            type='course',
            related_id=certificate.id,
            notification_code='certificate_issued',
        )
    except Exception:
        pass

    try:
        from utils.mailer.mailer import send_certificate_issued
        import threading
        threading.Thread(
            target=send_certificate_issued,
            args=(user.email, user.full_name, course.title, certificate.verification_code),
            kwargs={"instructor_name": instructor_name, "certificate_url": download_url},
            daemon=True,
        ).start()
    except Exception:
        pass

    return CertificateSerializer(certificate).data


def certificate_download_url(verification_code):
    """Public URL that streams the certificate PDF (generated on the fly)."""
    base = "http://localhost:8000" if settings.DEBUG else settings.BACKEND_PUBLIC_URL
    return f"{base}/api/certificates/public/{verification_code}/download/"


def render_certificate_pdf(cert):
    """Render the certificate as a PDF and return the raw bytes.

    Generated on demand each time it is downloaded — no file is stored/uploaded.
    """
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    font_text = " ".join([
        "CERTIFICATE OF COMPLETION",
        cert.student_name or "",
        cert.course_title or "",
        cert.instructor_name or "",
        "has successfully completed the course",
        "Instructor:",
        "Issued on:",
        "Verification Code:",
    ])
    regular_font, bold_font = _certificate_fonts_for_text(font_text)

    c.setFillColor(HexColor('#f8f9fa'))
    c.rect(0, 0, width, height, fill=True, stroke=False)

    c.setStrokeColor(HexColor('#2563eb'))
    c.setLineWidth(3)
    c.rect(30, 30, width - 60, height - 60, fill=False, stroke=True)

    c.setFillColor(HexColor('#1e3a5f'))
    c.setFont(bold_font, 36)
    c.drawCentredString(width / 2, height - 100, "CERTIFICATE OF COMPLETION")

    c.setStrokeColor(HexColor('#2563eb'))
    c.setLineWidth(1)
    c.line(width / 4, height - 120, 3 * width / 4, height - 120)

    c.setFont(bold_font, 28)
    c.setFillColor(HexColor('#111827'))
    c.drawCentredString(width / 2, height - 180, cert.student_name)

    c.setFont(regular_font, 18)
    c.setFillColor(HexColor('#374151'))
    c.drawCentredString(width / 2, height - 230, "has successfully completed the course")
    c.setFont(bold_font, 22)
    c.setFillColor(HexColor('#2563eb'))
    c.drawCentredString(width / 2, height - 265, cert.course_title)

    if cert.instructor_name:
        c.setFont(regular_font, 14)
        c.setFillColor(HexColor('#6b7280'))
        c.drawCentredString(width / 2, height - 310, f"Instructor: {cert.instructor_name}")

    c.setFont(regular_font, 12)
    c.setFillColor(HexColor('#6b7280'))
    date_str = cert.completion_date.strftime("%B %d, %Y")
    c.drawCentredString(width / 2, height - 350, f"Issued on: {date_str}")
    c.drawCentredString(width / 2, height - 375, f"Verification Code: {cert.verification_code}")

    c.save()
    return buffer.getvalue()


def generate_certificate_image(certificate_id):
    try:
        cert = Certificate.objects.get(id=certificate_id, is_deleted=False)
    except Certificate.DoesNotExist:
        raise ValidationError({"error": "Certificate not found."})

    cert.certificate_url = certificate_download_url(cert.verification_code)
    cert.save(update_fields=["certificate_url"])
    return CertificateSerializer(cert).data


def verify_certificate(verification_code):
    try:
        cert = Certificate.objects.get(
            verification_code=verification_code, is_deleted=False
        )
        return CertificateVerifySerializer(cert).data
    except Certificate.DoesNotExist:
        raise ValidationError({"error": "Certificate not found or invalid."})


def get_user_certificates(user):
    certs = Certificate.objects.filter(
        user=user, is_deleted=False
    ).order_by('-issued_at')
    return certs


def get_certificate_detail(certificate_id, user=None):
    try:
        filters = {'id': certificate_id, 'is_deleted': False}
        if user:
            filters['user'] = user
        cert = Certificate.objects.get(**filters)
        return CertificateSerializer(cert).data
    except Certificate.DoesNotExist:
        raise ValidationError({"error": "Certificate not found."})


def revoke_certificate(certificate_id, admin_user):
    try:
        cert = Certificate.objects.get(id=certificate_id, is_deleted=False)
    except Certificate.DoesNotExist:
        raise ValidationError({"error": "Certificate not found."})

    if cert.revoked:
        raise ValidationError({"error": "Certificate is already revoked."})

    cert.revoked = True
    cert.revoked_at = timezone.now()
    cert.revoked_by = admin_user
    cert.save()

    log_activity(
        user_id=admin_user.id,
        action="CERTIFICATE_REVOKED",
        entity_type="Certificate",
        entity_id=cert.id,
        description=f"Chứng chỉ bị thu hồi: {cert.course_title} - {cert.student_name}"
    )

    try:
        from notifications.services import create_notification
        create_notification(
            receiver_id=cert.user_id,
            title="Chứng chỉ đã bị thu hồi",
            message=f"Chứng chỉ cho khóa học \"{cert.course_title}\" đã bị thu hồi bởi quản trị viên.",
            type='course',
            related_id=cert.id,
            notification_code='certificate_revoked',
        )
    except Exception:
        pass

    return CertificateSerializer(cert).data


def get_course_certificates(course_id):
    certs = Certificate.objects.filter(
        course_id=course_id, is_deleted=False
    ).order_by('-issued_at')
    return certs
