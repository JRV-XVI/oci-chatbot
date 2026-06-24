# ForgeTask by CloudForge

A group project management and productivity tool with Telegram integration.

## Run with Docker (backend + frontend)

This repo contains 2 services that can be built and run in containers:

- **Backend (Spring Boot):** `forgetask/` (port **8080**)
- **Frontend (Next.js):** `forgetask-frontend/` (port **3000**)

---

## Local development with Docker Compose (recommended)

This is the recommended mode for day-to-day work. It uses bind mounts to reflect code changes in real time without rebuilding images (**hot-reload**).

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose) — version 24+
- Oracle ATP wallet located at `forgetask/wallet/`
- `.env` file in the project root with credentials (see next section)
- **Windows:** Requires [Docker Desktop with WSL2](https://docs.docker.com/desktop/wsl/) enabled.

### Configure credentials

Create a `.env` file in the project root (never commit it to the repo):

```bash
# .env
DB_USER=your_atp_user
DB_PASSWORD=your_atp_password
TELEGRAM_BOT_ENABLED=false
# If enabled, also define these two variables:
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_NAME=
```

You can use `.env.example` as a reference:

```bash
cp .env.example .env
# Edit .env with your real credentials
```

### Start the development environment

```bash
# First time or after changing dependencies (package.json / pom.xml)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up

# Day-to-day
docker compose -f docker-compose.dev.yml up
```

Once running:

| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (Spring Boot) | http://localhost:8080 |

### Hot-reload

- **Frontend:** any change in `forgetask-frontend/` is automatically reflected in the browser.
- **Backend:** any change in `forgetask/src/` is detected by Spring Boot DevTools, which restarts the context automatically.

### View logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Backend only
docker compose -f docker-compose.dev.yml logs -f backend

# Frontend only
docker compose -f docker-compose.dev.yml logs -f frontend
```

### Stop the environment

```bash
# Stop without deleting volumes (recommended for day-to-day)
docker compose -f docker-compose.dev.yml down

# Stop and delete volumes (use this if there are conflicts with node_modules)
docker compose -f docker-compose.dev.yml down -v
```

---

## Run with production images (test before OCI)

Use this mode to verify that the production images work correctly before pushing to Oracle Container Registry (OCIR).

### Prerequisites

- Docker installed and running
- If your user doesn't have Docker permissions, use `sudo` with the commands.

### Build images

From the repo root:

```bash
# Backend
docker build -t forgetask-backend:local ./forgetask

# Frontend
docker build -t forgetask-frontend:local ./forgetask-frontend
```

### Run containers

In one terminal:

```bash
docker run --rm -p 8080:8080 --name forgetask-backend forgetask-backend:local
```

In another terminal:

```bash
docker run --rm -p 3000:3000 --name forgetask-frontend forgetask-frontend:local
```

### Quick tests (smoke tests)

```bash
# Frontend responds with HTML
curl -I http://localhost:3000

# Backend exposes health endpoint
curl -i http://localhost:8080/health
```

### Stop / clean up

- If you ran with `--rm`, stopping with `Ctrl+C` removes the container automatically.
- If you need to force stop:

```bash
docker stop forgetask-backend || true
docker stop forgetask-frontend || true
```

---

## Relevant structure

- `forgetask/`: Spring Boot backend
- `forgetask-frontend/`: Next.js frontend
- `tests/selenium/`: Selenium E2E test suite (Sprint 2 Quality)

---

## E2E tests with Selenium (Sprint 2)

### Included test cases

- `tests/selenium/test_01_create_task.py`: create a task and validate its presence in the backlog.
- `tests/selenium/test_02_edit_task_status.py`: edit a task and validate column movement.
- `tests/selenium/test_03_delete_task.py`: delete a task and validate it disappears from the column.
- `tests/selenium/test_04_create_sprint.py`: create a sprint and validate the date overlap rule.

### Install testing dependencies

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-test.txt
```

### Run the full suite

```bash
pytest
```

### Run a specific test case

```bash
pytest tests/selenium/test_01_create_task.py
```

### Optional environment variables

- `E2E_BASE_URL` (default: `http://localhost:3000`)
- `E2E_API_BASE_URL` (default derived from `E2E_BASE_URL` host + `:8080`)
- `E2E_BROWSER` (default: `edge`)
- `E2E_HEADLESS` (`true` or `false`, default: `false`)
- `E2E_TIMEOUT_SECONDS` (default: `20`)

On failure, evidence is saved to `tests/selenium/artifacts/` (screenshot + HTML).
Tasks and sprints created by the tests are automatically cleaned up at the end of each test case.

### Dedicated Dockerfile for tests only

A `Dockerfile.tests` is included to run the E2E suite without using the backend or frontend Dockerfiles.

1. Start Selenium Edge:

```bash
docker run --rm -d --name selenium-edge -p 4444:4444 --shm-size=2g selenium/standalone-edge:latest
```

2. Build the test image:

```bash
docker build -f Dockerfile.tests -t oci-chatbot-e2e-tests .
```

3. Run tests in a container:

```bash
docker run --rm -e E2E_BASE_URL=http://host.docker.internal:3000 -e E2E_API_BASE_URL=http://host.docker.internal:8080 -e E2E_SELENIUM_REMOTE_URL=http://host.docker.internal:4444/wd/hub -v "${PWD}/tests/selenium/artifacts:/app/tests/selenium/artifacts" oci-chatbot-e2e-tests
```

4. Stop Selenium:

```bash
docker stop selenium-edge
```
