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

    # Tiêu đề
    elements.append(Paragraph("HÓA ĐƠN THANH TOÁN", styles['Title']))
    elements.append(Paragraph(f"Mã đơn hàng: {payment.id}", styles['Normal']))
    elements.append(Paragraph(f"Ngày thanh toán: {payment.payment_date.strftime('%d/%m/%Y')}", styles['Normal']))
    elements.append(Spacer(1, 12))

    # Header bảng
    data = [["Khóa học", "Giá", "Giảm giá", "Thành tiền"]]

    # Dữ liệu bảng
    for item in payment_details:
        data.append([
            item.course.title,
            f"{item.price:,.0f} đ",
            f"{item.discount:,.0f} đ",
            f"{item.final_price:,.0f} đ"
        ])

    # Tổng cộng
    data.append(["", "", "Tổng cộng", f"{payment.total_amount:,.0f} đ"])

    # Tạo bảng
    table = Table(data, colWidths=[200, 80, 80, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))
    elements.append(table)

    # Footer
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Cảm ơn bạn đã mua khóa học tại MyCourse!", styles['Italic']))
    elements.append(Paragraph("Nếu có thắc mắc, vui lòng liên hệ support@example.com", styles['Italic']))

    # Xuất PDF
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
    # Chuẩn hóa người nhận
    recipient_list = [to] if isinstance(to, str) else to

    # Render HTML
    html_content = render_to_string(template_name, context)

    # Tạo email
    email = EmailMessage(
        subject=subject,
        body=html_content,
        from_email=from_email,
        to=recipient_list,
    )
    email.content_subtype = "html"

    # Thêm file đính kèm nếu có
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
    # Lấy danh sách chi tiết thanh toán
    payment_details = payment.payment_details.all()
    
    if not payment_details.exists():
        logger.warning(f"[Invoice Error] Không tìm thấy payment_details cho payment_id={payment.id}")
        return False

    # HTML email
    context = {
        "payment": payment,
        "payment_details": payment_details,
        "site_name": "MyCourse",
        "support_email": "support@example.com",
    }
    html_content = render_to_string("payment_invoice.html", context)

    # PDF từ payment
    pdf_data = generate_invoice_pdf(payment, payment_details)

    # Email
    email = EmailMessage(
        subject="Xác nhận thanh toán - Hóa đơn mua khóa học",
        body=html_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user_email],
    )
    email.content_subtype = "html"

    # Đính kèm PDF
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


#kefm pdf cho thanh toan thanh cong
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
