from types import SimpleNamespace

from django.test import SimpleTestCase
from django.utils import timezone

from certificates.services import _certificate_fonts_for_text, render_certificate_pdf


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

