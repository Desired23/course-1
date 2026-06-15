from types import SimpleNamespace

from django.test import SimpleTestCase
from django.utils import timezone

from certificates.services import (
    _certificate_fonts_for_text,
    build_course_certificate_preview,
    render_certificate_pdf,
)


class CertificatePdfFontTests(SimpleTestCase):
    def test_render_certificate_pdf_uses_unicode_font_for_vietnamese_text(self):
        vietnamese_text = "Học Viên Nguyễn Lập trình Trắc nghiệm"

        regular_font, bold_font = _certificate_fonts_for_text(vietnamese_text)
        self.assertNotEqual((regular_font, bold_font), ("Helvetica", "Helvetica-Bold"))

        cert = SimpleNamespace(
            student_name="Học Viên 01",
            course_title="[DEMO] Lập trình Python - Code Quiz & Trắc nghiệm",
            instructor_name="Nguyễn Văn A",
            completion_date=timezone.now(),
            verification_code="529d606a-ad8f-442e-84dd-de304789519c",
        )

        pdf = render_certificate_pdf(cert)

        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreater(len(pdf), 1000)

    def test_build_course_certificate_preview_uses_course_data_without_certificate_row(self):
        course = SimpleNamespace(
            id=7,
            title="Khóa học mẫu",
            instructor=SimpleNamespace(user=SimpleNamespace(full_name="Giảng viên mẫu")),
        )

        cert = build_course_certificate_preview(course)

        self.assertEqual(cert.student_name, "Học viên mẫu")
        self.assertEqual(cert.course_title, "Khóa học mẫu")
        self.assertEqual(cert.instructor_name, "Giảng viên mẫu")
        self.assertEqual(cert.verification_code, "PREVIEW-COURSE-7")

