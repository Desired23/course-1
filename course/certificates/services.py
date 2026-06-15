import io
from pathlib import Path
from types import SimpleNamespace
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
_CERTIFICATE_TEMPLATE_PATH = Path(__file__).resolve().parent / "assets" / "certificate_template.pdf"


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
    enrollment = Enrollment.objects.select_related('course').filter(
        user=user, course_id=course_id, is_deleted=False,
        status__in=[
            Enrollment.Status.Active,
            Enrollment.Status.SUSPENDED,
            Enrollment.Status.Complete,
        ],
    ).first()
    if not enrollment:
        raise ValidationError({"error": "No eligible enrollment found for this course."})

    course = enrollment.course

    existing = Certificate.objects.filter(
        user=user, course=course, is_deleted=False, revoked=False
    ).first()
    if existing:
        return CertificateSerializer(existing).data

    total_lessons = Lesson.objects.filter(
        coursemodule__course=course,
        coursemodule__is_deleted=False,
        is_deleted=False,
        content_type__in=Lesson.ContentType.values,
    ).count()

    if total_lessons == 0:
        raise ValidationError({"error": "Course has no lessons."})

    completed_lessons = LearningProgress.objects.filter(
        user=user, course=course,
        is_completed=True, is_deleted=False,
        lesson__is_deleted=False,
        lesson__coursemodule__is_deleted=False,
        lesson__content_type__in=Lesson.ContentType.values,
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
    """Frontend My Certificates page (login required) — not a public PDF link."""
    return f"{settings.FRONTEND_URL}/user/my-certificates"


def build_course_certificate_preview(course):
    instructor_name = None
    if course.instructor and course.instructor.user:
        instructor_name = course.instructor.user.full_name

    return SimpleNamespace(
        student_name="Học viên mẫu",
        course_title=course.title,
        instructor_name=instructor_name,
        completion_date=timezone.now(),
        verification_code=f"PREVIEW-COURSE-{course.id}",
    )


def _certificate_overlay_font_text(cert):
    return " ".join([
        "GIẤY CHỨNG NHẬN",
        "Được trao tặng cho:",
        cert.student_name or "",
        cert.course_title or "",
        "đã hoàn thành khóa học",
        "Ngày cấp:",
    ])


def _draw_fit(c, text, x, y, font_name, max_size, max_width, fill_color, min_size=8):
    text = str(text or "").strip()
    if not text:
        return
    font_size = max_size
    while font_size > min_size and c.stringWidth(text, font_name, font_size) > max_width:
        font_size -= 1
    c.setFillColor(fill_color)
    c.setFont(font_name, font_size)
    c.drawCentredString(x, y, text)


def _draw_wrapped(c, text, x, y, font_name, font_size, max_width, fill_color, max_lines=2):
    words = str(text or "").split()
    if not words:
        return

    lines = []
    current = ""
    for index, word in enumerate(words):
        trial = f"{current} {word}".strip()
        if not current or c.stringWidth(trial, font_name, font_size) <= max_width:
            current = trial
            continue

        lines.append(current)
        current = word
        if len(lines) == max_lines - 1:
            current = " ".join(words[index:])
            break

    if current:
        lines.append(current)

    line_height = font_size + 5
    lines = lines[:max_lines]
    start_y = y + (len(lines) - 1) * line_height / 2
    for index, line in enumerate(lines):
        _draw_fit(
            c,
            line,
            x,
            start_y - index * line_height,
            font_name,
            font_size,
            max_width,
            fill_color,
            min_size=9,
        )


def _render_certificate_overlay(cert, width, height):
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width, height))
    regular_font, bold_font = _certificate_fonts_for_text(_certificate_overlay_font_text(cert))
    center_x = width / 2
    dark_text = HexColor("#241a10")
    muted_text = HexColor("#6d6044")
    gold_text = HexColor("#8a6a19")

    _draw_fit(
        c,
        "GIẤY CHỨNG NHẬN",
        center_x,
        height * 0.66,
        bold_font,
        30,
        width * 0.68,
        gold_text,
        min_size=14,
    )
    _draw_fit(
        c,
        "Được trao tặng cho:",
        center_x,
        height * 0.6,
        regular_font,
        15,
        width * 0.68,
        muted_text,
    )
    _draw_fit(
        c,
        cert.student_name,
        center_x,
        height * 0.535,
        bold_font,
        31,
        width * 0.68,
        dark_text,
        min_size=14,
    )
    _draw_fit(
        c,
        "đã hoàn thành khóa học",
        center_x,
        height * 0.475,
        regular_font,
        13,
        width * 0.68,
        muted_text,
    )
    _draw_wrapped(
        c,
        cert.course_title,
        center_x,
        height * 0.425,
        bold_font,
        17,
        width * 0.62,
        gold_text,
        max_lines=2,
    )

    date_str = cert.completion_date.strftime("%d/%m/%Y")
    _draw_fit(
        c,
        f"Ngày cấp: {date_str}",
        center_x,
        height * 0.25,
        regular_font,
        10,
        width * 0.5,
        muted_text,
    )

    c.save()
    return buffer.getvalue()


def _strip_text_from_stream(stream, reader):
    from pypdf.generic import ContentStream

    content = ContentStream(stream, reader)
    operations = []
    in_text_block = False
    for operands, operator in content.operations:
        if operator == b"BT":
            in_text_block = True
            continue
        if operator == b"ET":
            in_text_block = False
            continue
        if not in_text_block:
            operations.append((operands, operator))

    content.operations = operations
    return content


def _remove_text_from_xobjects(owner, reader):
    from pypdf.generic import NameObject

    resources = owner.get("/Resources")
    xobjects = resources.get("/XObject") if resources else None
    if not xobjects:
        return

    for xobject_ref in xobjects.values():
        xobject = xobject_ref.get_object()
        if xobject.get("/Subtype") != "/Form":
            continue
        stripped_content = _strip_text_from_stream(xobject, reader)
        xobject.set_data(stripped_content.get_data())
        _remove_text_from_xobjects(xobject, reader)


def _remove_template_text(page, reader):
    from pypdf.generic import NameObject

    contents = page.get_contents()
    if contents:
        page[NameObject("/Contents")] = _strip_text_from_stream(contents, reader)

    _remove_text_from_xobjects(page, reader)


def _render_certificate_pdf_with_template(cert):
    from pypdf import PdfReader, PdfWriter

    if not _CERTIFICATE_TEMPLATE_PATH.exists():
        raise FileNotFoundError(_CERTIFICATE_TEMPLATE_PATH)

    template_reader = PdfReader(str(_CERTIFICATE_TEMPLATE_PATH))
    template_page = template_reader.pages[0]
    _remove_template_text(template_page, template_reader)
    width = float(template_page.mediabox.width)
    height = float(template_page.mediabox.height)
    overlay_reader = PdfReader(io.BytesIO(_render_certificate_overlay(cert, width, height)))

    template_page.merge_page(overlay_reader.pages[0])

    writer = PdfWriter()
    writer.add_page(template_page)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def render_certificate_pdf(cert):
    """Render the certificate as a PDF and return the raw bytes.

    Generated on demand each time it is downloaded; no file is stored/uploaded.
    """
    return _render_certificate_pdf_with_template(cert)


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


def reconcile_user_certificates(user):
    """Issue any certificates the user has earned but doesn't yet have.

    Safety net for the auto-issue-on-completion flow: covers enrollments that
    completed before certificates were enabled and silent auto-issue failures.
    issue_certificate is idempotent and validates 100% completion itself, so
    each ineligible enrollment is simply skipped.
    """
    enrollments = Enrollment.objects.select_related('course').filter(
        user=user, is_deleted=False,
        course__is_deleted=False,
        status__in=[
            Enrollment.Status.Active,
            Enrollment.Status.SUSPENDED,
            Enrollment.Status.Complete,
        ],
    )
    existing_course_ids = set(
        Certificate.objects.filter(
            user=user, is_deleted=False, revoked=False
        ).values_list('course_id', flat=True)
    )
    for enrollment in enrollments:
        if enrollment.course_id in existing_course_ids:
            continue
        try:
            issue_certificate(user, enrollment.course_id)
        except Exception:
            pass


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
