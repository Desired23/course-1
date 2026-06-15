# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Behavioral Guidelines

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
1. [Step] → verify: [check]
2. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Project Overview

A full-stack Udemy-like e-learning platform. Django REST Framework backend + React/TypeScript frontend.

---

## Commands

### Backend (`/course`)

```bash
cd course
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver           # Dev server at http://127.0.0.1:8000
```

Run tests:
```bash
python manage.py test                                       # All tests
python manage.py test apps.courses.tests                    # Single app
python manage.py test apps.courses.tests.TestClassName      # Single class
```

Seed database (resets all project tables, then creates initial accounts admin/instructor/student):
```bash
curl "http://127.0.0.1:8000/api/seed/?key=$SEED_SECRET_KEY"   # default key: demo-seed-2026
```

Production build (used by Render):
```bash
./build.sh   # installs deps, collectstatic, migrate; server started via daphne
```

### Frontend (`/course_fe`)

```bash
cd course_fe
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build to /build
```

---

## Architecture

### Backend

- **Django 5.2 + DRF 3.16** REST API
- **Django Channels 4.2 + Daphne** for WebSocket (ASGI)
- **PostgreSQL** in production, SQLite in development
- **Redis** for channel layers
- **Cloudinary** for media/video storage
- **JWT auth** via `djangorestframework_simplejwt`

**App pattern** — 30+ Django apps under `course/`, each following:
- `models.py` — data schema; soft-delete via `is_deleted`/`deleted_at`; status via `TextChoices`
- `serializers.py` — DRF serializers; computed fields via `SerializerMethodField`
- `views.py` — class-based `APIView` with explicit `get/post/put/delete` + `paginate_queryset()`
- `services.py` — business logic extracted from views (DB queries, validations, status transitions)
- `urls.py` — route definitions, all mounted under `/api/` in `config/urls.py`

**Shared utilities** in `utils/`: `StandardPagination`, permission factory helpers, JWT middleware (also used for WebSocket auth), email helpers, activity logging.

**Payment integrations:** VNPay and MoMo with refund support in `payments/refund_services.py`.

**AI feature:** Google Gemini (`google-genai` SDK) powers the Learning Path Advisor (`learning_paths/`). Mode: `rule_based`, `gemini`, or `auto` (auto falls back to rule-based on Gemini failure).

### Frontend

- **React 18 + TypeScript + Vite**
- **Zustand** for global state (`stores/`)
- **TanStack React Query** for server state/caching (`lib/queryClient.ts`)
- **React Context API** for feature-scoped state (auth, cart, enrollment, notifications, etc.)
- **Radix UI** + **Tailwind CSS** for UI
- **i18next** for EN/VI internationalization (`locales/`)

**Layer structure:**

| Layer | Path | Purpose |
|---|---|---|
| Pages | `src/pages/{public,user,instructor,admin}/` | Route-level components |
| Components | `src/components/` | Reusable UI |
| Services | `src/services/*.api.ts` | HTTP calls to backend |
| Stores | `src/stores/` | Zustand global state |
| Contexts | `src/contexts/` | Feature-scoped React context |
| Hooks | `src/hooks/` | Custom hooks composing the above |
| Routes | `src/routes/` | Route definitions split by role |

**API base URL** is set via `VITE_API_BASE_URL` env var (defaults to `http://localhost:8000/api`).

**JWT tokens** stored in `localStorage`. `src/services/http.ts` implements a refresh-token queue to prevent race conditions when multiple requests trigger simultaneous token refreshes.

**WebSocket** connections via `src/hooks/useWebSocket.ts`; backend validates JWT in Channels middleware at `/realtime` routes.

---

## Environment Variables

Backend (`.env` in `/course`): `DJANGO_SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `REDIS_URL`, `FRONTEND_URL`, `CLOUDINARY_*`, `VNPAY_*`, `MOMO_*`, `GEMINI_API_KEY`, SMTP settings.

Frontend (`.env` in `/course_fe`): `VITE_API_BASE_URL`, `VITE_WS_URL`.

---

## Deployment

Configured via `render.yaml` at the repo root:
- `course-api`: Python 3.13 web service → `daphne -b 0.0.0.0 -p $PORT config.asgi:application`
- `course-fe`: Static site → `npm run build`, served from `/build`
- PostgreSQL add-on with connection pooling; WhiteNoise serves static files
