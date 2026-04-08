# Course Platform

Minimal local setup:

```bash
cd course
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

```bash
cd course_fe
npm install
npm run dev
```

If you use `start-all.ps1`, the machine also needs a working `ngrok` installation and an authenticated ngrok session.

## AI Learning Path

Backend learning-path advisor supports two providers:

- `rule_based`
- `gemini`

Recommended local backend env:

```env
LEARNING_PATH_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_SECONDS=45
LEARNING_PATH_GEMINI_MAX_ATTEMPTS=1
LEARNING_PATH_GEMINI_CIRCUIT_THRESHOLD=2
LEARNING_PATH_GEMINI_CIRCUIT_COOLDOWN_SECONDS=60
```

If `LEARNING_PATH_PROVIDER` is not set, backend falls back to `rule_based`.
If Gemini returns invalid course data, backend validates the payload and falls back to the rule-based provider automatically.

Admin can override Gemini model at runtime (without redeploy) via systems settings:

- `setting_key`: `learning_path_gemini_model`
- `setting_value`: any valid Gemini model name (example: `gemini-2.5-flash`)

## Learning Path API

- `POST /api/learning-paths/advisor/chat`
- `POST /api/learning-paths/`
- `GET /api/learning-paths/`
- `GET /api/learning-paths/{id}`
- `POST /api/learning-paths/{id}/recalculate`

## Catalog Metadata Required For Advisor

Each published public course should have:

- `level`
- `skills_taught[]`
- `prerequisites[]`
- `duration`
- `target_audience`

Advisor quality depends on catalog quality. The admin metadata review screen should be used before turning the feature on broadly.
