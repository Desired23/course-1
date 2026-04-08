import json
import math
import re
import time
from abc import ABC, abstractmethod

try:
    from google import genai
except Exception:  # pragma: no cover - handled at runtime with fallback metadata
    genai = None


LEVEL_RANK = {
    "beginner": 0,
    "all_levels": 0,
    "intermediate": 1,
    "advanced": 2,
}

SKILL_PATTERNS = {
    "sql": [r"\bsql\b", r"\bpostgres\b", r"\bmysql\b", r"\bquery\b"],
    "python": [r"\bpython\b", r"\bpandas\b", r"\bnumpy\b"],
    "excel": [r"\bexcel\b", r"\bspreadsheet\b"],
    "power query": [r"power\s*query"],
    "dashboard": [r"\bdashboard\b", r"\bvisuali[sz]ation\b", r"\bstorytelling\b"],
}

NEGATIVE_SKILL_PATTERNS = {
    "sql": [
        r"chua biet sql",
        r"chưa biết sql",
        r"khong biet sql",
        r"không biết sql",
        r"don't know sql",
        r"new to sql",
    ],
    "python": [
        r"chua biet python",
        r"chưa biết python",
        r"khong biet python",
        r"không biết python",
        r"don't know python",
        r"new to python",
    ],
}

MINIMAL_MODE_PATTERNS = [
    "toi thieu",
    "tối thiểu",
    "rut gon",
    "rút gọn",
    "nhanh nhat",
    "nhanh nhất",
    "minimal",
    "shortest",
]

COURSE_SEARCH_PATTERNS = [
    r"tim\s*(khoa|khóa)\s*hoc",
    r"goi\s*y.*(khoa|khóa)\s*hoc",
    r"de\s*xuat.*(khoa|khóa)\s*hoc",
    r"khoa\s*hoc\s*phu\s*hop",
    r"recommend\s*course",
    r"find\s*course",
    r"search\s*course",
]

ROADMAP_PATTERNS = [
    r"lo\s*trinh",
    r"roadmap",
    r"learning\s*path",
    r"path\s*hoc",
]

GOAL_HINT_PATTERNS = [
    r"muon",
    r"muc\s*tieu",
    r"chuyen\s*nganh",
    r"chuyen\s*sang",
    r"tro\s*thanh",
    r"become",
    r"career",
    r"data\s*analyst",
    r"backend",
    r"frontend",
]

GREETING_ONLY_PATTERNS = [
    r"^\s*(xin\s*chao|xin\s*chào|chao|chào|hello|hi|hey|alo)\s*[!.?]*\s*$",
    r"^\s*(xin\s*chao|xin\s*chào|chao|chào|hello|hi|hey|alo)\s+(ban|bạn|anh|chị|chi|em|ad|minh|mình)\s*[!.?]*\s*$",
]

SMALL_TALK_PATTERNS = [
    r"^\s*(sao\s*c[oơ]|sao\s*co|sao\s*vay|sao\s*vậy|la\s*sao|là\s*sao|gi\s*the|gì\s*thế)\s*[!.?]*\s*$",
    r"^\s*(loi\s*gi\s*a|lỗi\s*gì\s*ạ|loi\s*gi|lỗi\s*gì)\s*[!.?]*\s*$",
    r"^\s*(cam\s*on|cảm\s*ơn|thanks|thank\s*you)\s*[!.?]*\s*$",
]

GEMINI_SYSTEM_PROMPT = """
You are an AI course-path advisor for an online course platform.
You must use only real course_id values from the provided catalog.

Rules:
- Return JSON only. No markdown, no code fences, no commentary.
- Output one of:
  {"type":"question","message":"..."}
  {"type":"path","path":[...],"estimated_weeks":number,"summary":"..."}
- Ask at most 2 clarifying questions total. If enough information is available, return a path.
- After 2 user answers, make safe assumptions and explain them in summary instead of asking another question.
- Recommend only courses that exist in the catalog.
- Each path item must include:
  course_id, order, reason, is_skippable, skippable_reason
- order must start at 1 and be continuous.
- If is_skippable is true, skippable_reason must be non-empty.
- Prefer prerequisite-safe ordering and explain why each course is included.
- If the user already knows a skill, avoid recommending an obvious beginner course that only covers that skill unless it still has strong value.
- estimated_weeks must be a realistic positive integer.
- If the user asks something outside learning/course scope, do not answer that topic directly.
- In that case, return type=question and redirect politely to supported scope (course recommendations and learning paths).

Formatting requirements for `type=path`:
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


def tokenize_text(value):
    return {token for token in re.findall(r"[a-zA-Z0-9+#]+", (value or "").lower()) if len(token) > 1}


def build_combined_text(goal_text, messages):
    seen = set()
    merged_parts = []

    def add_part(raw_text):
        text = (raw_text or "").strip()
        if not text:
            return
        normalized = re.sub(r"\s+", " ", text).lower()
        if normalized in seen:
            return
        seen.add(normalized)
        merged_parts.append(text)

    add_part(goal_text)
    for message in (messages or []):
        if isinstance(message, dict):
            add_part(message.get("content", ""))

    return " ".join(merged_parts).lower()


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


def _compact_catalog_snapshot(catalog_snapshot, goal_text, messages, limit=MAX_GEMINI_CATALOG_ITEMS):
    query_tokens = tokenize_text(build_combined_text(goal_text, messages))

    ranked = []
    for course in (catalog_snapshot or []):
        searchable = " ".join(
            [
                course.get("title") or "",
                course.get("description") or "",
                " ".join(course.get("skills_taught") or []),
                " ".join(course.get("prerequisites") or []),
                " ".join(course.get("tags") or []),
                course.get("category_name") or "",
                course.get("subcategory_name") or "",
            ]
        )
        course_tokens = tokenize_text(searchable)
        overlap_score = len(query_tokens.intersection(course_tokens)) if query_tokens else 0
        ranked.append((overlap_score, course))

    ranked.sort(key=lambda item: (-item[0], (item[1].get("title") or "").lower()))
    selected = [course for _, course in ranked[:limit]]

    compact = []
    for course in selected:
        compact.append(
            {
                "course_id": course.get("course_id"),
                "title": course.get("title") or "",
                "level": course.get("level") or "",
                "duration_hours": course.get("duration_hours"),
                "skills_taught": (course.get("skills_taught") or [])[:8],
                "prerequisites": (course.get("prerequisites") or [])[:5],
            }
        )

    return compact


def normalize_known_skills(goal_text, messages, known_skills):
    explicit_skills = {skill.strip().lower() for skill in (known_skills or []) if skill and skill.strip()}
    detected = set(explicit_skills)
    combined_text = build_combined_text(goal_text, messages)

    for skill, patterns in SKILL_PATTERNS.items():
        if any(re.search(pattern, combined_text) for pattern in patterns):
            detected.add(skill)

    for skill, patterns in NEGATIVE_SKILL_PATTERNS.items():
        if skill in explicit_skills:
            continue
        if any(re.search(pattern, combined_text) for pattern in patterns):
            detected.discard(skill)

    return detected


def infer_weekly_hours(goal_text, messages, weekly_hours):
    if weekly_hours:
        return weekly_hours, False

    combined_text = build_combined_text(goal_text, messages)
    match = re.search(r"(\d{1,2})\s*(gio|giờ|hours|hour|hrs|h)\b", combined_text)
    if match:
        return max(1, min(80, int(match.group(1)))), False

    return 6, True


def detect_minimal_mode(goal_text, messages):
    combined_text = build_combined_text(goal_text, messages)
    return any(keyword in combined_text for keyword in MINIMAL_MODE_PATTERNS)


def detect_course_search_mode(goal_text, messages):
    combined_text = build_combined_text(goal_text, messages)
    latest_user_message = ""
    for message in reversed(messages or []):
        if isinstance(message, dict) and message.get("role") == "user":
            latest_user_message = (message.get("content") or "").lower()
            break

    explicit_search_only = re.search(r"(chi|chỉ)\s+(tim|tìm|goi\s*y|gợi\s*ý)\s*(khoa|khóa)\s*hoc", combined_text)
    explicit_roadmap_only = re.search(r"(chi|chỉ)\s+(muon|muốn|can|cần)?\s*(lo\s*trinh|roadmap|learning\s*path)", combined_text)

    search_hit = any(re.search(pattern, combined_text) for pattern in COURSE_SEARCH_PATTERNS)
    roadmap_hit = any(re.search(pattern, combined_text) for pattern in ROADMAP_PATTERNS)
    latest_search_hit = any(re.search(pattern, latest_user_message) for pattern in COURSE_SEARCH_PATTERNS)
    latest_roadmap_hit = any(re.search(pattern, latest_user_message) for pattern in ROADMAP_PATTERNS)

    if explicit_search_only:
        return True
    if explicit_roadmap_only:
        return False
    if latest_search_hit and not latest_roadmap_hit:
        return True
    if latest_search_hit and latest_roadmap_hit:
        # Mixed request: recommend concrete courses first, then let user ask to build path.
        return True
    return bool(search_hit and not roadmap_hit)


def count_assistant_questions(messages):
    return sum(
        1
        for message in (messages or [])
        if isinstance(message, dict)
        and message.get("role") == "assistant"
        and "?" in (message.get("content") or "")
    )


def infer_missing_slots(goal_text, known_skill_set, used_default_hours):
    missing = []
    normalized_goal = (goal_text or "").strip().lower()
    has_goal_hint = len(tokenize_text(normalized_goal)) >= 4 and any(
        re.search(pattern, normalized_goal) for pattern in GOAL_HINT_PATTERNS
    )

    if not has_goal_hint:
        missing.append("goal")
    if not known_skill_set:
        missing.append("baseline")
    if used_default_hours:
        missing.append("weekly_hours")
    return missing


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


class AdvisorProvider(ABC):
    @abstractmethod
    def chat(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot):
        raise NotImplementedError


class RuleBasedAdvisorProvider(AdvisorProvider):
    def chat(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot):
        messages = messages or []
        user_messages = [message for message in messages if message.get("role") == "user"]
        if not user_messages and (goal_text or "").strip():
            user_messages = [{"role": "user", "content": (goal_text or "").strip()}]
        latest_user_message = user_messages[-1].get("content", "").strip() if user_messages else ""
        effective_goal_text = self._compose_effective_goal_text(goal_text, user_messages)
        known_skill_set = normalize_known_skills(effective_goal_text, messages, known_skills)
        resolved_weekly_hours, used_default_hours = infer_weekly_hours(effective_goal_text, messages, weekly_hours)
        missing_slots = infer_missing_slots(effective_goal_text, known_skill_set, used_default_hours)
        assistant_questions = count_assistant_questions(messages)

        if self._is_greeting_only(latest_user_message):
            return {
                "type": "question",
                "message": (
                    "Chào bạn! Bạn cứ mô tả nhu cầu học tập bằng ngôn ngữ tự nhiên, "
                    "mình sẽ tự động đưa ra câu trả lời phù hợp: tìm khóa học, thiết kế lộ trình, "
                    "hoặc kết hợp cả hai khi cần."
                ),
                "advisor_meta": {
                    "conversation_state": {
                        "mode": "clarify",
                        "missing_slots": missing_slots,
                    },
                    "suggested_actions": [
                        "Toi muon 3 khoa hoc Data Analyst co project thuc hanh.",
                        "Toi la nguoi moi, hay de xuat lo trinh hoc Backend Python trong 3 thang.",
                    ],
                },
            }

        if self._is_small_talk(latest_user_message):
            return {
                "type": "question",
                "message": (
                    "Mình vẫn đang theo ngữ cảnh học tập hiện tại. "
                    "Bạn muốn mình tìm khóa học phù hợp, hay điều chỉnh lộ trình đang có?"
                ),
                "advisor_meta": {
                    "conversation_state": {
                        "mode": "clarify",
                        "missing_slots": missing_slots,
                    },
                    "suggested_actions": [
                        "Gợi ý 3 khóa học phù hợp mục tiêu hiện tại.",
                        "Điều chỉnh lộ trình theo kỹ năng mình đã có.",
                    ],
                },
            }

        if detect_course_search_mode(effective_goal_text, messages):
            ranked_courses = self._rank_courses(effective_goal_text, known_skill_set, catalog_snapshot)
            suggested_courses = self._select_course_suggestions(ranked_courses, known_skill_set)
            return {
                "type": "question",
                "message": self._format_course_suggestions_message(suggested_courses),
                "advisor_meta": {
                    "conversation_state": {
                        "mode": "course_search",
                        "missing_slots": missing_slots,
                    },
                    "suggested_actions": [
                        "Goi y them khoa hoc nang cao lien quan.",
                        "Tao lo trinh toi thieu tu cac khoa hoc tren.",
                    ],
                },
            }

        if len(user_messages) == 0 and missing_slots:
            return {
                "type": "question",
                "message": self._build_follow_up_question(missing_slots),
                "advisor_meta": {
                    "conversation_state": {
                        "mode": "clarify",
                        "missing_slots": missing_slots,
                    },
                    "suggested_actions": self._build_suggested_actions(missing_slots),
                },
            }

        if missing_slots and assistant_questions < 2:
            return {
                "type": "question",
                "message": self._build_follow_up_question(missing_slots),
                "advisor_meta": {
                    "conversation_state": {
                        "mode": "clarify",
                        "missing_slots": missing_slots,
                    },
                    "suggested_actions": self._build_suggested_actions(missing_slots),
                },
            }

        minimal_mode = detect_minimal_mode(effective_goal_text, messages)
        ranked_courses = self._rank_courses(effective_goal_text, known_skill_set, catalog_snapshot)
        selected_courses = self._select_courses(ranked_courses, known_skill_set, minimal_mode)
        path = self._build_path(selected_courses, known_skill_set, resolved_weekly_hours)

        assumptions = []
        if used_default_hours:
            assumptions.append("Ước tính thời gian đang dùng giả định 6 giờ/tuần.")
        if not known_skill_set:
            assumptions.append("Không phát hiện rõ kỹ năng hiện có nên lộ trình ưu tiên nền tảng trước.")
        if minimal_mode:
            assumptions.append("Lộ trình đã được rút gọn theo yêu cầu tối thiểu.")

        summary = " ".join(
            filter(
                None,
                [
                    "Lộ trình được map từ catalog khóa học thật, ưu tiên prerequisite hợp lệ và khóa liên quan nhất đến mục tiêu hiện tại.",
                    " ".join(assumptions).strip(),
                ],
            )
        ).strip()

        return {
            "type": "path",
            "path": path,
            "estimated_weeks": sum(item["_estimated_weeks"] for item in path),
            "summary": summary,
            "advisor_meta": {
                "conversation_state": {
                    "mode": "path",
                    "missing_slots": missing_slots,
                },
                "suggested_actions": [
                    "Cho toi ban toi thieu nhanh hon.",
                    "Goi y cho toi them khoa hoc lien quan de dao sau.",
                ],
            },
        }

    def _compose_effective_goal_text(self, goal_text, user_messages):
        latest_user_message = user_messages[-1].get("content", "").strip() if user_messages else ""
        if latest_user_message and latest_user_message.lower() != (goal_text or "").strip().lower():
            return f"{goal_text or ''} {latest_user_message}".strip()
        return goal_text or latest_user_message

    def _select_course_suggestions(self, ranked_courses, known_skill_set, limit=4):
        suggestions = []
        for course in ranked_courses:
            if self._covered_by_known_skills(course, known_skill_set) and course.get("level") in {"beginner", "all_levels"}:
                continue
            suggestions.append(course)
            if len(suggestions) >= limit:
                break
        return suggestions or ranked_courses[:limit]

    def _format_course_suggestions_message(self, courses):
        if not courses:
            return "Mình chưa tìm được khóa học phù hợp trong catalog hiện tại. Bạn có thể mô tả cụ thể hơn mục tiêu để mình lọc lại nhanh hơn."

        lines = ["Mình gợi ý một vài khóa học phù hợp để bạn tham khảo nhanh:"]
        for idx, course in enumerate(courses, start=1):
            level = course.get("level") or "all_levels"
            duration = course.get("duration_hours")
            skills = ", ".join((course.get("skills_taught") or [])[:2])
            details = [f"level: {level}"]
            if duration:
                details.append(f"{duration}h")
            if skills:
                details.append(f"skills: {skills}")
            lines.append(f"{idx}. {course.get('title')} (id {course.get('course_id')}) - {' | '.join(details)}")

        lines.append("Nếu bạn muốn, mình có thể tạo luôn lộ trình học từ những khóa học này.")
        return "\n".join(lines)

    def _build_follow_up_question(self, missing_slots):
        slot_set = set(missing_slots)
        if {"goal", "baseline", "weekly_hours"}.issubset(slot_set):
            return "Mình sẽ đi từng bước cho dễ. Trước tiên, bạn đang hướng tới vị trí/mục tiêu công việc nào?"
        if "goal" in slot_set and "baseline" in slot_set:
            return "Bạn muốn đạt mục tiêu cụ thể nào, và hiện tại bạn đã biết những kỹ năng gì liên quan?"
        if "goal" in slot_set:
            return "Bạn có thể nói rõ hơn mục tiêu học tập/vị trí công việc bạn đang hướng đến không?"
        if "baseline" in slot_set and "weekly_hours" in slot_set:
            return "Hiện tại bạn đã biết những kỹ năng gì, và mỗi tuần bạn có thể học được bao nhiêu giờ?"
        if "baseline" in slot_set:
            return "Bạn đã có nền tảng nào rồi (ví dụ: Excel, SQL, Python) để mình bỏ qua phần trùng lặp?"
        if "weekly_hours" in slot_set:
            return "Mỗi tuần bạn học được khoảng bao nhiêu giờ để mình ước tính timeline chính xác hơn?"
        return "Bạn có thể chia sẻ thêm một ít context để mình tối ưu gợi ý khóa học cho bạn không?"

    def _build_suggested_actions(self, missing_slots):
        actions = []
        if "goal" in missing_slots:
            actions.append("Mục tiêu của tôi là trở thành Data Analyst trong 3 tháng.")
        if "baseline" in missing_slots:
            actions.append("Tôi đã biết Excel, chưa biết SQL và Python.")
        if "weekly_hours" in missing_slots:
            actions.append("Tôi học được 8 giờ mỗi tuần.")
        if not actions:
            actions.append("Gợi ý cho tôi các khóa học phù hợp với mục tiêu này.")
        return actions[:2]

    def _is_greeting_only(self, latest_user_message):
        normalized = (latest_user_message or "").strip().lower()
        if not normalized:
            return False
        return any(re.match(pattern, normalized) for pattern in GREETING_ONLY_PATTERNS)

    def _is_small_talk(self, latest_user_message):
        normalized = (latest_user_message or "").strip().lower()
        if not normalized:
            return False
        return any(re.match(pattern, normalized) for pattern in SMALL_TALK_PATTERNS)

    def _rank_courses(self, goal_text, known_skill_set, catalog_snapshot):
        goal_tokens = tokenize_text(goal_text)
        ranked = []
        for course in catalog_snapshot:
            haystack = " ".join(
                [
                    course.get("title", ""),
                    course.get("description", ""),
                    " ".join(course.get("skills_taught", []) or []),
                    " ".join(course.get("prerequisites", []) or []),
                    " ".join(course.get("target_audience", []) or []),
                    " ".join(course.get("tags", []) or []),
                    course.get("category_name", "") or "",
                    course.get("subcategory_name", "") or "",
                ]
            ).lower()
            haystack_tokens = tokenize_text(haystack)

            overlap = len(goal_tokens.intersection(haystack_tokens))
            skill_overlap = sum(1 for skill in known_skill_set if skill in haystack)
            level_rank = LEVEL_RANK.get(course.get("level") or "all_levels", 1)
            score = overlap * 3 + skill_overlap * 2 - level_rank

            if any(keyword in haystack for keyword in ["data", "analyst", "analysis", "sql", "python", "excel", "dashboard"]):
                score += 2

            ranked.append(
                {
                    **course,
                    "_score": score,
                    "_level_rank": level_rank,
                }
            )

        ranked.sort(key=lambda item: (item["_level_rank"], -item["_score"], item.get("title", "")))
        return ranked

    def _select_courses(self, ranked_courses, known_skill_set, minimal_mode):
        if not ranked_courses:
            return []

        limit = 3 if minimal_mode else 4
        selected = []
        used_ids = set()

        beginner_candidates = [
            course
            for course in ranked_courses
            if course.get("level") in {"beginner", "all_levels"} and not self._covered_by_known_skills(course, known_skill_set)
        ]
        if beginner_candidates and ("sql" not in known_skill_set and "python" not in known_skill_set):
            starter = beginner_candidates[0]
            selected.append(starter)
            used_ids.add(starter["course_id"])

        for course in ranked_courses:
            if course["course_id"] in used_ids:
                continue
            if self._covered_by_known_skills(course, known_skill_set):
                continue
            selected.append(course)
            used_ids.add(course["course_id"])
            if len(selected) >= limit:
                break

        return selected[:limit]

    def _covered_by_known_skills(self, course, known_skill_set):
        if not known_skill_set:
            return False

        title = (course.get("title") or "").lower()
        taught = [skill.lower() for skill in (course.get("skills_taught") or [])]
        overlaps = {skill for skill in known_skill_set if skill in title or any(skill in item for item in taught)}
        if not overlaps:
            return False

        return course.get("level") in {"beginner", "all_levels"} or len(overlaps) >= max(1, len(taught))

    def _build_path(self, selected_courses, known_skill_set, weekly_hours):
        path = []
        for index, course in enumerate(selected_courses, start=1):
            title = (course.get("title") or "").lower()
            taught = [skill.lower() for skill in (course.get("skills_taught") or [])]
            overlaps = sorted(skill for skill in known_skill_set if skill in title or any(skill in item for item in taught))
            is_skippable = bool(overlaps)
            duration_hours = course.get("duration_hours") or 6
            effective_hours = max(2, duration_hours * (0.35 if is_skippable else 1))
            estimated_weeks = max(1, math.ceil(effective_hours / max(1, weekly_hours)))

            reason_parts = []
            if course.get("prerequisites"):
                reason_parts.append(f"Khóa này nối tốt với prerequisite {', '.join(course['prerequisites'][:2])}.")
            if course.get("skills_taught"):
                reason_parts.append(f"Kỹ năng đầu ra chính là {', '.join(course['skills_taught'][:2])}.")
            if not reason_parts:
                reason_parts.append("Khóa này phù hợp với mục tiêu và đúng thứ tự trong lộ trình hiện tại.")

            item = {
                "course_id": course["course_id"],
                "order": index,
                "reason": " ".join(reason_parts).strip(),
                "is_skippable": is_skippable,
                "skippable_reason": None,
                "course_title": course.get("title"),
                "course_level": course.get("level"),
                "course_price": course.get("course_price"),
                "course_discount_price": course.get("course_discount_price"),
                "course_discount_start_date": course.get("course_discount_start_date"),
                "course_discount_end_date": course.get("course_discount_end_date"),
                "duration_hours": course.get("duration_hours"),
                "skills_taught": course.get("skills_taught") or [],
                "_estimated_weeks": estimated_weeks,
            }
            if is_skippable:
                item["skippable_reason"] = (
                    f"Bạn đã có nền tảng {', '.join(overlaps)} nên có thể skim hoặc bỏ qua phần trùng lặp."
                )

            path.append(item)

        return path


class GeminiAdvisorProvider(AdvisorProvider):
    def __init__(self, *, api_key, model="gemini-2.5-flash", timeout=45, fallback_provider=None):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.fallback_provider = fallback_provider

    def chat(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot):
        if not self.api_key:
            return self._fallback(
                goal_text,
                weekly_hours,
                messages,
                known_skills,
                catalog_snapshot,
                reason='gemini_api_key_missing',
            )

        payload = self._build_payload(
            goal_text=goal_text,
            weekly_hours=weekly_hours,
            messages=messages,
            known_skills=known_skills,
            catalog_snapshot=catalog_snapshot,
        )

        try:
            text = self._generate_content_text(payload)
            return extract_json_object(text)
        except Exception as exc:
            return self._fallback(
                goal_text,
                weekly_hours,
                messages,
                known_skills,
                catalog_snapshot,
                reason=f'gemini_request_failed: {exc.__class__.__name__}',
            )

    def _build_payload(self, *, goal_text, weekly_hours, messages, known_skills, catalog_snapshot):
        trimmed_messages = _trim_history_messages(messages)
        compact_catalog = _compact_catalog_snapshot(catalog_snapshot, goal_text, trimmed_messages)
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
        if not self.api_key:
            raise GeminiProviderError("Gemini API key is missing.")

        payload = self._build_payload(
            goal_text=goal_text,
            weekly_hours=weekly_hours,
            messages=messages,
            known_skills=known_skills,
            catalog_snapshot=catalog_snapshot,
        )

        for part in self._iter_stream_text_parts(payload):
            yield part

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
                # Do not retry mid-stream; retrying after partial output would duplicate chunks.
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

    def _fallback(self, goal_text, weekly_hours, messages, known_skills, catalog_snapshot, reason):
        if not self.fallback_provider:
            raise GeminiProviderError("Gemini provider failed and no fallback provider is configured.")
        fallback_response = self.fallback_provider.chat(
            goal_text=goal_text,
            weekly_hours=weekly_hours,
            messages=messages,
            known_skills=known_skills,
            catalog_snapshot=catalog_snapshot,
        )
        fallback_meta = fallback_response.get("advisor_meta") or {}
        fallback_response["advisor_meta"] = {
            **fallback_meta,
            "provider_used": "rule_based",
            "fallback_triggered": True,
            "fallback_reason": reason,
            "fallback_provider": "rule_based",
        }
        return fallback_response
