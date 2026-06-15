# -*- coding: utf-8 -*-
"""
Tạo các khóa học demo BẰNG ĐÚNG LUỒNG API như khi giảng viên thêm khóa học thật:
  login -> tạo course (draft) -> tạo module -> upload video (Cloudinary)
  -> tạo lesson video -> tạo quiz lesson + câu hỏi (+ test case cho bài code)
  -> chuyển status pending -> published.

Không insert thẳng DB. total_lessons/total_modules để backend tự tính.
Chạy: (trong thư mục course/, server đang chạy ở 127.0.0.1:8000)
    python seed_demo_courses.py
"""
import os
import sys
import unicodedata
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import requests
from users.models import User
from users.services import _issue_auth_tokens

API = "http://127.0.0.1:8000/api"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # repo root (chứa file .mp4)

# ---- video file -> tiêu đề chủ đề (con người đọc được) ----
VID = {
    "market_research": ("Nghiên_cứu_thị_trường.mp4", "Nghiên cứu thị trường"),
    "mkt_message":     ("Thông_Điệp_Marketing.mp4", "Xây dựng thông điệp Marketing"),
    "promo_content":   ("Nội_Dung_Quảng_Bá_Thuyết_Phục.mp4", "Nội dung quảng bá thuyết phục"),
    "mkt_eval":        ("Đánh_giá_hiệu_quả_Marketing.mp4", "Đánh giá hiệu quả Marketing"),
    "py_var":          ("Biến_và_Kiểu_dữ_liệu.mp4", "Biến và kiểu dữ liệu"),
    "accounting":      ("Nguyên_tắc_kế_toán.mp4", "Nguyên tắc kế toán"),
    "invest":          ("Đầu_tư_và_quản_lý_rủi_ro.mp4", "Đầu tư và quản lý rủi ro"),
    "english":         ("Học_Tiếng_Anh_Giao_Tiếp.mp4", "Tiếng Anh giao tiếp"),
    "cert_prep":       ("Luyện_thi_chứng_chỉ.mp4", "Luyện thi chứng chỉ"),
    "time_block":      ("Sức_mạnh_Time_Blocking.mp4", "Sức mạnh của Time Blocking"),
    "energy":          ("Quản_Lý_Năng_Lượng.mp4", "Quản lý năng lượng cá nhân"),
    "execution":       ("Nền_tảng_thực_thi.mp4", "Nền tảng thực thi"),
    "active_read":     ("Khung_Đọc_Chủ_Động_3_Bước.mp4", "Khung đọc chủ động 3 bước"),
    "habit":           ("Xây_dựng_thói_quen_vận_động.mp4", "Xây dựng thói quen vận động"),
    "video_basic":     ("Dựng_video_cơ_bản.mp4", "Dựng video cơ bản"),
    "countdown":       ("10 Seconds Countdown Timer - YouTube.mp4", "Thực hành: dựng đếm ngược 10 giây"),
}

session = requests.Session()
_video_cache = {}  # key -> {"url":..., "public_id":..., "duration":...}


def hdr(token):
    return {"Authorization": f"Bearer {token}"}


def post(path, token, json=None, files=None, data=None):
    r = session.post(f"{API}{path}", headers=hdr(token), json=json, files=files, data=data, timeout=300)
    if r.status_code >= 400:
        raise RuntimeError(f"POST {path} -> {r.status_code}: {r.text[:500]}")
    return r.json()


def patch(path, token, json):
    r = session.patch(f"{API}{path}", headers=hdr(token), json=json, timeout=120)
    if r.status_code >= 400:
        raise RuntimeError(f"PATCH {path} -> {r.status_code}: {r.text[:500]}")
    return r.json()


def get(path, token):
    r = session.get(f"{API}{path}", headers=hdr(token), timeout=120)
    r.raise_for_status()
    return r.json()


def upload_video(key, token):
    """Upload 1 lần/file lên Cloudinary rồi cache lại để tái sử dụng."""
    if key in _video_cache:
        return _video_cache[key]
    fname, _title = VID[key]
    fpath = os.path.join(ROOT, fname)
    if not os.path.exists(fpath):
        raise FileNotFoundError(fpath)
    print(f"    [upload] {fname} ...", flush=True)
    with open(fpath, "rb") as f:
        files = [("files", (fname, f, "video/mp4"))]
        data = {"folder": "lesson-videos", "resource_type": "video", "delivery_type": "authenticated"}
        res = post("/cloudinary/upload/", token, files=files, data=data)
    item = res[0] if isinstance(res, list) else res
    info = {"url": item["url"], "public_id": item["public_id"], "duration": item.get("duration") or 0}
    _video_cache[key] = info
    print(f"      -> {item['public_id']}", flush=True)
    return info


def make_mc(q, opts, correct_idx, explanation, difficulty="easy", points=10):
    """Câu hỏi trắc nghiệm. correct_answer = index 0-based dạng chuỗi."""
    return {
        "question_text": q,
        "question_type": "multiple",
        "difficulty": difficulty,
        "options": [{"text": o} for o in opts],
        "correct_answer": str(correct_idx),
        "points": points,
        "explanation": explanation,
    }


def make_tf(q, correct_true, explanation, points=5):
    """True/False. options [Đúng, Sai]; correct_answer index 0 nếu đúng, 1 nếu sai."""
    return {
        "question_text": q,
        "question_type": "truefalse",
        "difficulty": "easy",
        "options": [{"text": "Đúng"}, {"text": "Sai"}],
        "correct_answer": "0" if correct_true else "1",
        "points": points,
        "explanation": explanation,
    }


# =========================================================================
# ĐỊNH NGHĨA 6 KHÓA HỌC
# =========================================================================
def C(title, short, desc, category, subcategory, level, price, objectives, requirements,
      audience, tags, chapters, programming=False):
    return dict(title=title, short=short, desc=desc, category=category, subcategory=subcategory,
                level=level, price=price, objectives=objectives, requirements=requirements,
                audience=audience, tags=tags, chapters=chapters, programming=programming)


def chap(title, desc, videos, quiz_title, questions):
    return dict(title=title, desc=desc, videos=videos, quiz_title=quiz_title, questions=questions)


# ---------- bank câu hỏi cho tái sử dụng ----------
COURSES = []

# ===== 1. DIGITAL MARKETING (instructor) =====
COURSES.append(C(
    title="Digital Marketing Toàn Diện Từ A đến Z",
    short="Làm chủ marketing số: nghiên cứu thị trường, thông điệp, nội dung và đo lường hiệu quả.",
    desc="Khóa học giúp bạn xây dựng tư duy marketing hiện đại và triển khai chiến dịch thực tế: "
         "từ nghiên cứu thị trường, định vị thông điệp, sản xuất nội dung thuyết phục đến đo lường "
         "và tối ưu hiệu quả trên các kênh số.",
    category="Marketing", subcategory="Digital Marketing",
    level="beginner", price=499000,
    objectives=["Nắm quy trình nghiên cứu thị trường", "Xây dựng thông điệp marketing rõ ràng",
                "Sản xuất nội dung quảng bá thuyết phục", "Đo lường và tối ưu hiệu quả chiến dịch"],
    requirements="Không yêu cầu kiến thức nền tảng. Chỉ cần máy tính có kết nối Internet.",
    audience=["Người mới bắt đầu với marketing", "Chủ shop online", "Sinh viên kinh tế"],
    tags=["marketing", "digital", "content", "branding"],
    chapters=[
        chap("Chương 1: Nền tảng & Nghiên cứu thị trường",
             "Hiểu thị trường, khách hàng mục tiêu và đối thủ trước khi làm marketing.",
             ["market_research", "market_research", "promo_content"],
             "Quiz Chương 1: Nghiên cứu thị trường", [
                 make_mc("Bước đầu tiên trong một chiến dịch marketing bài bản là gì?",
                         ["Chạy quảng cáo ngay", "Nghiên cứu thị trường & khách hàng", "Thiết kế logo", "Tăng ngân sách"],
                         1, "Hiểu thị trường và khách hàng là nền tảng trước mọi hoạt động."),
                 make_mc("Chân dung khách hàng (buyer persona) dùng để làm gì?",
                         ["Trang trí slide", "Mô tả khách hàng mục tiêu để định hướng nội dung", "Tính thuế", "Thiết kế web"],
                         1, "Persona giúp truyền thông đúng đối tượng."),
                 make_tf("Nghiên cứu đối thủ cạnh tranh là một phần của nghiên cứu thị trường.",
                         True, "Phân tích đối thủ giúp tìm khoảng trống thị trường."),
             ]),
        chap("Chương 2: Xây dựng thông điệp Marketing",
             "Cách tạo thông điệp ngắn gọn, khác biệt và chạm đúng nhu cầu khách hàng.",
             ["mkt_message", "mkt_message", "promo_content"],
             "Quiz Chương 2: Thông điệp", [
                 make_mc("Một thông điệp marketing tốt cần ưu tiên điều gì?",
                         ["Càng dài càng tốt", "Rõ ràng, tập trung vào lợi ích khách hàng", "Nhiều thuật ngữ chuyên môn", "Giống đối thủ"],
                         1, "Thông điệp tốt nhấn vào lợi ích cho khách hàng."),
                 make_mc("USP (Unique Selling Proposition) là gì?",
                         ["Giá rẻ nhất", "Điểm bán hàng độc nhất của sản phẩm", "Một loại quảng cáo", "Tên thương hiệu"],
                         1, "USP là yếu tố khác biệt khiến khách chọn bạn."),
                 make_tf("Thông điệp nên được điều chỉnh theo từng nhóm khách hàng.",
                         True, "Cá nhân hóa thông điệp tăng hiệu quả."),
             ]),
        chap("Chương 3: Sản xuất nội dung quảng bá",
             "Tạo nội dung thuyết phục cho các kênh số: bài viết, hình ảnh, video.",
             ["promo_content", "promo_content", "mkt_message"],
             "Quiz Chương 3: Nội dung", [
                 make_mc("Yếu tố nào giúp nội dung quảng bá thuyết phục hơn?",
                         ["Chỉ liệt kê tính năng", "Kể câu chuyện và lợi ích cụ thể", "Viết thật dài", "Dùng nhiều màu sắc"],
                         1, "Storytelling và lợi ích cụ thể tăng tính thuyết phục."),
                 make_mc("CTA (Call To Action) có vai trò gì?",
                         ["Trang trí", "Kêu gọi khách hàng hành động", "Đo lường traffic", "Tối ưu SEO"],
                         1, "CTA dẫn dắt khách hàng tới hành động mong muốn."),
                 make_tf("Nội dung nên phù hợp với đặc thù từng kênh (Facebook, TikTok, Email).",
                         True, "Mỗi kênh có định dạng và hành vi người dùng khác nhau."),
             ]),
        chap("Chương 4: Phân phối nội dung đa kênh",
             "Lên lịch và phân phối nội dung trên nhiều kênh để tối đa tiếp cận.",
             ["promo_content", "mkt_message", "market_research"],
             "Quiz Chương 4: Phân phối", [
                 make_mc("Marketing đa kênh (omni-channel) nghĩa là gì?",
                         ["Chỉ dùng 1 kênh", "Kết hợp nhiều kênh nhất quán", "Chỉ chạy quảng cáo", "Chỉ làm email"],
                         1, "Omni-channel tạo trải nghiệm nhất quán trên nhiều kênh."),
                 make_mc("Lịch nội dung (content calendar) giúp ích gì?",
                         ["Không cần thiết", "Lập kế hoạch và duy trì tần suất đăng", "Tăng giá sản phẩm", "Thay thế quảng cáo"],
                         1, "Content calendar giúp duy trì sự đều đặn và có chiến lược."),
                 make_tf("Nên đo lường hiệu quả từng kênh để phân bổ ngân sách hợp lý.",
                         True, "Dữ liệu giúp tối ưu phân bổ ngân sách."),
             ]),
        chap("Chương 5: Đo lường & Tối ưu hiệu quả",
             "Đọc số liệu, đánh giá hiệu quả và tối ưu chiến dịch marketing.",
             ["mkt_eval", "mkt_eval", "market_research"],
             "Quiz Chương 5: Đo lường", [
                 make_mc("ROI trong marketing đo lường điều gì?",
                         ["Số lượt thích", "Tỷ suất lợi nhuận trên chi phí đầu tư", "Số người theo dõi", "Số bài đăng"],
                         1, "ROI = lợi nhuận thu được so với chi phí bỏ ra."),
                 make_mc("Chỉ số CTR (Click Through Rate) phản ánh gì?",
                         ["Tỷ lệ nhấp trên số lần hiển thị", "Doanh thu", "Số đơn hàng", "Chi phí mỗi click"],
                         0, "CTR = clicks / impressions."),
                 make_tf("Tối ưu chiến dịch nên dựa trên dữ liệu thay vì cảm tính.",
                         True, "Quyết định dựa trên dữ liệu đáng tin cậy hơn."),
             ]),
    ],
))

# ===== 2. PYTHON (instructor) — có bài code =====
py_code_question = {
    "question_text": "Viết chương trình đọc 2 số nguyên a và b từ bàn phím (cách nhau bởi dấu cách) và in ra tổng của chúng.",
    "question_type": "code",
    "difficulty": "easy",
    "points": 20,
    "correct_answer": "(chấm tự động theo test cases)",
    "description": "Đọc 2 số nguyên trên một dòng (cách nhau bởi khoảng trắng) từ STDIN và in tổng ra STDOUT.",
    "starter_code": "a, b = map(int, input().split())\n# TODO: in ra tổng của a và b\n",
    "function_name": "",
    "time_limit": 5,
    "memory_limit": 128000,
    "allowed_languages": [71, 63],  # Python, JavaScript
    "explanation": "Đọc input, tách 2 số rồi in tổng: print(a + b).",
    "test_cases": [
        {"input_data": "2 3", "expected_output": "5", "is_hidden": False, "order_number": 1},
        {"input_data": "10 20", "expected_output": "30", "is_hidden": False, "order_number": 2},
        {"input_data": "100 250", "expected_output": "350", "is_hidden": True, "order_number": 3},
        {"input_data": "-5 5", "expected_output": "0", "is_hidden": True, "order_number": 4},
    ],
}

COURSES.append(C(
    title="Nhập Môn Lập Trình Python Cho Người Mới",
    short="Học Python từ con số 0: biến, kiểu dữ liệu, điều kiện, vòng lặp và viết chương trình đầu tiên.",
    desc="Khóa học lập trình Python dành cho người chưa biết gì về code. Bạn sẽ hiểu cách máy tính "
         "lưu trữ dữ liệu, làm việc với biến và kiểu dữ liệu, viết logic điều kiện - vòng lặp và "
         "tự tay hoàn thành bài tập lập trình thực hành.",
    category="Phát triển", subcategory="Ngôn ngữ lập trình",
    level="beginner", price=599000,
    objectives=["Hiểu biến và các kiểu dữ liệu trong Python", "Viết câu lệnh điều kiện và vòng lặp",
                "Đọc/ghi dữ liệu từ bàn phím", "Hoàn thành bài tập lập trình tính toán cơ bản"],
    requirements="Không cần kiến thức lập trình trước đó. Cần cài Python hoặc dùng trình chạy code trực tuyến.",
    audience=["Người mới học lập trình", "Sinh viên CNTT năm nhất", "Người chuyển ngành sang IT"],
    tags=["python", "lập trình", "beginner", "coding"],
    programming=True,
    chapters=[
        chap("Chương 1: Làm quen với Python",
             "Python là gì, cài đặt môi trường và chạy dòng code đầu tiên.",
             ["py_var", "py_var", "py_var"],
             "Quiz Chương 1: Tổng quan Python", [
                 make_mc("Python là ngôn ngữ lập trình thuộc loại nào?",
                         ["Biên dịch tĩnh như C", "Thông dịch, cú pháp dễ đọc", "Chỉ dùng cho web", "Ngôn ngữ máy"],
                         1, "Python là ngôn ngữ thông dịch, cú pháp gần ngôn ngữ tự nhiên."),
                 make_mc("Hàm nào dùng để in ra màn hình trong Python?",
                         ["echo()", "printf()", "print()", "console.log()"],
                         2, "print() là hàm in chuẩn của Python."),
                 make_tf("Python phân biệt chữ hoa và chữ thường trong tên biến.",
                         True, "Python case-sensitive: 'a' và 'A' là hai biến khác nhau."),
             ]),
        chap("Chương 2: Biến và Kiểu dữ liệu",
             "Khai báo biến, các kiểu int, float, str, bool và ép kiểu.",
             ["py_var", "py_var", "py_var"],
             "Quiz Chương 2: Biến & Kiểu dữ liệu", [
                 make_mc("Kiểu dữ liệu của giá trị 3.14 trong Python là gì?",
                         ["int", "float", "str", "bool"],
                         1, "3.14 là số thực -> float."),
                 make_mc("Cách khai báo một chuỗi (string) đúng là?",
                         ["x = 5", "x = 'hello'", "x = True", "x = [1,2]"],
                         1, "Chuỗi đặt trong dấu nháy."),
                 make_tf("Hàm int('5') sẽ chuyển chuỗi '5' thành số nguyên 5.",
                         True, "int() ép kiểu chuỗi số sang số nguyên."),
             ]),
        chap("Chương 3: Điều kiện và Vòng lặp",
             "Câu lệnh if/else và vòng lặp for/while để xây dựng logic.",
             ["py_var", "py_var", "py_var"],
             "Quiz Chương 3: Logic", [
                 make_mc("Từ khóa nào dùng cho câu lệnh điều kiện trong Python?",
                         ["when", "if", "switch", "case"],
                         1, "if/elif/else là cấu trúc điều kiện của Python."),
                 make_mc("Vòng lặp nào lặp khi điều kiện còn đúng?",
                         ["for", "while", "loop", "repeat"],
                         1, "while lặp đến khi điều kiện sai."),
                 make_tf("Trong Python, khối lệnh được xác định bằng thụt lề (indentation).",
                         True, "Python dùng thụt lề thay cho dấu ngoặc nhọn."),
             ]),
        chap("Chương 4: Nhập/Xuất dữ liệu",
             "Đọc dữ liệu từ bàn phím với input() và xử lý dữ liệu nhập.",
             ["py_var", "py_var", "py_var"],
             "Quiz Chương 4: Nhập xuất", [
                 make_mc("Hàm input() trong Python trả về kiểu dữ liệu gì?",
                         ["int", "float", "str (chuỗi)", "bool"],
                         2, "input() luôn trả về chuỗi, cần ép kiểu nếu muốn số."),
                 make_mc("Để đọc 2 số trên cùng một dòng cách nhau bởi dấu cách, ta dùng?",
                         ["input().split()", "input().join()", "read(2)", "scan()"],
                         0, "split() tách chuỗi theo khoảng trắng."),
                 make_tf("map(int, input().split()) giúp chuyển danh sách chuỗi thành số nguyên.",
                         True, "map áp dụng int lên từng phần tử."),
             ]),
        chap("Chương 5: Thực hành lập trình",
             "Tổng hợp kiến thức qua bài tập lập trình có chấm tự động.",
             ["py_var", "py_var"],
             "Quiz Chương 5: Bài tập có chấm code", [
                 make_mc("Kết quả của phép tính 7 // 2 trong Python là?",
                         ["3.5", "3", "4", "2"],
                         1, "// là chia lấy phần nguyên: 7//2 = 3."),
                 make_tf("Toán tử + có thể dùng để cộng hai số nguyên.",
                         True, "a + b cộng hai số."),
                 py_code_question,  # bài code tính tổng 2 số
             ]),
    ],
))

# ===== 3. TÀI CHÍNH (instructor) =====
COURSES.append(C(
    title="Tài Chính Cá Nhân & Đầu Tư Thông Minh",
    short="Quản lý tài chính cá nhân, hiểu nguyên tắc kế toán và đầu tư có kiểm soát rủi ro.",
    desc="Khóa học trang bị tư duy quản lý tiền bạc lành mạnh: nắm các nguyên tắc kế toán cơ bản, "
         "lập ngân sách, và xây dựng danh mục đầu tư phù hợp khẩu vị rủi ro của bản thân.",
    category="Tài chính & Kế toán", subcategory="Đầu tư & Giao dịch",
    level="all_levels", price=549000,
    objectives=["Hiểu nguyên tắc kế toán cơ bản", "Lập ngân sách cá nhân", "Phân biệt tài sản và tiêu sản",
                "Đầu tư với quản trị rủi ro"],
    requirements="Không yêu cầu kiến thức tài chính trước đó.",
    audience=["Người đi làm muốn quản lý tiền tốt hơn", "Sinh viên", "Nhà đầu tư mới"],
    tags=["tài chính", "đầu tư", "kế toán", "personal finance"],
    chapters=[
        chap("Chương 1: Nền tảng kế toán cá nhân",
             "Các nguyên tắc kế toán cơ bản áp dụng cho tài chính cá nhân.",
             ["accounting", "accounting", "invest"],
             "Quiz Chương 1: Nguyên tắc kế toán", [
                 make_mc("Phương trình kế toán cơ bản là gì?",
                         ["Tài sản = Nợ phải trả + Vốn chủ sở hữu", "Doanh thu = Chi phí", "Lãi = Vốn", "Tiền = Tài sản"],
                         0, "Tài sản = Nợ phải trả + Vốn chủ sở hữu."),
                 make_mc("Tài sản (asset) là gì?",
                         ["Khoản nợ", "Nguồn lực mang lại lợi ích kinh tế", "Chi phí", "Thuế"],
                         1, "Tài sản tạo ra lợi ích kinh tế trong tương lai."),
                 make_tf("Ghi chép thu chi đều đặn là nền tảng quản lý tài chính cá nhân.",
                         True, "Theo dõi dòng tiền giúp kiểm soát tài chính."),
             ]),
        chap("Chương 2: Lập ngân sách cá nhân",
             "Phương pháp lập ngân sách và kiểm soát chi tiêu.",
             ["accounting", "accounting", "invest"],
             "Quiz Chương 2: Ngân sách", [
                 make_mc("Quy tắc 50/30/20 phân bổ thu nhập như thế nào?",
                         ["50% tiết kiệm", "50% nhu cầu, 30% mong muốn, 20% tiết kiệm", "Toàn bộ để đầu tư", "50% nợ"],
                         1, "50% thiết yếu, 30% mong muốn, 20% tiết kiệm/đầu tư."),
                 make_mc("Quỹ dự phòng khẩn cấp nên có giá trị khoảng?",
                         ["1 ngày chi tiêu", "3-6 tháng chi tiêu", "10 năm thu nhập", "Không cần"],
                         1, "3-6 tháng chi phí sinh hoạt là mức khuyến nghị."),
                 make_tf("Nên ưu tiên trả các khoản nợ lãi suất cao trước.",
                         True, "Nợ lãi cao bào mòn tài chính nhanh nhất."),
             ]),
        chap("Chương 3: Tài sản và Tiêu sản",
             "Phân biệt tài sản tạo thu nhập và tiêu sản gây chi phí.",
             ["invest", "accounting", "invest"],
             "Quiz Chương 3: Tài sản & Tiêu sản", [
                 make_mc("Đâu là ví dụ của tài sản tạo thu nhập?",
                         ["Xe hơi cá nhân", "Cổ phiếu trả cổ tức", "Điện thoại đời mới", "Quần áo hàng hiệu"],
                         1, "Cổ phiếu cổ tức tạo dòng tiền."),
                 make_mc("Tiêu sản là gì?",
                         ["Thứ tạo thu nhập", "Thứ lấy tiền ra khỏi túi bạn", "Một loại cổ phiếu", "Khoản tiết kiệm"],
                         1, "Tiêu sản tạo chi phí và mất giá theo thời gian."),
                 make_tf("Lãi kép giúp tài sản tăng trưởng nhanh hơn theo thời gian.",
                         True, "Lãi kép là sức mạnh của đầu tư dài hạn."),
             ]),
        chap("Chương 4: Đầu tư cơ bản",
             "Các kênh đầu tư phổ biến và cách bắt đầu an toàn.",
             ["invest", "invest", "accounting"],
             "Quiz Chương 4: Đầu tư", [
                 make_mc("Đa dạng hóa danh mục (diversification) nhằm mục đích gì?",
                         ["Tăng rủi ro", "Giảm rủi ro tổng thể", "Tăng phí giao dịch", "Đảm bảo lãi"],
                         1, "Không bỏ trứng vào một giỏ để giảm rủi ro."),
                 make_mc("Đầu tư dài hạn thường phù hợp với?",
                         ["Tiền cần dùng ngày mai", "Mục tiêu tài chính nhiều năm", "Cờ bạc", "Chi tiêu hằng ngày"],
                         1, "Đầu tư dài hạn hợp với mục tiêu xa."),
                 make_tf("Lợi nhuận kỳ vọng càng cao thường đi kèm rủi ro càng lớn.",
                         True, "Quan hệ rủi ro - lợi nhuận là nguyên tắc cơ bản."),
             ]),
        chap("Chương 5: Quản trị rủi ro",
             "Đánh giá khẩu vị rủi ro và bảo vệ danh mục đầu tư.",
             ["invest", "invest", "accounting"],
             "Quiz Chương 5: Quản trị rủi ro", [
                 make_mc("Khẩu vị rủi ro (risk appetite) là gì?",
                         ["Số tiền có", "Mức rủi ro bạn sẵn sàng chấp nhận", "Lãi suất ngân hàng", "Một loại thuế"],
                         1, "Khẩu vị rủi ro phản ánh mức chấp nhận biến động."),
                 make_mc("Công cụ nào giúp giảm thiệt hại khi giá giảm mạnh?",
                         ["Mua thêm tất tay", "Cắt lỗ (stop-loss)", "Vay margin tối đa", "Bỏ qua"],
                         1, "Stop-loss giới hạn khoản lỗ."),
                 make_tf("Không nên đầu tư bằng tiền vay nóng hoặc tiền sinh hoạt thiết yếu.",
                         True, "Chỉ đầu tư phần tiền có thể chấp nhận rủi ro."),
             ]),
    ],
))

# ===== 4. TIẾNG ANH (kotenan1) =====
COURSES.append(C(
    title="Tiếng Anh Giao Tiếp & Luyện Thi Chứng Chỉ",
    short="Tự tin giao tiếp tiếng Anh hằng ngày và có lộ trình luyện thi chứng chỉ hiệu quả.",
    desc="Khóa học kết hợp giao tiếp thực tế và chiến lược luyện thi: phát âm, từ vựng theo chủ đề, "
         "mẫu câu giao tiếp thông dụng và phương pháp ôn thi các chứng chỉ phổ biến.",
    category="Giảng dạy & Học thuật", subcategory="Ngôn ngữ",
    level="beginner", price=459000,
    objectives=["Giao tiếp tiếng Anh trong tình huống hằng ngày", "Mở rộng từ vựng theo chủ đề",
                "Cải thiện phát âm", "Có chiến lược luyện thi chứng chỉ"],
    requirements="Phù hợp người mất gốc hoặc trình độ cơ bản.",
    audience=["Người mất gốc tiếng Anh", "Học sinh - sinh viên", "Người đi làm cần tiếng Anh"],
    tags=["tiếng anh", "english", "giao tiếp", "ielts", "toeic"],
    chapters=[
        chap("Chương 1: Phát âm & Nền tảng",
             "Làm quen âm cơ bản, trọng âm và nhịp điệu tiếng Anh.",
             ["english", "english", "cert_prep"],
             "Quiz Chương 1: Phát âm", [
                 make_mc("Trọng âm (stress) trong tiếng Anh quan trọng vì?",
                         ["Không quan trọng", "Ảnh hưởng đến việc người nghe hiểu đúng", "Chỉ để viết", "Chỉ trong thi cử"],
                         1, "Đặt sai trọng âm dễ gây hiểu nhầm."),
                 make_mc("Từ 'banana' có trọng âm rơi vào âm tiết thứ mấy?",
                         ["Thứ nhất", "Thứ hai", "Thứ ba", "Không có trọng âm"],
                         1, "ba-NA-na, trọng âm ở âm tiết thứ hai."),
                 make_tf("Luyện nghe thường xuyên giúp cải thiện phát âm.",
                         True, "Nghe nhiều giúp bắt chước âm chuẩn."),
             ]),
        chap("Chương 2: Giao tiếp hằng ngày",
             "Các mẫu câu chào hỏi, giới thiệu và hội thoại cơ bản.",
             ["english", "english", "cert_prep"],
             "Quiz Chương 2: Giao tiếp", [
                 make_mc("Câu nào dùng để chào hỏi lịch sự khi gặp lần đầu?",
                         ["Get out!", "Nice to meet you.", "I'm tired.", "Go away."],
                         1, "'Nice to meet you' dùng khi gặp lần đầu."),
                 make_mc("Để hỏi đường, câu nào phù hợp?",
                         ["How much is it?", "Could you tell me the way to the station?", "What time is it?", "How old are you?"],
                         1, "Hỏi đường: 'Could you tell me the way to...?'"),
                 make_tf("'How are you?' là một câu hỏi thăm sức khỏe/tình hình thông dụng.",
                         True, "Đây là câu giao tiếp xã giao phổ biến."),
             ]),
        chap("Chương 3: Từ vựng theo chủ đề",
             "Mở rộng vốn từ theo các chủ đề thông dụng.",
             ["english", "cert_prep", "english"],
             "Quiz Chương 3: Từ vựng", [
                 make_mc("Từ 'doctor' thuộc chủ đề nào?",
                         ["Đồ ăn", "Nghề nghiệp", "Thời tiết", "Màu sắc"],
                         1, "Doctor là một nghề nghiệp."),
                 make_mc("Từ trái nghĩa với 'happy' là?",
                         ["glad", "sad", "joyful", "cheerful"],
                         1, "sad (buồn) trái nghĩa với happy."),
                 make_tf("Học từ vựng theo cụm (collocation) hiệu quả hơn học từ rời rạc.",
                         True, "Cụm từ giúp dùng từ tự nhiên hơn."),
             ]),
        chap("Chương 4: Ngữ pháp thực dụng",
             "Các điểm ngữ pháp cốt lõi cho giao tiếp và thi cử.",
             ["cert_prep", "english", "cert_prep"],
             "Quiz Chương 4: Ngữ pháp", [
                 make_mc("Thì hiện tại đơn dùng để diễn tả?",
                         ["Hành động đang xảy ra ngay lúc nói", "Thói quen, sự thật hiển nhiên", "Việc đã xong", "Tương lai xa"],
                         1, "Present simple diễn tả thói quen, sự thật."),
                 make_mc("Câu nào đúng ngữ pháp?",
                         ["She go to school.", "She goes to school.", "She going school.", "She to school."],
                         1, "Chủ ngữ số ít ngôi 3 thêm 's': goes."),
                 make_tf("Mạo từ 'a/an' dùng trước danh từ đếm được số ít.",
                         True, "a/an đứng trước danh từ đếm được số ít."),
             ]),
        chap("Chương 5: Chiến lược luyện thi chứng chỉ",
             "Phương pháp ôn và làm bài thi chứng chỉ hiệu quả.",
             ["cert_prep", "cert_prep", "english"],
             "Quiz Chương 5: Luyện thi", [
                 make_mc("Khi gặp câu khó trong bài thi trắc nghiệm, nên?",
                         ["Bỏ trống mãi mãi", "Đánh dấu, làm câu dễ trước rồi quay lại", "Đoán bừa hết", "Dừng thi"],
                         1, "Quản lý thời gian: làm câu dễ trước."),
                 make_mc("Kỹ năng nào giúp cải thiện điểm Listening nhanh nhất?",
                         ["Chỉ học ngữ pháp", "Nghe đa dạng và luyện đề thường xuyên", "Học thuộc đáp án", "Không luyện"],
                         1, "Luyện nghe đa dạng + làm đề là chìa khóa."),
                 make_tf("Làm đề thi thử giúp làm quen cấu trúc và áp lực thời gian.",
                         True, "Thi thử mô phỏng điều kiện thi thật."),
             ]),
    ],
))

# ===== 5. TƯ DUY & NĂNG SUẤT (kotenan1) =====
COURSES.append(C(
    title="Tư Duy & Năng Suất Đỉnh Cao",
    short="Làm chủ thời gian, năng lượng và sự tập trung để làm việc hiệu quả hơn mỗi ngày.",
    desc="Khóa học về phát triển bản thân và năng suất: áp dụng Time Blocking, quản lý năng lượng, "
         "xây nền tảng thực thi, đọc chủ động và hình thành thói quen vận động để duy trì hiệu suất bền vững.",
    category="Phát triển cá nhân", subcategory="Năng suất cá nhân",
    level="all_levels", price=399000,
    objectives=["Áp dụng Time Blocking để quản lý thời gian", "Quản lý năng lượng cá nhân",
                "Xây dựng hệ thống thực thi", "Hình thành thói quen tích cực"],
    requirements="Không yêu cầu nền tảng. Phù hợp mọi đối tượng.",
    audience=["Người đi làm bận rộn", "Sinh viên", "Freelancer", "Người muốn cải thiện kỷ luật"],
    tags=["năng suất", "productivity", "time blocking", "thói quen", "phát triển bản thân"],
    chapters=[
        chap("Chương 1: Sức mạnh của Time Blocking",
             "Lên lịch theo khối thời gian để bảo vệ sự tập trung.",
             ["time_block", "time_block", "execution"],
             "Quiz Chương 1: Time Blocking", [
                 make_mc("Time Blocking là phương pháp gì?",
                         ["Làm nhiều việc cùng lúc", "Chia ngày thành các khối thời gian cho từng nhiệm vụ", "Trì hoãn công việc", "Ngủ nhiều hơn"],
                         1, "Time Blocking phân bổ khối thời gian cho từng việc."),
                 make_mc("Lợi ích chính của Time Blocking là?",
                         ["Tăng xao nhãng", "Bảo vệ sự tập trung sâu", "Làm việc tùy hứng", "Bỏ kế hoạch"],
                         1, "Giúp tập trung sâu vào một việc tại một thời điểm."),
                 make_tf("Đa nhiệm liên tục thường làm giảm chất lượng công việc.",
                         True, "Chuyển ngữ cảnh liên tục gây mất hiệu suất."),
             ]),
        chap("Chương 2: Quản lý năng lượng cá nhân",
             "Làm việc theo nhịp năng lượng thay vì chỉ quản lý thời gian.",
             ["energy", "energy", "habit"],
             "Quiz Chương 2: Năng lượng", [
                 make_mc("Vì sao quản lý năng lượng quan trọng như quản lý thời gian?",
                         ["Không quan trọng", "Cùng một giờ nhưng năng lượng cao thì hiệu quả hơn", "Chỉ cần ngủ", "Để giải trí"],
                         1, "Năng lượng quyết định chất lượng giờ làm việc."),
                 make_mc("Khung giờ năng lượng cao nên dùng cho?",
                         ["Việc vặt, email", "Công việc quan trọng cần tập trung", "Lướt mạng xã hội", "Nghỉ ngơi"],
                         1, "Dành giờ vàng cho việc quan trọng nhất."),
                 make_tf("Nghỉ ngơi hợp lý giúp phục hồi năng lượng và tăng năng suất.",
                         True, "Phục hồi là một phần của hiệu suất bền vững."),
             ]),
        chap("Chương 3: Nền tảng thực thi",
             "Biến kế hoạch thành hành động với hệ thống thực thi rõ ràng.",
             ["execution", "execution", "time_block"],
             "Quiz Chương 3: Thực thi", [
                 make_mc("Yếu tố nào giúp tăng khả năng hoàn thành mục tiêu?",
                         ["Mục tiêu mơ hồ", "Chia nhỏ thành bước hành động cụ thể", "Chỉ nghĩ trong đầu", "Đợi cảm hứng"],
                         1, "Chia nhỏ thành hành động cụ thể giúp dễ thực thi."),
                 make_mc("Nguyên tắc '2 phút' khuyên điều gì?",
                         ["Bỏ mọi việc nhỏ", "Việc dưới 2 phút thì làm ngay", "Chỉ làm việc dài", "Hoãn tất cả"],
                         1, "Việc nhỏ làm ngay để khỏi dồn đống."),
                 make_tf("Theo dõi tiến độ giúp duy trì động lực thực thi.",
                         True, "Thấy tiến bộ tạo động lực tiếp tục."),
             ]),
        chap("Chương 4: Đọc chủ động & Học tập hiệu quả",
             "Khung đọc chủ động 3 bước để tiếp thu nhanh và nhớ lâu.",
             ["active_read", "active_read", "execution"],
             "Quiz Chương 4: Đọc chủ động", [
                 make_mc("Đọc chủ động khác đọc thụ động ở điểm nào?",
                         ["Đọc nhanh hơn", "Đặt câu hỏi, ghi chú, kết nối ý tưởng", "Chỉ lướt qua", "Đọc to thành tiếng"],
                         1, "Đọc chủ động tương tác với nội dung."),
                 make_mc("Bước nào KHÔNG thuộc đọc chủ động?",
                         ["Đặt câu hỏi trước khi đọc", "Tóm tắt sau khi đọc", "Ghi chú ý chính", "Đọc một mạch không suy nghĩ"],
                         3, "Đọc thụ động không suy nghĩ là điều cần tránh."),
                 make_tf("Tóm tắt lại bằng lời của mình giúp ghi nhớ tốt hơn.",
                         True, "Diễn đạt lại củng cố trí nhớ."),
             ]),
        chap("Chương 5: Xây dựng thói quen bền vững",
             "Hình thành thói quen tích cực, đặc biệt là vận động.",
             ["habit", "habit", "energy"],
             "Quiz Chương 5: Thói quen", [
                 make_mc("Cách hiệu quả để bắt đầu một thói quen mới là?",
                         ["Đặt mục tiêu khổng lồ ngay", "Bắt đầu nhỏ và đều đặn", "Chỉ làm khi có hứng", "Không cần kế hoạch"],
                         1, "Thói quen nhỏ, đều đặn dễ duy trì hơn."),
                 make_mc("'Habit stacking' nghĩa là?",
                         ["Bỏ thói quen cũ", "Gắn thói quen mới vào thói quen sẵn có", "Làm mọi thứ cùng lúc", "Trì hoãn"],
                         1, "Gắn thói quen mới sau một thói quen đã có."),
                 make_tf("Vận động đều đặn giúp cải thiện năng lượng và sự tập trung.",
                         True, "Vận động hỗ trợ sức khỏe thể chất và tinh thần."),
             ]),
    ],
))

# ===== 6. DỰNG VIDEO (kotenan1) =====
COURSES.append(C(
    title="Dựng Video Cơ Bản Cho Người Mới Bắt Đầu",
    short="Học quy trình dựng video từ A-Z: cắt ghép, chuyển cảnh, âm thanh và xuất video.",
    desc="Khóa học nhập môn dựng video dành cho người mới: hiểu quy trình sản xuất, thao tác cắt ghép "
         "cơ bản, thêm hiệu ứng chuyển cảnh, xử lý âm thanh và xuất video hoàn chỉnh để đăng tải.",
    category="Nhiếp ảnh & Video", subcategory="Quay & Dựng video",
    level="beginner", price=429000,
    objectives=["Hiểu quy trình dựng video", "Thực hiện cắt ghép cơ bản", "Thêm chuyển cảnh và âm thanh",
                "Xuất video chuẩn để đăng tải"],
    requirements="Cần máy tính cài phần mềm dựng video (CapCut/Premiere/DaVinci...).",
    audience=["Người sáng tạo nội dung", "Chủ kênh TikTok/YouTube", "Người mới học dựng video"],
    tags=["dựng video", "editing", "video", "content creator"],
    chapters=[
        chap("Chương 1: Tổng quan dựng video",
             "Quy trình sản xuất video và làm quen giao diện phần mềm.",
             ["video_basic", "video_basic", "countdown"],
             "Quiz Chương 1: Tổng quan", [
                 make_mc("Bước nào thường đến TRƯỚC khi dựng (editing)?",
                         ["Xuất video", "Quay/thu thập tư liệu", "Đăng tải", "Chạy quảng cáo"],
                         1, "Cần có tư liệu trước khi dựng."),
                 make_mc("Timeline trong phần mềm dựng video dùng để?",
                         ["Tô màu", "Sắp xếp các clip theo thời gian", "Tính tiền", "Gửi email"],
                         1, "Timeline là nơi sắp xếp clip theo trình tự thời gian."),
                 make_tf("Một kịch bản/storyboard sơ bộ giúp quá trình dựng nhanh hơn.",
                         True, "Có kế hoạch giúp dựng mạch lạc."),
             ]),
        chap("Chương 2: Cắt ghép cơ bản",
             "Thao tác cắt, ghép và sắp xếp các đoạn clip.",
             ["video_basic", "video_basic", "countdown"],
             "Quiz Chương 2: Cắt ghép", [
                 make_mc("Thao tác 'cut/split' dùng để?",
                         ["Xóa toàn bộ", "Cắt một clip thành nhiều đoạn", "Tăng âm lượng", "Đổi màu"],
                         1, "Split chia clip thành các đoạn nhỏ."),
                 make_mc("Để loại bỏ đoạn thừa ở đầu/cuối clip, ta dùng?",
                         ["Trim (cắt mép)", "Export", "Render", "Zoom"],
                         0, "Trim cắt bỏ phần thừa ở hai đầu clip."),
                 make_tf("Sắp xếp clip hợp lý giúp video có mạch kể chuyện rõ ràng.",
                         True, "Trình tự clip tạo nên câu chuyện."),
             ]),
        chap("Chương 3: Chuyển cảnh & Hiệu ứng",
             "Thêm transition và hiệu ứng để video mượt mà, hấp dẫn.",
             ["video_basic", "countdown", "video_basic"],
             "Quiz Chương 3: Chuyển cảnh", [
                 make_mc("Transition (chuyển cảnh) là gì?",
                         ["Hiệu ứng nối giữa hai clip", "Cách xuất file", "Một loại âm thanh", "Phần mềm"],
                         0, "Transition là hiệu ứng chuyển tiếp giữa các cảnh."),
                 make_mc("Lạm dụng quá nhiều hiệu ứng có thể gây?",
                         ["Video chuyên nghiệp hơn", "Rối mắt, mất tập trung nội dung", "Tăng chất lượng", "Giảm dung lượng"],
                         1, "Hiệu ứng vừa đủ; lạm dụng gây rối."),
                 make_tf("Chuyển cảnh nên phục vụ nội dung, không nên phô diễn quá mức.",
                         True, "Hiệu ứng hỗ trợ kể chuyện, không lấn át."),
             ]),
        chap("Chương 4: Âm thanh & Nhạc nền",
             "Xử lý âm thanh, lồng nhạc nền và cân bằng âm lượng.",
             ["video_basic", "countdown", "video_basic"],
             "Quiz Chương 4: Âm thanh", [
                 make_mc("Vì sao âm thanh quan trọng trong video?",
                         ["Không quan trọng", "Ảnh hưởng lớn đến trải nghiệm người xem", "Chỉ để trang trí", "Làm tăng dung lượng vô ích"],
                         1, "Âm thanh kém khiến người xem rời đi nhanh."),
                 make_mc("Khi lồng nhạc nền có lời thoại, nên?",
                         ["Để nhạc to hơn lời", "Giảm nhạc nền để nghe rõ lời thoại", "Tắt lời thoại", "Bỏ nhạc"],
                         1, "Ducking: hạ nhạc nền khi có lời thoại."),
                 make_tf("Nên dùng nhạc nền có bản quyền phù hợp để tránh bị gỡ video.",
                         True, "Vi phạm bản quyền có thể bị gỡ/khóa kiếm tiền."),
             ]),
        chap("Chương 5: Xuất video & Đăng tải",
             "Thiết lập thông số xuất và đăng tải lên nền tảng.",
             ["countdown", "video_basic", "video_basic"],
             "Quiz Chương 5: Xuất video", [
                 make_mc("Độ phân giải phổ biến cho video Full HD là?",
                         ["480p", "720p", "1080p", "144p"],
                         2, "Full HD là 1920x1080 (1080p)."),
                 make_mc("Định dạng file video phổ biến để đăng tải là?",
                         [".docx", ".mp4", ".psd", ".zip"],
                         1, "MP4 là định dạng phổ biến và tương thích cao."),
                 make_tf("Nên kiểm tra lại video sau khi xuất trước khi đăng tải.",
                         True, "Xem lại để phát hiện lỗi trước khi public."),
             ]),
    ],
))


# =========================================================================
# RUNNER
# =========================================================================
def get_token(username, password=None):
    """instructor: login API thật; kotenan1: mint token (không đổi mật khẩu)."""
    if password:
        r = session.post(f"{API}/users/login", json={"username": username, "password": password}, timeout=60)
        if r.status_code < 400:
            print(f"  [auth] login API OK: {username}")
            return r.json()["access_token"]
        print(f"  [auth] login API thất bại cho {username} ({r.status_code}), chuyển sang mint token")
    user = User.objects.get(username=username)
    tok = _issue_auth_tokens(user)["access_token"]
    print(f"  [auth] mint token OK: {username}")
    return tok


def build_category_map(token):
    data = get("/categories/?page=1&page_size=300", token)
    items = data.get("results", data) if isinstance(data, dict) else data
    m = {}
    for c in items:
        m[unicodedata.normalize("NFC", c["name"])] = c["id"]
    return m


def cat_id(cat_map, name):
    return cat_map.get(unicodedata.normalize("NFC", name))


def create_course(course, token, cat_map):
    payload = {
        "title": course["title"],
        "shortdescription": course["short"],
        "description": course["desc"],
        "category": cat_id(cat_map, course["category"]),
        "subcategory": cat_id(cat_map, course["subcategory"]),
        "level": course["level"],
        "language": "Tiếng Việt",
        "price": course["price"],
        "learning_objectives": course["objectives"],
        "requirements": course["requirements"],
        "target_audience": course["audience"],
        "tags": course["tags"],
        "status": "draft",
    }
    res = post("/courses/create", token, json=payload)
    cid = res["id"]
    print(f"  [course] #{cid} {course['title']}")
    return cid


def create_video_lessons(module_id, video_keys, start_order, chapter_no, token):
    order = start_order
    for n, vk in enumerate(video_keys, start=1):
        info = upload_video(vk, token)
        _fname, topic = VID[vk]
        # UI hiển thị duration theo PHÚT (formatDuration). Quy đổi độ dài video (giây) -> phút.
        secs = int(info["duration"]) or 0
        duration_min = max(1, round(secs / 60)) if secs else 5
        payload = {
            "coursemodule": module_id,
            "title": f"Bài {chapter_no}.{n}: {topic}",
            "description": f"Video bài học: {topic}.",
            "content_type": "video",
            "video_url": info["url"],
            "video_public_id": info["public_id"],
            "duration": duration_min,
            "is_free": (chapter_no == 1 and n == 1),  # bài đầu cho học thử
            "order": order,
            "status": "published",
        }
        post("/lessons/create", token, json=payload)
        order += 1
    return order


def create_quiz(module_id, quiz_title, questions, order, chapter_no, token):
    import json as _json
    quiz_lesson = post("/lessons/create", token, json={
        "coursemodule": module_id,
        "title": f"Bài {chapter_no}.Q: {quiz_title}",
        "description": "Bài kiểm tra cuối chương.",
        "content_type": "quiz",
        "content": _json.dumps({"passingScore": 70, "attempts": 0, "totalTakers": 0, "avgScore": 0}),
        "order": order,
        "status": "published",
    })
    lesson_id = quiz_lesson["id"]
    for i, q in enumerate(questions, start=1):
        test_cases = q.pop("test_cases", None)
        body = dict(q)
        body["lesson"] = lesson_id
        body["order_number"] = i
        created = post("/quiz-questions/create/", token, json=body)
        if test_cases:
            qid = created["id"]
            for tc in test_cases:
                post("/test-cases/create/", token, json={
                    "question": qid,
                    "input_data": tc["input_data"],
                    "expected_output": tc["expected_output"],
                    "is_hidden": tc.get("is_hidden", False),
                    "points": tc.get("points", 0),
                    "order_number": tc.get("order_number", 0),
                })
            print(f"        [code] {len(test_cases)} test cases")
    return order + 1


def build_course(course, token, cat_map):
    cid = create_course(course, token, cat_map)
    for ch_no, ch in enumerate(course["chapters"], start=1):
        module = post("/course_modules/create", token, json={
            "course": cid,
            "title": ch["title"],
            "description": ch["desc"],
            "order_number": ch_no,
            "status": "Published",
        })
        mid = module["id"]
        print(f"    [module] {ch['title']}")
        order = create_video_lessons(mid, ch["videos"], 1, ch_no, token)
        create_quiz(mid, ch["quiz_title"], ch["questions"], order, ch_no, token)
    # Giảng viên chỉ GỬI DUYỆT (pending). Admin sẽ duyệt -> published.
    patch(f"/courses/{cid}/update", token, {"status": "pending"})
    print(f"  [submit] course #{cid} -> pending (chờ admin duyệt)")
    return cid


def admin_approve(cid, admin_token):
    """Admin duyệt khóa học: pending -> published."""
    patch(f"/courses/{cid}/update", admin_token, {"status": "published"})
    print(f"  [admin] duyệt course #{cid} -> published")


def main():
    print("== Lấy token 2 giảng viên ==")
    tok_a = get_token("instructor", password="password123")
    tok_b = get_token("kotenan1")  # mint, không đổi mật khẩu

    cat_map = build_category_map(tok_a)
    print(f"== Categories: {len(cat_map)} mục ==")

    # chia đều: 3 khóa instructor, 3 khóa kotenan1
    assignment = [tok_a, tok_a, tok_a, tok_b, tok_b, tok_b]
    created = []
    for course, tok in zip(COURSES, assignment):
        who = "instructor" if tok is tok_a else "kotenan1"
        print(f"\n=== [{who}] Tạo khóa: {course['title']} ===")
        cid = build_course(course, tok, cat_map)
        created.append((cid, course["title"], who))

    # ----- Admin duyệt tất cả -----
    print("\n== Admin duyệt các khóa ==")
    tok_admin = get_token("admin", password="password123")
    for cid, title, who in created:
        admin_approve(cid, tok_admin)

    print("\n==== HOÀN TẤT ====")
    for cid, title, who in created:
        print(f"  #{cid} [{who}] {title}")


if __name__ == "__main__":
    main()
