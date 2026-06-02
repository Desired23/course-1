from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from typing import Union, List, Optional
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import logging

logger = logging.getLogger(__name__)
from reportlab.lib import colors

def generate_invoice_pdf(payment, payment_details):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []


    elements.append(Paragraph("HÓA ĐƠN THANH TOÁN", styles['Title']))
    elements.append(Paragraph(f"Mã đơn hàng: {payment.id}", styles['Normal']))
    elements.append(Paragraph(f"Ngày thanh toán: {payment.payment_date.strftime('%d/%m/%Y')}", styles['Normal']))
    elements.append(Spacer(1, 12))


    data = [["Khóa học", "Giá", "Giảm giá", "Thành tiền"]]


    for item in payment_details:
        data.append([
            item.course.title,
            f"{item.price:,.0f} đ",
            f"{item.discount:,.0f} đ",
            f"{item.final_price:,.0f} đ"
        ])


    data.append(["", "", "Tổng cộng", f"{payment.total_amount:,.0f} đ"])


    table = Table(data, colWidths=[200, 80, 80, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))
    elements.append(table)


    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Cảm ơn bạn đã mua khóa học tại MyCourse!", styles['Italic']))
    elements.append(Paragraph("Nếu có thắc mắc, vui lòng liên hệ support@example.com", styles['Italic']))


    doc.build(elements)
    pdf_value = buffer.getvalue()
    buffer.close()
    return pdf_value


def send_email(
    subject: str,
    to: Union[str, List[str]],
    template_name: str,
    context: dict,
    attachments: Optional[list] = None,
    from_email: str = settings.DEFAULT_FROM_EMAIL,
) -> bool:
    """
    Gửi email HTML (có thể kèm file đính kèm).
    attachments: List[Tuple[filename, filedata_bytes, mimetype]]
    """

    recipient_list = [to] if isinstance(to, str) else to


    html_content = render_to_string(template_name, context)


    email = EmailMessage(
        subject=subject,
        body=html_content,
        from_email=from_email,
        to=recipient_list,
    )
    email.content_subtype = "html"


    if attachments:
        for filename, filedata, mimetype in attachments:
            email.attach(filename, filedata, mimetype)

    try:
        email.send(fail_silently=False)
        return True
    except Exception as e:
        logger.error(f"[Email Error] {e}")
        return False

def send_payment_invoice(user_email, payment):

    payment_details = payment.payment_details.all()

    if not payment_details.exists():
        logger.warning(f"[Invoice Error] Không tìm thấy payment_details cho payment_id={payment.id}")
        return False


    context = {
        "payment": payment,
        "payment_details": payment_details,
        "site_name": "MyCourse",
        "support_email": "support@example.com",
    }
    html_content = render_to_string("payment_invoice.html", context)


    pdf_data = generate_invoice_pdf(payment, payment_details)


    email = EmailMessage(
        subject="Xác nhận thanh toán - Hóa đơn mua khóa học",
        body=html_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user_email],
    )
    email.content_subtype = "html"


    email.attach(
        f"invoice_{payment.id}.pdf",
        pdf_data,
        "application/pdf"
    )

    try:
        email.send(fail_silently=False)
        return True
    except Exception as e:
        logger.error(f"[Email Error] {e}")
        return False



def send_promotion(user_email, promo_code, discount, expire_date):
    context = {
        "promo_code": promo_code,
        "discount": discount,
        "expire_date": expire_date.strftime("%d/%m/%Y"),
        "promo_url": "https://example.com/promo"
    }
    return send_email(
        subject="Ưu đãi đặc biệt dành cho bạn!",
        to=user_email,
        template_name="promotion.html",
        context=context
    )
def send_reset_password(user_email, reset_link):
    context = {
        "reset_link": reset_link
    }
    return send_email(
        subject="Yêu cầu đặt lại mật khẩu",
        to=user_email,
        template_name="reset_password.html",
        context=context
    )
def send_verify_email(user_email, verify_link, expires_in_minutes=30):
    context = {
        "verify_link": verify_link,
        "verification_url": verify_link,
        "expires_in_minutes": expires_in_minutes,
    }
    return send_email(
        subject="Xác minh địa chỉ email của bạn",
        to=user_email,
        template_name="verify_email.html",
        context=context
    )


_SUPPORT_EMAIL = "support@mycourse.vn"
_SITE_NAME = "MyCourse"


def send_enrollment_confirmation(user_email, user_name, course_title, instructor_name=None, course_url=None):
    return send_email(
        subject=f"Đăng ký thành công: {course_title}",
        to=user_email,
        template_name="enrollment_confirmation.html",
        context={
            "user_name": user_name,
            "course_title": course_title,
            "instructor_name": instructor_name,
            "course_url": course_url,
            "support_email": _SUPPORT_EMAIL,
        },
    )


def send_payment_failed(user_email, user_name, payment_id, total_amount, gateway, error_code=None, retry_url=None):
    return send_email(
        subject="Thanh toán không thành công",
        to=user_email,
        template_name="payment_failed.html",
        context={
            "user_name": user_name,
            "payment_id": payment_id,
            "total_amount": f"{total_amount:,.0f} đ" if total_amount else "",
            "gateway": gateway.upper() if gateway else "",
            "error_code": error_code,
            "retry_url": retry_url,
            "support_email": _SUPPORT_EMAIL,
        },
    )


def send_refund_approved(user_email, user_name, course_title, refund_amount, payment_id):
    return send_email(
        subject="Yêu cầu hoàn tiền đã được duyệt",
        to=user_email,
        template_name="refund_approved.html",
        context={
            "user_name": user_name,
            "course_title": course_title,
            "refund_amount": f"{refund_amount:,.0f} đ" if refund_amount else "",
            "payment_id": payment_id,
            "support_email": _SUPPORT_EMAIL,
        },
    )


def send_refund_rejected(user_email, user_name, course_title, refund_amount, note=None):
    return send_email(
        subject="Yêu cầu hoàn tiền bị từ chối",
        to=user_email,
        template_name="refund_rejected.html",
        context={
            "user_name": user_name,
            "course_title": course_title,
            "refund_amount": f"{refund_amount:,.0f} đ" if refund_amount else "",
            "note": note,
            "support_email": _SUPPORT_EMAIL,
        },
    )


def send_refund_success(user_email, user_name, course_title, refund_amount, payment_id):
    from django.utils import timezone
    return send_email(
        subject="Hoàn tiền thành công",
        to=user_email,
        template_name="refund_approved.html",
        context={
            "user_name": user_name,
            "course_title": course_title,
            "refund_amount": f"{refund_amount:,.0f} đ" if refund_amount else "",
            "payment_id": payment_id,
            "support_email": _SUPPORT_EMAIL,
        },
    )


def send_certificate_issued(user_email, user_name, course_title, verification_code, instructor_name=None, certificate_url=None):
    return send_email(
        subject=f"Chứng chỉ hoàn thành: {course_title}",
        to=user_email,
        template_name="certificate_issued.html",
        context={
            "user_name": user_name,
            "course_title": course_title,
            "instructor_name": instructor_name,
            "verification_code": verification_code,
            "certificate_url": certificate_url,
            "support_email": _SUPPORT_EMAIL,
        },
    )


def send_course_status_changed(instructor_email, instructor_name, course_title, new_status, reason=None):
    is_approved = new_status in ('published',)
    subject = f"Khóa học '{course_title}' đã được duyệt!" if is_approved else f"Cập nhật trạng thái khóa học '{course_title}'"
    return send_email(
        subject=subject,
        to=instructor_email,
        template_name="course_status_changed.html",
        context={
            "instructor_name": instructor_name,
            "course_title": course_title,
            "new_status": new_status,
            "is_approved": is_approved,
            "reason": reason,
            "support_email": _SUPPORT_EMAIL,
        },
    )


def send_application_result(user_email, user_name, action, rejection_reason=None, admin_notes=None):
    subjects = {
        'approve': "Đơn đăng ký giảng viên đã được duyệt!",
        'reject': "Kết quả đơn đăng ký giảng viên",
        'request_changes': "Yêu cầu bổ sung thông tin đơn đăng ký",
    }
    return send_email(
        subject=subjects.get(action, "Cập nhật đơn đăng ký"),
        to=user_email,
        template_name="application_result.html",
        context={
            "user_name": user_name,
            "is_approved": action == 'approve',
            "is_rejected": action == 'reject',
            "rejection_reason": rejection_reason,
            "admin_notes": admin_notes,
            "support_email": _SUPPORT_EMAIL,
        },
    )
