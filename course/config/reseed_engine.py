"""Reseed engine for full business-data reset plus deterministic demo seeding."""

from __future__ import annotations

import copy
import os
import random
import threading
import traceback
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any

from django.apps import apps
from django.conf import settings
from django.db import transaction
from django.db.models import Count, F
from django.utils import timezone

from config.curated_seed import SeedError, SUPPORTED_CURATED_PROFILES, run_curated_seed
from certificates.models import Certificate
from enrollments.models import Enrollment
from learning_progress.models import LearningProgress
from lessons.models import Lesson
from payments.models import Payment
from quiz_results.models import QuizResult
from systems_settings.models import SystemsSetting


DEFAULT_PROFILE = "demo-medium"
SUPPORTED_PROFILES = set(SUPPORTED_CURATED_PROFILES)
PROFILE_TARGET_RECORDS: dict[str, tuple[int, int]] = {
    "demo-small": (200, 500),
    "demo-medium": (300, 800),
    "demo-large": (900, 2200),
}

HOME_SETTING_KEYS = (
    "homepage_schema_v2",
    "homepage_schema_v2_initial_backup",
    "homepage_layout",
    "homepage_config",
)


def get_default_strict_mode() -> bool:
    raw_value = str(os.getenv("RESEED_STRICT_DEFAULT", "false")).strip().lower()
    return raw_value in {"1", "true", "yes", "y", "on"}

_SYSTEM_APP_LABELS = {
    "admin",
    "auth",
    "contenttypes",
    "sessions",
    "messages",
    "staticfiles",
    "config",
}

_EXTERNAL_APP_PREFIXES = (
    "django.",
    "rest_framework",
    "corsheaders",
    "cloudinary",
    "channels",
    "daphne",
)


_run_lock = threading.Lock()
_run_state_lock = threading.Lock()
_run_in_progress = False
_run_state: dict[str, Any] = {
    "run_id": None,
    "status": "idle",
    "phase": "idle",
    "message": "No reseed run has started yet.",
    "started_at": None,
    "finished_at": None,
    "profile": None,
    "random_seed": None,
    "dry_run": False,
    "strict_mode": False,
    "preserve_home_settings": True,
    "reset_report": None,
    "seed_report": None,
    "validation_report": None,
    "error": None,
}


def get_seed_secret() -> str:
    """Return reseed secret key from environment with safe default."""
    return os.getenv("SEED_SECRET_KEY", "demo-seed-2026")


def get_reseed_status() -> dict[str, Any]:
    """Return a copy of current reseed run status."""
    with _run_state_lock:
        return copy.deepcopy(_run_state)


def start_reseed_run(
    profile: str,
    random_seed: int,
    dry_run: bool = False,
    strict_mode: bool = False,
    preserve_home_settings: bool = True,
) -> tuple[bool, dict[str, Any]]:
    """Start reseed run in background thread when no run is active."""
    normalized_profile = (profile or DEFAULT_PROFILE).strip().lower()
    if normalized_profile not in SUPPORTED_PROFILES:
        raise ValueError(
            f"Unsupported profile '{profile}'. Supported profiles: {sorted(SUPPORTED_PROFILES)}"
        )

    with _run_lock:
        global _run_in_progress
        if _run_in_progress:
            return False, get_reseed_status()

        _run_in_progress = True
        run_id = uuid.uuid4().hex
        _set_run_state(
            run_id=run_id,
            status="running",
            phase="queued",
            message="Reseed job queued.",
            started_at=timezone.now().isoformat(),
            finished_at=None,
            profile=normalized_profile,
            random_seed=int(random_seed),
            dry_run=bool(dry_run),
            strict_mode=bool(strict_mode),
            preserve_home_settings=bool(preserve_home_settings),
            reset_report=None,
            seed_report=None,
            validation_report=None,
            error=None,
        )

    thread = threading.Thread(
        target=_run_reseed,
        args=(
            run_id,
            normalized_profile,
            int(random_seed),
            bool(dry_run),
            bool(strict_mode),
            bool(preserve_home_settings),
        ),
        daemon=True,
    )
    thread.start()
    return True, get_reseed_status()


def _set_run_state(**updates: Any) -> None:
    with _run_state_lock:
        _run_state.update(updates)


def _run_reseed(
    run_id: str,
    profile: str,
    random_seed: int,
    dry_run: bool,
    strict_mode: bool,
    preserve_home_settings: bool,
) -> None:
    global _run_in_progress

    try:
        _set_run_state(phase="reset", message="Resetting business tables...")
        preserved_home_snapshot: dict[str, dict[str, str | None]] = {}

        with transaction.atomic():
            if not dry_run and preserve_home_settings:
                preserved_home_snapshot = _snapshot_home_settings()
            reset_report = _reset_business_tables(dry_run=dry_run)
            _set_run_state(reset_report=reset_report)

            seed_report: dict[str, Any] | None = None
            validation_report: dict[str, Any] | None = None

            if not dry_run:
                _set_run_state(phase="seed", message="Running deterministic seed script...")
                seed_report = _run_seed_script(profile=profile, random_seed=random_seed)

                if preserve_home_settings and preserved_home_snapshot:
                    restored_count = _restore_home_settings(preserved_home_snapshot)
                    seed_report["preserved_home_settings"] = {
                        "restored_count": restored_count,
                        "restored_keys": sorted(list(preserved_home_snapshot.keys())),
                    }

                _set_run_state(seed_report=seed_report)

                _set_run_state(phase="validate", message="Validating seeded data invariants...")
                validation_report = _validate_seeded_data(profile=profile)
                _set_run_state(validation_report=validation_report)

        final_status = "completed"
        final_message = "Reseed completed successfully."

        if dry_run:
            final_message = "Dry run completed. No data was deleted or seeded."
        else:
            violation_count = (validation_report or {}).get("violation_count", 0)
            if strict_mode and violation_count > 0:
                _set_run_state(
                    status="failed",
                    phase="failed",
                    message="Reseed failed strict validation gate.",
                    finished_at=timezone.now().isoformat(),
                    error={
                        "type": "ValidationGateError",
                        "message": "Strict mode enabled and validation violations were detected.",
                        "violation_count": violation_count,
                    },
                )
                return
            if violation_count > 0:
                final_status = "completed_with_warnings"
                final_message = (
                    "Reseed completed with data-quality warnings. "
                    "Check validation_report for details."
                )

        _set_run_state(
            status=final_status,
            phase="done",
            message=final_message,
            finished_at=timezone.now().isoformat(),
        )

    except Exception as exc:  # pragma: no cover - defensive path
        _set_run_state(
            status="failed",
            phase="failed",
            message="Reseed failed. Check error details.",
            finished_at=timezone.now().isoformat(),
            error={
                "type": exc.__class__.__name__,
                "message": str(exc),
                "traceback": traceback.format_exc(),
            },
        )
    finally:
        with _run_lock:
            _run_in_progress = False


def _is_business_model(model: type) -> bool:
    opts = model._meta
    if opts.proxy or not opts.managed:
        return False

    if opts.app_label in _SYSTEM_APP_LABELS:
        return False

    app_config = apps.get_app_config(opts.app_label)
    app_name = app_config.name
    if app_name.startswith(_EXTERNAL_APP_PREFIXES):
        return False

    base_dir = Path(settings.BASE_DIR).resolve()
    app_path = Path(app_config.path).resolve()
    try:
        app_path.relative_to(base_dir)
    except ValueError:
        return False

    return True


def _model_key(model: type) -> str:
    return f"{model._meta.app_label}.{model.__name__}"


def _get_business_models() -> list[type]:
    models = []
    for model in apps.get_models(include_auto_created=False):
        if _is_business_model(model):
            models.append(model)
    return models


def _build_dependency_order(models: list[type]) -> list[type]:
    model_set = set(models)
    dependencies: dict[type, set[type]] = {}

    for model in models:
        deps: set[type] = set()
        for field in model._meta.get_fields():
            if not field.is_relation or field.auto_created:
                continue
            if not (getattr(field, "many_to_one", False) or getattr(field, "one_to_one", False)):
                continue

            related = getattr(field, "related_model", None)
            if related in model_set and related != model:
                deps.add(related)

        dependencies[model] = deps

    ordered: list[type] = []
    remaining = set(models)

    while remaining:
        ready = [model for model in remaining if not (dependencies[model] & remaining)]

        if not ready:
            ready = sorted(remaining, key=_model_key)

        ready = sorted(ready, key=_model_key)
        ordered.extend(ready)
        remaining.difference_update(ready)

    return ordered


def _reset_business_tables(dry_run: bool) -> dict[str, Any]:
    models = _get_business_models()
    deletion_order = list(reversed(_build_dependency_order(models)))

    model_reports: list[dict[str, Any]] = []
    total_before = 0
    total_deleted = 0

    for model in deletion_order:
        count_before = model.objects.count()
        total_before += count_before

        if dry_run or count_before == 0:
            deleted_count = 0
        else:
            model.objects.all().delete()
            deleted_count = count_before
            total_deleted += deleted_count

        model_reports.append(
            {
                "model": _model_key(model),
                "db_table": model._meta.db_table,
                "count_before": count_before,
                "count_deleted": deleted_count,
            }
        )

    return {
        "model_count": len(model_reports),
        "total_records_before": total_before,
        "total_records_deleted": total_deleted,
        "dry_run": dry_run,
        "models": model_reports,
    }


def _snapshot_home_settings() -> dict[str, dict[str, str | None]]:
    rows = SystemsSetting.objects.filter(setting_key__in=HOME_SETTING_KEYS, is_deleted=False)
    snapshot: dict[str, dict[str, str | None]] = {}
    for row in rows:
        snapshot[row.setting_key] = {
            "setting_group": row.setting_group,
            "setting_value": row.setting_value,
            "description": row.description,
        }
    return snapshot


def _restore_home_settings(snapshot: dict[str, dict[str, str | None]]) -> int:
    restored = 0
    for setting_key, payload in snapshot.items():
        SystemsSetting.objects.update_or_create(
            setting_key=setting_key,
            defaults={
                "setting_group": payload.get("setting_group") or "homepage",
                "setting_value": payload.get("setting_value") or "",
                "description": payload.get("description") or setting_key,
                "admin": None,
            },
        )
        restored += 1
    return restored


def _run_seed_script(profile: str, random_seed: int) -> dict[str, Any]:
    os.environ["SEED_PROFILE"] = profile
    os.environ["SEED_RANDOM_SEED"] = str(random_seed)
    random.seed(random_seed)

    try:
        seed_report = run_curated_seed(profile=profile, random_seed=random_seed)
    except SeedError as exc:
        raise ValueError(str(exc)) from exc

    return {
        "strategy": "curated_demo_medium",
        "profile": profile,
        "random_seed": random_seed,
        "executed_at": timezone.now().isoformat(),
        "seed_report": seed_report,
    }


def _validate_seeded_data(profile: str = DEFAULT_PROFILE) -> dict[str, Any]:
    violations: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    _append_if_nonzero(
        violations,
        "enrollment_purchase_missing_payment",
        Enrollment.objects.filter(source=Enrollment.Source.PURCHASE, payment__isnull=True).count(),
        "Purchase enrollments must reference a payment.",
    )
    _append_if_nonzero(
        violations,
        "enrollment_subscription_missing_subscription",
        Enrollment.objects.filter(source=Enrollment.Source.SUBSCRIPTION, subscription__isnull=True).count(),
        "Subscription enrollments must reference a user subscription.",
    )
    _append_if_nonzero(
        violations,
        "enrollment_null_course",
        Enrollment.objects.filter(course__isnull=True).count(),
        "Enrollments should not point to a null course in seeded data.",
    )

    duplicate_enrollments = (
        Enrollment.objects.values("user_id", "course_id")
        .annotate(total=Count("id"))
        .filter(total__gt=1)
        .count()
    )
    _append_if_nonzero(
        violations,
        "enrollment_duplicate_user_course",
        duplicate_enrollments,
        "Each user-course pair should have only one enrollment.",
    )

    _append_if_nonzero(
        violations,
        "quiz_submit_before_start",
        QuizResult.objects.filter(
            start_time__isnull=False,
            submit_time__isnull=False,
            submit_time__lt=F("start_time"),
        ).count(),
        "Quiz submit_time must not be earlier than start_time.",
    )
    _append_if_nonzero(
        violations,
        "quiz_correct_answers_gt_total",
        QuizResult.objects.filter(
            correct_answers__isnull=False,
            total_questions__isnull=False,
            correct_answers__gt=F("total_questions"),
        ).count(),
        "Quiz correct_answers cannot exceed total_questions.",
    )

    _append_if_nonzero(
        violations,
        "progress_completed_below_100",
        LearningProgress.objects.filter(
            status=LearningProgress.StatusChoices.COMPLETED,
            progress_percentage__lt=100,
        ).count(),
        "Completed learning progress should have progress_percentage >= 100.",
    )

    _append_if_nonzero(
        violations,
        "certificate_without_complete_enrollment",
        Certificate.objects.exclude(enrollment__status=Enrollment.Status.Complete).count(),
        "Certificates must belong to completed enrollments.",
    )

    _append_if_nonzero(
        warnings,
        "payment_status_not_terminal_or_pending",
        Payment.objects.exclude(
            payment_status__in=[
                Payment.PaymentStatus.PENDING,
                Payment.PaymentStatus.COMPLETED,
                Payment.PaymentStatus.FAILED,
                Payment.PaymentStatus.CANCELLED,
                Payment.PaymentStatus.REFUNDED,
            ]
        ).count(),
        "Payment status should match known lifecycle values.",
    )

    continuity_violations = _count_non_contiguous_learning_progress()
    _append_if_nonzero(
        warnings,
        "learning_progress_non_contiguous_completion",
        continuity_violations,
        "Completed lessons are expected to be contiguous by lesson order.",
    )

    business_models = _get_business_models()
    total_records = sum(model.objects.count() for model in business_models)
    lower_bound, upper_bound = PROFILE_TARGET_RECORDS.get(profile, PROFILE_TARGET_RECORDS[DEFAULT_PROFILE])
    if total_records < lower_bound or total_records > upper_bound:
        warnings.append(
            {
                "code": "dataset_size_outside_profile_target",
                "count": total_records,
                "message": (
                    f"Current seeded size is outside the target {profile} range "
                    f"({lower_bound}-{upper_bound})."
                ),
            }
        )

    violation_rows = sum(item["count"] for item in violations)
    warning_rows = sum(item["count"] for item in warnings)

    return {
        "checked_at": timezone.now().isoformat(),
        "total_records": total_records,
        "business_model_count": len(business_models),
        "violation_count": len(violations),
        "warning_count": len(warnings),
        "violation_rows": violation_rows,
        "warning_rows": warning_rows,
        "violations": violations,
        "warnings": warnings,
    }


def _append_if_nonzero(target: list[dict[str, Any]], code: str, count: int, message: str) -> None:
    if count <= 0:
        return
    target.append({"code": code, "count": count, "message": message})


def _count_non_contiguous_learning_progress() -> int:
    lesson_positions: dict[int, dict[int, int]] = defaultdict(dict)

    lesson_rows = (
        Lesson.objects.filter(is_deleted=False, coursemodule__course_id__isnull=False)
        .order_by("coursemodule__course_id", "coursemodule__order_number", "order", "id")
        .values("id", "coursemodule__course_id")
    )

    for row in lesson_rows:
        course_id = row["coursemodule__course_id"]
        lesson_id = row["id"]
        lesson_positions[course_id][lesson_id] = len(lesson_positions[course_id])

    completed_rows = (
        LearningProgress.objects.filter(
            is_deleted=False,
            status=LearningProgress.StatusChoices.COMPLETED,
            enrollment_id__isnull=False,
            course_id__isnull=False,
            lesson_id__isnull=False,
        )
        .values("enrollment_id", "course_id", "lesson_id")
    )

    completed_by_enrollment: dict[int, list[int]] = defaultdict(list)
    for row in completed_rows:
        enrollment_id = row["enrollment_id"]
        course_id = row["course_id"]
        lesson_id = row["lesson_id"]

        lesson_pos = lesson_positions.get(course_id, {}).get(lesson_id)
        if lesson_pos is None:
            continue
        completed_by_enrollment[enrollment_id].append(lesson_pos)

    violations = 0
    for positions in completed_by_enrollment.values():
        if not positions:
            continue

        unique_positions = sorted(set(positions))
        max_completed = unique_positions[-1]
        expected = set(range(max_completed + 1))
        if set(unique_positions) != expected:
            violations += 1

    return violations
