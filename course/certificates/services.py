import io
import uuid
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
        coursemodule__course=course, is_deleted=False
    ).count()

    if total_lessons == 0:
        raise ValidationError({"error": "Course has no lessons."})

    completed_lessons = LearningProgress.objects.filter(
        user=user, course=course,
        is_completed=True, is_deleted=False
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

    with transaction.atomic():
        certificate = Certificate.objects.create(
            user=user,
            course=course,
            enrollment=enrollment,
            verification_code=str(uuid.uuid4()),
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

    return CertificateSerializer(certificate).data


def generate_certificate_image(certificate_id):
    try:
        cert = Certificate.objects.get(id=certificate_id, is_deleted=False)
    except Certificate.DoesNotExist:
        raise ValidationError({"error": "Certificate not found."})

    try:
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.lib.units import inch, cm
        from reportlab.lib.colors import HexColor
        from reportlab.pdfgen import canvas

        buffer = io.BytesIO()
        width, height = landscape(A4)
        c = canvas.Canvas(buffer, pagesize=landscape(A4))

        c.setFillColor(HexColor('#f8f9fa'))
        c.rect(0, 0, width, height, fill=True, stroke=False)

        c.setStrokeColor(HexColor('#2563eb'))
        c.setLineWidth(3)
        c.rect(30, 30, width - 60, height - 60, fill=False, stroke=True)

        c.setFillColor(HexColor('#1e3a5f'))
        c.setFont("Helvetica-Bold", 36)
        c.drawCentredString(width / 2, height - 100, "CERTIFICATE OF COMPLETION")

        c.setStrokeColor(HexColor('#2563eb'))
        c.setLineWidth(1)
        c.line(width / 4, height - 120, 3 * width / 4, height - 120)

        c.setFont("Helvetica-Bold", 28)
        c.setFillColor(HexColor('#111827'))
        c.drawCentredString(width / 2, height - 180, cert.student_name)

        c.setFont("Helvetica", 18)
        c.setFillColor(HexColor('#374151'))
        c.drawCentredString(width / 2, height - 230, "has successfully completed the course")
        c.setFont("Helvetica-Bold", 22)
        c.setFillColor(HexColor('#2563eb'))
        c.drawCentredString(width / 2, height - 265, cert.course_title)

        if cert.instructor_name:
            c.setFont("Helvetica", 14)
            c.setFillColor(HexColor('#6b7280'))
            c.drawCentredString(width / 2, height - 310, f"Instructor: {cert.instructor_name}")

        c.setFont("Helvetica", 12)
        c.setFillColor(HexColor('#6b7280'))
        date_str = cert.completion_date.strftime("%B %d, %Y")
        c.drawCentredString(width / 2, height - 350, f"Issued on: {date_str}")
        c.drawCentredString(width / 2, height - 375, f"Verification Code: {cert.verification_code}")

        c.save()
        buffer.seek(0)

        from config import cloudinary_config
        import cloudinary.uploader

        upload_result = cloudinary.uploader.upload(
            buffer,
            folder="certificates",
            resource_type="raw",
            public_id=f"cert_{cert.verification_code}",
            format="pdf",
        )
        cert.certificate_url = upload_result.get("secure_url")
        cert.save()

        return CertificateSerializer(cert).data

    except ImportError:
        return CertificateSerializer(cert).data
    except Exception as e:
        raise ValidationError({"error": f"Failed to generate certificate: {str(e)}"})


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

    return CertificateSerializer(cert).data


def get_course_certificates(course_id):
    """Admin/Instructor: Get all certificates issued for a course."""
    certs = Certificate.objects.filter(
        course_id=course_id, is_deleted=False
    ).order_by('-issued_at')
    return certs
