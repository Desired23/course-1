import json
import re
import time

try:
    from google import genai
except Exception:
    genai = None


GEMINI_FILTER_PROMPT = """
Bạn là bộ phân tích yêu cầu cho chatbot khóa học.
Nhiệm vụ duy nhất: đọc hội thoại và trả JSON filter plan để backend truy vấn database.
Không gọi SQL, không tự bịa khóa học, không trả lời người dùng ở bước này.

Schema hợp lệ:
{
  "action": "retrieve_courses" | "ask_clarification" | "unsupported",
  "response_type": "course_list" | "path" | "comparison" | "answer",
  "query": "từ khóa tìm kiếm ngắn",
  "topics": ["topic hoặc synonym cần tìm"],
  "filters": {
    "levels": ["beginner" | "intermediate" | "advanced" | "all_levels"],
    "language": "ngôn ngữ khóa học hoặc null",
    "max_effective_price": number | null,
    "min_rating": number | null,
    "has_certificate": true | false | null,
    "free_only": true | false
  },
  "sort": "relevance" | "popular" | "rating" | "price_asc" | "price_desc",
  "limit": number,
  "source_course_ids": [number],
  "message": "câu hỏi làm rõ hoặc lý do unsupported, ngược lại để rỗng"
}

Luật:
- Return JSON only.
- Nếu người dùng muốn tìm/list/xem khóa học, trả action=retrieve_courses và response_type=course_list.
- Nếu người dùng muốn lộ trình/roadmap/kế hoạch học, trả action=retrieve_courses và response_type=path.
- Nếu người dùng hỏi giá, ngôn ngữ, rating, chứng chỉ, hoặc muốn so sánh khóa học, trả action=retrieve_courses và response_type=comparison hoặc answer.
- Chỉ hỏi làm rõ khi không có topic/query đủ để retrieve. Nếu user nói "tất cả level" hoặc "level nào cũng được" thì không hỏi level nữa.
- `topics` nên chứa cả synonym phổ biến: nodejs -> node.js, node, express, javascript, backend; toeic -> toeic, english; ml -> machine learning, ai, data, python.
- Nếu user muốn tiếp tục từ danh sách/lộ trình đã trả trước đó, dùng artifact trong hội thoại và trả source_course_ids từ artifact đó.
- `limit` trong khoảng 5-40, mặc định 20.
- Không bao giờ tạo field ngoài schema.
""".strip()


GEMINI_ANSWER_PROMPT = """
Bạn là trợ lý tư vấn khóa học cho nền tảng học trực tuyến.
Backend đã retrieve danh sách khóa học liên quan từ database. Bạn chỉ được dùng course_id có trong catalog_snapshot.

Output JSON only, một trong các dạng:
{"type":"question","message":"..."}
{"type":"course_list","courses":[...],"summary":"..."}
{"type":"path","path":[...],"estimated_weeks":number,"summary":"..."}

Luật trả lời:
- Nếu retrieval_plan.response_type là course_list: trả type=course_list, liệt kê các khóa phù hợp nhất.
- Nếu response_type là path: trả type=path với 3-6 khóa theo thứ tự học hợp lý.
- Nếu retrieval_plan có source_course_ids, hãy tạo lộ trình từ chính các khóa đó; không thêm khóa ngoài danh sách trừ khi catalog_snapshot có khóa cần thiết rõ ràng.
- Nếu response_type là comparison hoặc answer: trả type=question, đặt nội dung trả lời trong message.
- Nếu catalog_snapshot rỗng hoặc không đủ khóa để tạo path, trả type=question; nói rõ chưa tìm thấy khóa phù hợp và gợi ý user đổi từ khóa/tiêu chí.
- Không bịa khóa học, giá, instructor, language, rating, certificate.
- Nếu user hỏi giá/thời lượng/đánh giá/số học viên/giảng viên của khóa đã nhắc trước đó, dùng các field price, discount_price, duration_hours, rating, total_students, instructor trong catalog_snapshot.
- Mỗi item trong courses/path phải có: course_id, order, reason, is_skippable, skippable_reason.
- order bắt đầu từ 1 và liên tục.
- is_skippable=true chỉ khi khóa là bổ sung tùy chọn; khi true phải có skippable_reason.
- Với path, summary phải ngắn gọn, chỉ mô tả mục tiêu/tổng quan. Không đưa bảng markdown vào summary; lộ trình chi tiết phải nằm trong field path.
- Với từng item trong path, reason phải nêu rõ người học sẽ đạt gì ở bước đó.
- Không bao giờ trả type=path với path rỗng.
- Với course_list, summary ngắn gọn; không tạo bảng roadmap, không dùng cột "Bước", "Ước tính", "Có thể bỏ qua" nếu user chỉ muốn tìm khóa học.
- Giữ ngôn ngữ theo người dùng; nếu user dùng tiếng Việt thì trả tiếng Việt.
""".strip()


class GeminiProviderError(Exception):
    pass


MAX_GEMINI_HISTORY_MESSAGES = 10
MAX_GEMINI_MESSAGE_CHARS = 700
MAX_GEMINI_CATALOG_ITEMS = 40


def _trim_history_messages(messages, max_messages=MAX_GEMINI_HISTORY_MESSAGES):
    normalized = []
    for message in messages or []:
        if not isinstance(message, dict):
            continue
        role = message.get("role")
        content = (message.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        next_message = {
            "role": role,
            "content": content[:MAX_GEMINI_MESSAGE_CHARS],
        }
        artifact = message.get("artifact")
        if isinstance(artifact, dict):
            next_message["artifact"] = artifact
        normalized.append(next_message)
    if len(normalized) <= max_messages:
        return normalized
    return normalized[-max_messages:]


def _compact_catalog_snapshot(catalog_snapshot, limit=MAX_GEMINI_CATALOG_ITEMS):
    compact = []
    for course in (catalog_snapshot or [])[:limit]:
        compact.append({
            "course_id": course.get("course_id"),
            "title": course.get("title") or "",
            "shortdescription": course.get("shortdescription") or "",
            "level": course.get("level") or "",
            "category": course.get("category_name") or "",
            "subcategory": course.get("subcategory_name") or "",
            "tags": course.get("tags") or [],
            "duration_hours": course.get("duration_hours"),
            "price": course.get("course_price"),
            "discount_price": course.get("course_discount_price"),
            "language": course.get("language") or "",
            "rating": course.get("rating"),
            "total_students": course.get("total_students"),
            "instructor": course.get("instructor_name") or "",
            "has_certificate": course.get("has_certificate", False),
            "total_modules": course.get("total_modules"),
            "total_lessons": course.get("total_lessons"),
            "total_quizzes": course.get("total_quizzes"),
            "has_coding_exercises": course.get("has_coding_exercises", False),
        })
    return compact


def extract_json_object(raw_text):
    text = (raw_text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise GeminiProviderError("Gemini did not return JSON content.")
        return json.loads(match.group(0))


class GeminiAdvisorProvider:
    def __init__(self, *, api_key, model="gemini-2.5-flash", timeout=45):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def plan_retrieval(self, *, goal_text, weekly_hours, messages, known_skills):
        payload = self._build_filter_payload(
            goal_text=goal_text,
            weekly_hours=weekly_hours,
            messages=messages,
            known_skills=known_skills,
        )
        text = self._generate_content_text(payload)
        return extract_json_object(text)

    def chat(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot, retrieval_plan):
        payload = self._build_answer_payload(
            goal_text=goal_text,
            weekly_hours=weekly_hours,
            messages=messages,
            known_skills=known_skills,
            catalog_snapshot=catalog_snapshot,
            retrieval_plan=retrieval_plan,
        )
        text = self._generate_content_text(payload)
        return extract_json_object(text)

    def stream_chunks(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot, retrieval_plan):
        payload = self._build_answer_payload(
            goal_text=goal_text,
            weekly_hours=weekly_hours,
            messages=messages,
            known_skills=known_skills,
            catalog_snapshot=catalog_snapshot,
            retrieval_plan=retrieval_plan,
        )
        yield from self._iter_stream_text_parts(payload)

    def _history_contents(self, messages):
        contents = []
        for message in _trim_history_messages(messages):
            role = message.get("role")
            content = (message.get("content") or "").strip()
            if role not in {"user", "assistant"} or not content:
                continue
            artifact = message.get("artifact")
            if isinstance(artifact, dict):
                content = f"{content}\nARTIFACT_JSON:\n{json.dumps(artifact, ensure_ascii=False)}"
            contents.append({
                "role": "model" if role == "assistant" else "user",
                "parts": [{"text": content}],
            })
        return contents

    def _build_filter_payload(self, *, goal_text, weekly_hours, messages, known_skills):
        context_body = {
            "goal_text": goal_text,
            "weekly_hours": weekly_hours,
            "known_skills": known_skills or [],
        }
        contents = [
            {
                "role": "user",
                "parts": [{"text": f"CONTEXT_JSON:\n{json.dumps(context_body, ensure_ascii=False)}"}],
            }
        ]
        contents.extend(self._history_contents(messages))
        if not messages and (goal_text or "").strip():
            contents.append({"role": "user", "parts": [{"text": (goal_text or "").strip()}]})
        contents.append({
            "role": "user",
            "parts": [{"text": "Hãy trả JSON filter plan theo schema đã định nghĩa."}],
        })
        return {
            "contents": contents,
            "system_instruction": GEMINI_FILTER_PROMPT,
            "temperature": 0.1,
            "response_mime_type": "application/json",
        }

    def _build_answer_payload(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot, retrieval_plan):
        compact_catalog = _compact_catalog_snapshot(catalog_snapshot)
        context_body = {
            "goal_text": goal_text,
            "weekly_hours": weekly_hours,
            "known_skills": known_skills or [],
            "retrieval_plan": retrieval_plan or {},
            "retrieved_count": len(catalog_snapshot or []),
            "catalog_snapshot": compact_catalog,
        }
        contents = [
            {
                "role": "user",
                "parts": [{"text": f"CONTEXT_JSON:\n{json.dumps(context_body, ensure_ascii=False)}"}],
            }
        ]
        contents.extend(self._history_contents(messages))
        if not messages and (goal_text or "").strip():
            contents.append({"role": "user", "parts": [{"text": (goal_text or "").strip()}]})
        contents.append({
            "role": "user",
            "parts": [{"text": "Hãy trả JSON cuối cùng cho UI dựa trên catalog_snapshot đã retrieve."}],
        })
        return {
            "contents": contents,
            "system_instruction": GEMINI_ANSWER_PROMPT,
            "temperature": 0.2,
            "response_mime_type": "application/json",
        }

    def _generate_content_text(self, payload):
        if genai is None:
            raise GeminiProviderError("google.genai SDK is not installed.")

        text_parts = [part for part in self._iter_stream_text_parts(payload)]
        if text_parts:
            return "".join(text_parts).strip()

        raise GeminiProviderError("Gemini returned empty text response.")

    def _is_retryable_stream_error(self, exc):
        status_code = getattr(exc, "status_code", None)
        if status_code in {429, 500, 503, 504}:
            return True

        code = getattr(exc, "code", None)
        if isinstance(code, int) and code in {429, 500, 503, 504}:
            return True

        message = f"{exc.__class__.__name__}: {exc}".lower()
        retryable_signals = (
            "503",
            "429",
            "unavailable",
            "resource_exhausted",
            "deadline_exceeded",
            "timeout",
            "timed out",
            "internal",
            "connection reset",
            "connection aborted",
            "temporarily unavailable",
        )
        return any(signal in message for signal in retryable_signals)

    def _is_overload_stream_error(self, exc):
        message = f"{exc.__class__.__name__}: {exc}".lower()
        overload_signals = (
            "503",
            "unavailable",
            "resource_exhausted",
            "high demand",
            "temporarily unavailable",
        )
        return any(signal in message for signal in overload_signals)

    def _iter_stream_text_parts(self, payload):
        if genai is None:
            raise GeminiProviderError("google.genai SDK is not installed.")

        max_attempts = 3
        consecutive_overload_errors = 0
        for attempt in range(1, max_attempts + 1):
            has_emitted_text = False
            try:
                client = genai.Client(api_key=self.api_key)
                stream = client.models.generate_content_stream(
                    model=self.model,
                    contents=payload["contents"],
                    config={
                        "system_instruction": payload["system_instruction"],
                        "temperature": payload["temperature"],
                        "response_mime_type": payload["response_mime_type"],
                    },
                )

                for chunk in stream:
                    chunk_text = (getattr(chunk, "text", "") or "").strip()
                    if chunk_text:
                        has_emitted_text = True
                        yield chunk_text
                        continue

                    candidates = getattr(chunk, "candidates", None) or []
                    for candidate in candidates:
                        content = getattr(candidate, "content", None)
                        parts = getattr(content, "parts", None) or []
                        for part in parts:
                            part_text = (getattr(part, "text", "") or "").strip()
                            if part_text:
                                has_emitted_text = True
                                yield part_text
                return
            except Exception as exc:
                if has_emitted_text:
                    raise GeminiProviderError(f"Gemini stream interrupted after partial output: {exc}") from exc

                if attempt >= max_attempts or not self._is_retryable_stream_error(exc):
                    raise GeminiProviderError(f"Gemini stream failed: {exc}") from exc

                if self._is_overload_stream_error(exc):
                    consecutive_overload_errors += 1
                else:
                    consecutive_overload_errors = 0

                if consecutive_overload_errors >= 2:
                    raise GeminiProviderError(f"Gemini stream failed fast after consecutive overload errors: {exc}") from exc

                backoff_seconds = 0.5 * (2 ** (attempt - 1))
                time.sleep(backoff_seconds)
