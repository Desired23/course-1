from registration_forms.models import RegistrationForm, FormQuestion

QUESTIONS = [
    {
        "order": 1,
        "label": "Giới thiệu bản thân (Bio)",
        "type": "textarea",
        "placeholder": "Hãy kể về bản thân, kinh nghiệm và lý do bạn muốn giảng dạy...",
        "help_text": "Tối thiểu vài câu để học viên hiểu về bạn.",
        "required": True,
    },
    {
        "order": 2,
        "label": "Chuyên ngành giảng dạy",
        "type": "text",
        "placeholder": "VD: Lập trình Web, Marketing, Thiết kế đồ họa...",
        "required": True,
    },
    {
        "order": 3,
        "label": "Bằng cấp / Chứng chỉ",
        "type": "text",
        "placeholder": "VD: Cử nhân CNTT, AWS Certified...",
        "help_text": "Bằng cấp hoặc chứng chỉ liên quan đến lĩnh vực giảng dạy.",
        "required": False,
    },
    {
        "order": 4,
        "label": "Số năm kinh nghiệm",
        "type": "number",
        "placeholder": "VD: 5",
        "required": True,
    },
    {
        "order": 5,
        "label": "Trình độ chuyên môn",
        "type": "select",
        "options": ["Mới bắt đầu", "Trung cấp", "Nâng cao", "Chuyên gia"],
        "required": True,
    },
    {
        "order": 6,
        "label": "Link hồ sơ / LinkedIn / Portfolio",
        "type": "url",
        "placeholder": "https://...",
        "required": False,
    },
    {
        "order": 7,
        "label": "CV / Hồ sơ năng lực",
        "type": "file",
        "help_text": "Tải lên CV (PDF) hoặc hồ sơ năng lực của bạn.",
        "required": False,
    },
]

form = RegistrationForm.objects.filter(
    type="instructor_application", is_active=True, is_deleted=False
).first()

if form is None:
    form = RegistrationForm.objects.create(
        type="instructor_application",
        title="Đơn đăng ký trở thành Giảng viên",
        description="Điền thông tin bên dưới để gửi đơn đăng ký trở thành giảng viên. "
        "Đội ngũ quản trị sẽ xem xét và phản hồi đơn của bạn.",
        is_active=True,
        version=1,
    )
    print(f"Created RegistrationForm id={form.id}")
else:
    print(f"Active instructor_application form already exists: id={form.id}")

if not form.questions.filter(is_deleted=False).exists():
    for q in QUESTIONS:
        FormQuestion.objects.create(form=form, **q)
    print(f"Created {len(QUESTIONS)} questions for form id={form.id}")
else:
    print(f"Form id={form.id} already has questions; skipping question seed.")

print("Done.")
