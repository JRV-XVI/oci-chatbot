# Selenium E2E Suite (Sprint 2)

This suite contains 4 end-to-end test cases for Delivery 2 quality validation.

# Casos de prueba E2E

## 1. `test_01_create_task_websocket.py`
- Crea una tarea en la pestaña A (Sprint 4, estimada en 4 horas, backlog, prioridad media).  
- Verifica que la tarea aparezca en la pestaña B sin necesidad de refrescar manualmente (sincronización vía WebSocket).  

## 2. `test_02_edit_task_status.py`
- Crea una tarea (Sprint 4, estimada en 4 horas, prioridad alta).  
- Abre el diálogo de detalles de la tarea y la mueve a **done** registrando 4 horas reales.  
- Verifica que la tarea se mueva de backlog a la columna done.  

## 3. `test_03_create_sprint.py`
- Crea el Sprint 5 (`2026-06-13` → `2026-06-20`, objetivo: "Sprint 5 para testear telegram").  
- Verifica que el sprint aparezca en el selector de sprints.  
- Intenta crear un sprint que se superpone con las mismas fechas.  
- Verifica que se muestre un mensaje de error de validación por solapamiento.  

## 4. `test_04_kpis_navigation.py`
- Crea una tarea (Sprint 4, estimada en 4 horas, prioridad media).  
- Mueve la tarea a **done** con horas reales coincidentes.  
- Navega a la página de KPIs y verifica que se actualizaron las gráficas.  
- Regresa exitosamente a la pagina de incio

## Prerequisites

- Python 3.10+
- Microsoft Edge installed
- `msedgedriver.exe` matching your Edge version placed at:
  `tests/edgedriver/edgedriver_win64/msedgedriver.exe`
  Download from: https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/
- Backend and frontend running locally
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:8080`

## Install

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-test.txt
```

## Run All Tests (local, with visible browser)

```bash
pytest tests/selenium/test_01_create_task_websocket.py tests/selenium/test_02_edit_task_status.py tests/selenium/test_03_create_sprint.py tests/selenium/test_04_kpis_navigation.py -v
```

## Run One Case

```bash
pytest tests/selenium/test_01_create_task_websocket.py -v
```

## Useful Env Vars

| Variable | Default | Description |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3000` | Frontend URL |
| `E2E_API_BASE_URL` | derived from `E2E_BASE_URL` host + `:8080` | Backend URL |
| `E2E_BROWSER` | `edge` | Browser to use (only Edge supported) |
| `E2E_HEADLESS` | `false` | Set to `true` to run without opening a window |
| `E2E_TIMEOUT_SECONDS` | `20` | Global wait timeout in seconds |
| `E2E_SELENIUM_REMOTE_URL` | _(none)_ | Set to use a remote Selenium Grid instead of local driver |

## Failure Artifacts

On test failure, screenshots and page HTML are saved to:

   tests/selenium/artifacts/

## Automatic Cleanup of Test Data

Tasks and sprints created during each test are automatically deleted in teardown,
whether the test passes or fails.

- Uses backend REST endpoints (`/api/tasks` and `/api/sprints`).
- If the backend API is unreachable, cleanup is skipped to avoid masking the original test result.

---

## Run with Docker

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

---

## Run with Docker and noVNC (browser visible in real time)

To watch the browser execute the tests live, use the noVNC-enabled setup.

### 1) Start Selenium Edge container with noVNC

```bash
docker run --rm -d --name selenium-edge \
  -p 4444:4444 \
  -p 7900:7900 \
  --shm-size=2g \
  selenium/node-edge:latest
```

Then open **http://localhost:7900** in your browser to watch Edge run live (no password required).

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
  -e E2E_HEADLESS=false \
  -v ${PWD}/tests/selenium/artifacts:/app/tests/selenium/artifacts \
  oci-chatbot-e2e-tests
```

### 4) Stop Selenium container

```bash
docker stop selenium-edge
```

### Alternative: docker compose (recommended)

```bash
docker compose up --build
```

This starts both the Selenium node and the test runner together. The browser is visible at **http://localhost:7900**.