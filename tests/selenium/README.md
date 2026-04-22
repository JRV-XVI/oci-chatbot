# Selenium E2E Suite (Sprint 2)

This suite contains 4 end-to-end test cases for Delivery 2 quality validation.

## Test Cases

1. `test_01_create_task_websocket.py`
   - Creates a task in tab A.
   - Verifies the task appears in tab B without manual refresh (WebSocket sync).

2. `test_02_edit_task_status.py`
   - Creates a task.
   - Edits its status from task details dialog.
   - Verifies the task moves from backlog to in-progress.

3. `test_03_create_sprint.py`
   - Creates a sprint with valid dates.
   - Verifies sprint exists in selector.
   - Verifies overlap validation message appears for conflicting date range.

4. `test_04_kpis_navigation.py`
   - Navigates from Kanban to KPIs.
   - Validates KPI cards are rendered.
   - Returns to Kanban successfully.

## Prerequisites

- Python 3.10+
- Microsoft Edge installed
- Backend and frontend running locally
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:8080`

## Install

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements-test.txt
```

## Run All Tests

```bash
pytest
```

## Run One Case

```bash
pytest tests/selenium/test_01_create_task_websocket.py
```

## Useful Env Vars

- `E2E_BASE_URL` (default: `http://localhost:3000`)
- `E2E_API_BASE_URL` (default derived from `E2E_BASE_URL` host + `:8080`)
- `E2E_BROWSER` (default: `edge`)
- `E2E_HEADLESS` (`true` or `false`, default: `false`)
- `E2E_TIMEOUT_SECONDS` (default: `20`)

## Failure Artifacts

On test failure, screenshots and page HTML are generated in:

- `tests/selenium/artifacts/`

## Automatic cleanup of test data

Tasks and sprints created during each test are automatically deleted in teardown,
whether the test passes or fails.

- The cleanup uses backend REST endpoints (`/api/tasks` and `/api/sprints`).
- If the backend API is unreachable, cleanup is skipped to avoid masking the original test result.

## Run with dedicated Dockerfile

This project includes a dedicated test image in `Dockerfile.tests` (separate from backend/frontend images).

### 1) Start Selenium Edge container

```bash
docker run --rm -d --name selenium-edge -p 4444:4444 --shm-size=2g selenium/standalone-edge:latest
```

### 2) Build test image

```bash
docker build -f Dockerfile.tests -t oci-chatbot-e2e-tests .
```

### 3) Run tests in container

```bash
docker run --rm \
   -e E2E_BASE_URL=http://host.docker.internal:3000 \
   -e E2E_API_BASE_URL=http://host.docker.internal:8080 \
   -e E2E_SELENIUM_REMOTE_URL=http://host.docker.internal:4444/wd/hub \
   -v ${PWD}/tests/selenium/artifacts:/app/tests/selenium/artifacts \
   oci-chatbot-e2e-tests
```

If `E2E_SELENIUM_REMOTE_URL` is unreachable, tests are skipped with a clear message instead of failing with an internal fixture error.

### 4) Stop Selenium container

```bash
docker stop selenium-edge
```
