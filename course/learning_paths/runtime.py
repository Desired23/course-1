from dataclasses import dataclass
import threading
import time

from django.conf import settings


@dataclass(frozen=True)
class AdvisorRuntimeConfig:
    gemini_api_key: str
    gemini_model: str
    gemini_timeout_seconds: int
    gemini_circuit_threshold: int
    gemini_circuit_cooldown_seconds: int


def get_advisor_runtime_config():
    gemini_api_key = (getattr(settings, 'GEMINI_API_KEY', '') or '').strip()
    gemini_model = (getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash') or 'gemini-2.5-flash').strip()

    return AdvisorRuntimeConfig(
        gemini_api_key=gemini_api_key,
        gemini_model=gemini_model,
        gemini_timeout_seconds=max(1, int(getattr(settings, 'GEMINI_TIMEOUT_SECONDS', 45) or 45)),
        gemini_circuit_threshold=max(1, int(getattr(settings, 'LEARNING_PATH_GEMINI_CIRCUIT_THRESHOLD', 2) or 2)),
        gemini_circuit_cooldown_seconds=max(
            5,
            int(getattr(settings, 'LEARNING_PATH_GEMINI_CIRCUIT_COOLDOWN_SECONDS', 60) or 60),
        ),
    )


class GeminiCircuitBreaker:
    def __init__(self):
        self._lock = threading.Lock()
        self._open_until = 0.0
        self._overload_failures = 0

    def is_open(self):
        now = time.monotonic()
        with self._lock:
            return self._open_until > now

    def record_success(self):
        with self._lock:
            self._overload_failures = 0
            self._open_until = 0.0

    def record_overload_failure(self, *, threshold, cooldown_seconds):
        with self._lock:
            self._overload_failures += 1
            if self._overload_failures >= threshold:
                self._open_until = time.monotonic() + cooldown_seconds
                self._overload_failures = 0

    def reset(self):
        with self._lock:
            self._open_until = 0.0
            self._overload_failures = 0
