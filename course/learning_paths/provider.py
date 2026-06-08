import json
import re
import time

try:
    from google import genai
except Exception:
    genai = None


GEMINI_SYSTEM_PROMPT = """
You are an AI course-path advisor for an online course platform.
You must use only real course_id values from the provided catalog.

Rules:
- Return JSON only. No markdown, no code fences, no commentary.
- Output one of:
  {"type":"question","message":"..."}
  {"type":"path","path":[...],"estimated_weeks":number,"summary":"..."}
- Ask clarifying questions when key information is missing, up to 4 questions total. Prioritize understanding: the specific goal/topic, the user's current level, weekly time available, and any focus area or constraint (budget, language, certificate).
- Ask only one question at a time, and never re-ask something the user already answered.
- As soon as you have enough information to build a focused path, stop asking and return the path.
- After 4 user answers, make safe assumptions and explain them in summary instead of asking another question.
- Recommend only courses that exist in the catalog.
- Recommend only courses directly relevant to the user's stated goal. Do NOT include every course in the catalog.
- Keep the path focused: typically 3-6 courses. Exclude courses on unrelated topics (for a "learn Python basics" goal, do not add UX, design, DevOps, or unrelated language courses unless the user explicitly asked for them).
- Only mark a course is_skippable when it is a genuinely optional enhancement to the core goal. Do not pad the path with skippable, tangential courses.
- A shorter, on-target path is better than a long, padded one.
- Be honest: never invent or force a course that does not match the request. If the catalog has no course matching what the user asked (a specific topic, instructor, level, or language), say so plainly, then suggest the closest available alternatives and explain why they are close.
- If only some of the requested topics are covered, build the path from what exists and clearly state in summary which requested topics are not available.
- Each path item must include:
  course_id, order, reason, is_skippable, skippable_reason
- order must start at 1 and be continuous.
- If is_skippable is true, skippable_reason must be non-empty.
- Prefer prerequisite-safe ordering and explain why each course is included.
- If the user already knows a skill, avoid recommending an obvious beginner course that only covers that skill unless it still has strong value.
- estimated_weeks must be a realistic positive integer.
- If the user asks something outside learning/course scope, do not answer that topic directly.
- In that case, return type=question and redirect politely to supported scope (course recommendations and learning paths).
- Answering questions about a course's price, instructor, language, rating, or certificate is within scope when the user is choosing courses for their path.
- If the user asks to compare courses (price, rating, instructor, language, certificate, etc.), answer using type=question with a concise formatted comparison in `message`. Always tie the comparison back to the user's learning goal at the end.

Catalog fields reference:
- price: original price in VND (0 = free course)
- discount_price: sale price in VND (null = no active discount); use this as effective price when non-null
- language: language the course is taught in
- rating: average rating from 0.00 to 5.00
- total_students: number of enrolled students; a higher count means a more popular / "hot" / standout course
- instructor: instructor's full name
- has_certificate: whether the course awards a certificate on completion
- tags, category, subcategory: topic labels; use them (together with title) to match the user's goal, including abbreviations and synonyms (e.g. "js" -> JavaScript, "ML" -> Machine Learning, "data analytics" -> data analysis)
- When the user asks for popular / hot / standout courses, rank primarily by total_students, then by rating.

Budget handling:
- If the user states a budget (e.g. "tôi có 500.000đ"), use discount_price (if non-null) or price as the effective price.
- Prefer recommending courses whose effective price is within the stated budget.
- If a critical prerequisite course exceeds budget, still include it but note the cost and mark is_skippable=false with a clear reason.
- If no courses fit within budget, say so in summary and suggest the most affordable relevant options.
- Free courses (price=0) should always be considered budget-friendly.

Formatting requirements for `type=path` (apply only when user explicitly asks for roadmap/learning path output):
- Keep response language aligned with user language (Vietnamese if user writes Vietnamese).
- `summary` must be structured and concise, and include a markdown roadmap table.
- The table must contain at least these columns:
    | Bước | course_id | Khóa học | Mục tiêu chính | Ước tính (tuần) | Có thể bỏ qua |
- Each table row must map exactly to one item in `path` (same order and course_id).
- Do not output markdown outside JSON fields; put all human-readable formatting only inside `summary` string.
""".strip()


class GeminiProviderError(Exception):
    pass


MAX_GEMINI_HISTORY_MESSAGES = 8
MAX_GEMINI_MESSAGE_CHARS = 500
MAX_GEMINI_CATALOG_ITEMS = 60


def _trim_history_messages(messages, max_messages=MAX_GEMINI_HISTORY_MESSAGES):
    normalized = []
    for message in (messages or []):
        if not isinstance(message, dict):
            continue
        role = message.get("role")
        content = (message.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        normalized.append({
            "role": role,
            "content": content[:MAX_GEMINI_MESSAGE_CHARS],
        })
    if len(normalized) <= max_messages:
        return normalized
    return normalized[-max_messages:]


def _course_popularity_key(course):
    try:
        rating = float(course.get("rating") or 0)
    except (TypeError, ValueError):
        rating = 0.0
    return (course.get("total_students") or 0, rating)


def _compact_catalog_snapshot(catalog_snapshot, limit=MAX_GEMINI_CATALOG_ITEMS):
    # No keyword relevance filter: Gemini selects relevant courses itself.
    # The only server-side narrowing is a safety cap that, when the catalog
    # exceeds `limit`, keeps the most popular courses (by enrollment, then rating).
    selected = sorted(catalog_snapshot or [], key=_course_popularity_key, reverse=True)[:limit]

    compact = []
    for course in selected:
        compact.append(
            {
                "course_id": course.get("course_id"),
                "title": course.get("title") or "",
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
            }
        )

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

    def chat(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot):
        payload = self._build_payload(
            goal_text=goal_text,
            weekly_hours=weekly_hours,
            messages=messages,
            known_skills=known_skills,
            catalog_snapshot=catalog_snapshot,
        )
        text = self._generate_content_text(payload)
        return extract_json_object(text)

    def _build_payload(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot):
        trimmed_messages = _trim_history_messages(messages)
        compact_catalog = _compact_catalog_snapshot(catalog_snapshot)
        user_messages = [message for message in trimmed_messages if message.get("role") == "user"]
        context_body = {
            "goal_text": goal_text,
            "weekly_hours": weekly_hours,
            "known_skills": known_skills or [],
            "user_message_count": len(user_messages),
            "catalog_total_count": len(catalog_snapshot or []),
            "catalog_snapshot": compact_catalog,
        }

        history_contents = []
        for message in trimmed_messages:
            if not isinstance(message, dict):
                continue
            role = message.get("role")
            content = (message.get("content") or "").strip()
            if role not in {"user", "assistant"} or not content:
                continue
            history_contents.append(
                {
                    "role": "model" if role == "assistant" else "user",
                    "parts": [{"text": content}],
                }
            )

        contents = [
            {
                "role": "user",
                "parts": [{"text": f"CONTEXT_JSON:\n{json.dumps(context_body, ensure_ascii=False)}"}],
            }
        ]
        contents.extend(history_contents)
        if not history_contents and (goal_text or "").strip():
            contents.append({"role": "user", "parts": [{"text": f"Muc tieu hien tai: {(goal_text or '').strip()}"}]})
        contents.append(
            {
                "role": "user",
                "parts": [{"text": "Dua tren context va lich su chat tren, hay tra ve JSON hop le theo schema da yeu cau."}],
            }
        )

        return {
            "contents": contents,
            "system_instruction": GEMINI_SYSTEM_PROMPT,
            "temperature": 0.2,
            "response_mime_type": "application/json",
        }

    def stream_chunks(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot):
        payload = self._build_payload(
            goal_text=goal_text,
            weekly_hours=weekly_hours,
            messages=messages,
            known_skills=known_skills,
            catalog_snapshot=catalog_snapshot,
        )
        yield from self._iter_stream_text_parts(payload)

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
